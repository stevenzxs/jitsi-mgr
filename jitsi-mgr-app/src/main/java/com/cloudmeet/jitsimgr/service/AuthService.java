package com.cloudmeet.jitsimgr.service;

import com.cloudmeet.jitsimgr.dto.LoginRequest;
import com.cloudmeet.jitsimgr.dto.LoginResponse;
import com.cloudmeet.jitsimgr.dto.UserDto;
import com.cloudmeet.jitsimgr.entity.Session;
import com.cloudmeet.jitsimgr.entity.User;
import com.cloudmeet.jitsimgr.repository.SessionRepository;
import com.cloudmeet.jitsimgr.repository.UserRepository;
import com.cloudmeet.jitsimgr.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogService auditLogService;

    @Value("${jwt.access-token-expiry}")
    private int accessTokenExpiry;

    @Value("${jwt.refresh-token-expiry}")
    private int refreshTokenExpiry;

    /**
     * 用户登录
     */
    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        log.info("Login attempt for username: {}", request.getUsername());

        // 查找用户
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        // 验证密码
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed login attempt for username: {}", request.getUsername());
            throw new RuntimeException("Invalid credentials");
        }

        // 检查用户状态
        if (!"active".equals(user.getStatus())) {
            log.warn("Login attempt for inactive user: {}", request.getUsername());
            throw new RuntimeException("Account is not active");
        }

        // 生成 Token
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole()
        );
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        // 保存 Session
        Session session = Session.builder()
                .user(user)
                .refreshToken(refreshToken)
                .deviceType(request.getDeviceType())
                .ipAddress(getClientIp(httpRequest))
                .userAgent(httpRequest.getHeader("User-Agent"))
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiry))
                .build();
        sessionRepository.save(session);

        // 记录审计日志
        auditLogService.log(user, "USER_LOGIN", "session", session.getId(), 
                "User logged in", httpRequest);

        log.info("User logged in successfully: {}", user.getUsername());

        // 构建响应
        return LoginResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessTokenExpiry)
                .user(convertToDto(user))
                .build();
    }

    /**
     * 刷新 Token
     */
    @Transactional
    public LoginResponse refreshToken(String refreshToken, HttpServletRequest httpRequest) {
        log.info("Token refresh attempt");

        // 查找 Session
        Session session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        // 检查是否过期
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            sessionRepository.delete(session);
            throw new RuntimeException("Refresh token expired");
        }

        User user = session.getUser();

        // 检查用户状态
        if (!"active".equals(user.getStatus())) {
            throw new RuntimeException("Account is not active");
        }

        // 生成新的 Access Token
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole()
        );

        // 更新 Session 最后使用时间
        session.setLastUsedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 记录审计日志
        auditLogService.log(user, "TOKEN_REFRESH", "session", session.getId(),
                "Token refreshed", httpRequest);

        log.info("Token refreshed for user: {}", user.getUsername());

        // 构建响应（复用原 Refresh Token）
        return LoginResponse.builder()
                .token(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessTokenExpiry)
                .user(convertToDto(user))
                .build();
    }

    /**
     * 用户注册请求
     */
    @Transactional
    public void register(String username, String displayName, String email, String password,
                         HttpServletRequest httpRequest) {
        log.info("Registration request for username: {}", username);

        // 检查用户名是否已存在
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        // 检查邮箱是否已存在
        if (email != null && userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        // 加密密码
        String passwordHash = passwordEncoder.encode(password);

        // 创建注册请求（待管理员审核）
        // TODO: 实现 RegistrationRequest 创建逻辑

        log.info("Registration request created for username: {}", username);
    }

    /**
     * 退出登录
     */
    @Transactional
    public void logout(String refreshToken, HttpServletRequest httpRequest) {
        log.info("Logout attempt");

        sessionRepository.findByRefreshToken(refreshToken).ifPresent(session -> {
            User user = session.getUser();
            
            // 删除 Session
            sessionRepository.delete(session);

            // 记录审计日志
            auditLogService.log(user, "USER_LOGOUT", "session", session.getId(),
                    "User logged out", httpRequest);

            log.info("User logged out: {}", user.getUsername());
        });
    }

    /**
     * 转换为 DTO
     */
    private UserDto convertToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    /**
     * 获取客户端 IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
