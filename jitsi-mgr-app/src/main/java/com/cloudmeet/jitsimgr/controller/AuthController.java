package com.cloudmeet.jitsimgr.controller;

import com.cloudmeet.jitsimgr.dto.ApiResponse;
import com.cloudmeet.jitsimgr.dto.LoginRequest;
import com.cloudmeet.jitsimgr.dto.LoginResponse;
import com.cloudmeet.jitsimgr.security.JwtTokenProvider;
import com.cloudmeet.jitsimgr.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            LoginResponse response = authService.login(request, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Login failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("AUTH_FAILED", e.getMessage()));
        }
    }

    /**
     * 刷新 Token
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest
    ) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken == null || refreshToken.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("INVALID_REQUEST", "Refresh token is required"));
            }

            LoginResponse response = authService.refreshToken(refreshToken, httpRequest);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("REFRESH_FAILED", e.getMessage()));
        }
    }

    /**
     * 获取 JWKS 公钥（用于 Prosody 验证）
     */
    @GetMapping("/jwks")
    public ResponseEntity<Map<String, Object>> getJwks() {
        Map<String, Object> jwks = jwtTokenProvider.getJwks();
        return ResponseEntity.ok(jwks);
    }

    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest
    ) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken != null && !refreshToken.isEmpty()) {
                authService.logout(refreshToken, httpRequest);
            }
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            log.error("Logout failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("LOGOUT_FAILED", e.getMessage()));
        }
    }
}
