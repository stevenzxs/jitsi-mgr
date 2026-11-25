package com.cloudmeet.jitsimgr.controller;

import com.cloudmeet.jitsimgr.dto.*;
import com.cloudmeet.jitsimgr.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(Authentication authentication) {
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            UserDto user = userService.getUserById(userId);
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (Exception e) {
            log.error("Get current user failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }

    /**
     * 更新当前用户信息
     */
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateCurrentUser(
            @Valid @RequestBody UpdateUserRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            UserDto user = userService.updateUser(
                    userId,
                    request.getDisplayName(),
                    request.getEmail(),
                    httpRequest
            );
            return ResponseEntity.ok(ApiResponse.success(user));
        } catch (Exception e) {
            log.error("Update user failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("UPDATE_FAILED", e.getMessage()));
        }
    }

    /**
     * 修改密码
     */
    @PostMapping("/me/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            userService.changePassword(
                    userId,
                    request.getOldPassword(),
                    request.getNewPassword(),
                    httpRequest
            );
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Change password failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("PASSWORD_CHANGE_FAILED", e.getMessage()));
        }
    }

    /**
     * 获取当前用户的会话列表
     */
    @GetMapping("/me/sessions")
    public ResponseEntity<ApiResponse<List<SessionDto>>> getSessions(
            Authentication authentication
    ) {
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            List<SessionDto> sessions = userService.getUserSessions(userId);
            return ResponseEntity.ok(ApiResponse.success(sessions));
        } catch (Exception e) {
            log.error("Get sessions failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ERROR", e.getMessage()));
        }
    }

    /**
     * 删除指定会话
     */
    @DeleteMapping("/me/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable Integer sessionId,
            Authentication authentication,
            HttpServletRequest httpRequest
    ) {
        try {
            Integer userId = (Integer) authentication.getPrincipal();
            userService.deleteSession(userId, sessionId, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Delete session failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("DELETE_FAILED", e.getMessage()));
        }
    }
}
