package com.cloudmeet.jitsimgr.service;

import com.cloudmeet.jitsimgr.dto.UserDto;
import com.cloudmeet.jitsimgr.entity.AuditLog;
import com.cloudmeet.jitsimgr.entity.RegistrationRequest;
import com.cloudmeet.jitsimgr.entity.User;
import com.cloudmeet.jitsimgr.repository.RegistrationRequestRepository;
import com.cloudmeet.jitsimgr.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final AuditLogService auditLogService;

    /**
     * 获取待审核的注册请求列表
     */
    @Transactional(readOnly = true)
    public List<RegistrationRequestDto> getPendingRegistrationRequests() {
        List<RegistrationRequest> requests = registrationRequestRepository.findByStatus("pending");
        
        return requests.stream()
                .map(this::convertToRegistrationDto)
                .collect(Collectors.toList());
    }

    /**
     * 批准注册请求
     */
    @Transactional
    public UserDto approveRegistration(Integer requestId, Integer adminId,
                                       HttpServletRequest request) {
        log.info("Approve registration request: {}", requestId);

        RegistrationRequest regRequest = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Registration request not found"));

        // 检查状态
        if (!"pending".equals(regRequest.getStatus())) {
            throw new RuntimeException("Registration request is not pending");
        }

        // 检查用户名是否已被使用
        if (userRepository.existsByUsername(regRequest.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // 创建用户
        User user = User.builder()
                .username(regRequest.getUsername())
                .displayName(regRequest.getDisplayName())
                .email(regRequest.getEmail())
                .passwordHash(regRequest.getPasswordHash())
                .role("user")
                .status("active")
                .build();

        userRepository.save(user);

        // 更新注册请求状态
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        
        regRequest.setStatus("approved");
        regRequest.setReviewedBy(admin);
        regRequest.setReviewedAt(LocalDateTime.now());
        registrationRequestRepository.save(regRequest);

        // 记录审计日志
        auditLogService.log(admin, "REGISTRATION_APPROVED", "registration_request", requestId,
                "Approved registration for user: " + user.getUsername(), request);

        log.info("Registration approved: {} -> User ID: {}", requestId, user.getId());
        
        return convertToUserDto(user);
    }

    /**
     * 拒绝注册请求
     */
    @Transactional
    public void rejectRegistration(Integer requestId, Integer adminId, String reason,
                                   HttpServletRequest request) {
        log.info("Reject registration request: {}", requestId);

        RegistrationRequest regRequest = registrationRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Registration request not found"));

        // 检查状态
        if (!"pending".equals(regRequest.getStatus())) {
            throw new RuntimeException("Registration request is not pending");
        }

        // 更新注册请求状态
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        
        regRequest.setStatus("rejected");
        regRequest.setReviewedBy(admin);
        regRequest.setReviewedAt(LocalDateTime.now());
        regRequest.setRejectionReason(reason);
        registrationRequestRepository.save(regRequest);

        // 记录审计日志
        auditLogService.log(admin, "REGISTRATION_REJECTED", "registration_request", requestId,
                "Rejected registration: " + regRequest.getUsername() + " - Reason: " + reason, request);

        log.info("Registration rejected: {}", requestId);
    }

    /**
     * 获取用户列表
     */
    @Transactional(readOnly = true)
    public Page<UserDto> getUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        return users.map(this::convertToUserDto);
    }

    /**
     * 获取用户详情
     */
    @Transactional(readOnly = true)
    public UserDto getUserDetails(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return convertToUserDto(user);
    }

    /**
     * 禁用用户
     */
    @Transactional
    public void disableUser(Integer userId, Integer adminId, HttpServletRequest request) {
        log.info("Disable user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 不能禁用自己
        if (userId.equals(adminId)) {
            throw new RuntimeException("Cannot disable yourself");
        }

        user.setStatus("disabled");
        userRepository.save(user);

        // 记录审计日志
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        
        auditLogService.log(admin, "USER_DISABLED", "user", userId,
                "Disabled user: " + user.getUsername(), request);

        log.info("User disabled: {}", userId);
    }

    /**
     * 启用用户
     */
    @Transactional
    public void enableUser(Integer userId, Integer adminId, HttpServletRequest request) {
        log.info("Enable user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus("active");
        userRepository.save(user);

        // 记录审计日志
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        
        auditLogService.log(admin, "USER_ENABLED", "user", userId,
                "Enabled user: " + user.getUsername(), request);

        log.info("User enabled: {}", userId);
    }

    /**
     * 获取审计日志
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogService.getAllAuditLogs(pageable);
    }

    /**
     * 转换为 UserDto
     */
    private UserDto convertToUserDto(User user) {
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
     * 转换为 RegistrationRequestDto
     */
    private RegistrationRequestDto convertToRegistrationDto(RegistrationRequest request) {
        return RegistrationRequestDto.builder()
                .id(request.getId())
                .username(request.getUsername())
                .displayName(request.getDisplayName())
                .email(request.getEmail())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .build();
    }
}
