package com.cloudmeet.jitsimgr.service;

import com.cloudmeet.jitsimgr.entity.AuditLog;
import com.cloudmeet.jitsimgr.entity.User;
import com.cloudmeet.jitsimgr.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    /**
     * 记录审计日志
     */
    @Transactional
    public void log(User user, String action, String resourceType, Integer resourceId,
                    String details, HttpServletRequest request) {
        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .ipAddress(getClientIp(request))
                .userAgent(request.getHeader("User-Agent"))
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Audit log created: {} by user {}", action, user.getUsername());
    }

    /**
     * 获取用户的审计日志
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getUserAuditLogs(Integer userId, Pageable pageable) {
        return auditLogRepository.findByUserId(userId, pageable);
    }

    /**
     * 获取所有审计日志
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAllAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
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
