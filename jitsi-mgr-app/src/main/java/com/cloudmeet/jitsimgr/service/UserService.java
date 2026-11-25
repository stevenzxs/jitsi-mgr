package com.cloudmeet.jitsimgr.service;

import com.cloudmeet.jitsimgr.dto.SessionDto;
import com.cloudmeet.jitsimgr.dto.UserDto;
import com.cloudmeet.jitsimgr.entity.Session;
import com.cloudmeet.jitsimgr.entity.User;
import com.cloudmeet.jitsimgr.repository.SessionRepository;
import com.cloudmeet.jitsimgr.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    /**
     * 获取用户信息
     */
    @Transactional(readOnly = true)
    public UserDto getUserById(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToDto(user);
    }

    /**
     * 更新用户信息
     */
    @Transactional
    public UserDto updateUser(Integer userId, String displayName, String email,
                              HttpServletRequest request) {
        log.info("Update user request for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 检查邮箱是否已被使用
        if (email != null && !email.equals(user.getEmail())) {
            if (userRepository.existsByEmail(email)) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(email);
        }

        // 更新显示名称
        if (displayName != null && !displayName.isEmpty()) {
            user.setDisplayName(displayName);
        }

        userRepository.save(user);

        // 记录审计日志
        auditLogService.log(user, "USER_UPDATE", "user", userId,
                "User profile updated", request);

        log.info("User updated successfully: {}", user.getUsername());
        return convertToDto(user);
    }

    /**
     * 修改密码
     */
    @Transactional
    public void changePassword(Integer userId, String oldPassword, String newPassword,
                               HttpServletRequest request) {
        log.info("Change password request for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 验证旧密码
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            log.warn("Invalid old password for user: {}", user.getUsername());
            throw new RuntimeException("Invalid old password");
        }

        // 更新密码
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 记录审计日志
        auditLogService.log(user, "PASSWORD_CHANGE", "user", userId,
                "Password changed", request);

        log.info("Password changed successfully for user: {}", user.getUsername());
    }

    /**
     * 获取用户的会话列表
     */
    @Transactional(readOnly = true)
    public List<SessionDto> getUserSessions(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Session> sessions = sessionRepository.findByUser(user);
        
        return sessions.stream()
                .map(this::convertToSessionDto)
                .collect(Collectors.toList());
    }

    /**
     * 删除指定会话
     */
    @Transactional
    public void deleteSession(Integer userId, Integer sessionId, HttpServletRequest request) {
        log.info("Delete session request: user={}, session={}", userId, sessionId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        // 验证会话属于该用户
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("Session does not belong to user");
        }

        sessionRepository.delete(session);

        // 记录审计日志
        auditLogService.log(user, "SESSION_DELETE", "session", sessionId,
                "Session deleted", request);

        log.info("Session deleted: {}", sessionId);
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
     * 转换 Session 为 DTO
     */
    private SessionDto convertToSessionDto(Session session) {
        return SessionDto.builder()
                .id(session.getId())
                .deviceType(session.getDeviceType())
                .ipAddress(session.getIpAddress())
                .userAgent(session.getUserAgent())
                .createdAt(session.getCreatedAt())
                .lastUsedAt(session.getLastUsedAt())
                .expiresAt(session.getExpiresAt())
                .build();
    }
}
