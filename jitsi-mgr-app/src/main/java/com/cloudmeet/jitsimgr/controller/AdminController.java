package com.cloudmeet.jitsimgr.controller;

import com.cloudmeet.jitsimgr.dto.*;
import com.cloudmeet.jitsimgr.entity.AuditLog;
import com.cloudmeet.jitsimgr.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPERADMIN')")
public class AdminController {

    private final AdminService adminService;

    /**
     * 获取待审核的注册请求列表
     */
    @GetMapping("/registration-requests")
    public ResponseEntity<ApiResponse<List<RegistrationRequestDto>>> getRegistrationRequests() {
        try {
            List<RegistrationRequestDto> requests = adminService.getPendingRegistrationRequests();
            return ResponseEntity.ok(ApiResponse.success(requests));
        } catch (Exception e) {
            log.error("Get registration requests failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }

    /**
     * 批准注册请求
     */
    @PostMapping("/registration-requests/{id}/approve")
    public ResponseEntity<ApiResponse<UserDto>> approveRegistration(
            @PathVariable Integer id,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer adminId = (Integer) authentication.getPrincipal();
            UserDto user = adminService.approveRegistration(id, adminId, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (Exception e) {
            log.error("Approve registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("APPROVAL_FAILED", e.getMessage()));
        }
    }

    /**
     * 拒绝注册请求
     */
    @PostMapping("/registration-requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectRegistration(
            @PathVariable Integer id,
            @Valid @RequestBody RejectRegistrationRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer adminId = (Integer) authentication.getPrincipal();
            adminService.rejectRegistration(id, adminId, request.getReason(), httpRequest);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Reject registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("REJECTION_FAILED", e.getMessage()));
        }
    }

    /**
     * 获取用户列表（分页）
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserDto>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sort,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        try {
            Sort.Direction sortDirection = Sort.Direction.fromString(direction);
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));
            
            Page<UserDto> users = adminService.getUsers(pageable);
            return ResponseEntity.ok(ApiResponse.success(users));
        } catch (Exception e) {
            log.error("Get users failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }

    /**
     * 获取用户详情
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserDetails(@PathVariable Integer id) {
        try {
            UserDto user = adminService.getUserDetails(id);
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (Exception e) {
            log.error("Get user details failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }

    /**
     * 禁用用户
     */
    @PutMapping("/users/{id}/disable")
    public ResponseEntity<ApiResponse<Void>> disableUser(
            @PathVariable Integer id,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer adminId = (Integer) authentication.getPrincipal();
            adminService.disableUser(id, adminId, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Disable user failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("DISABLE_FAILED", e.getMessage()));
        }
    }

    /**
     * 启用用户
     */
    @PutMapping("/users/{id}/enable")
    public ResponseEntity<ApiResponse<Void>> enableUser(
            @PathVariable Integer id,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer adminId = (Integer) authentication.getPrincipal();
            adminService.enableUser(id, adminId, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Enable user failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ENABLE_FAILED", e.getMessage()));
        }
    }

    /**
     * 获取审计日志（分页）
     */
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<AuditLog> logs = adminService.getAuditLogs(pageable);
            return ResponseEntity.ok(ApiResponse.success(logs));
        } catch (Exception e) {
            log.error("Get audit logs failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }
}
