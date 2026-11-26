package com.cloudmeet.jitsimgr.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class JwtTokenProvider {

    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final String issuer;
    private final String audience;
    private final int accessTokenExpiry;
    private final int refreshTokenExpiry;

    public JwtTokenProvider(
            @Value("${jwt.secret.private-key}") Resource privateKeyResource,
            @Value("${jwt.secret.public-key}") Resource publicKeyResource,
            @Value("${jwt.issuer}") String issuer,
            @Value("${jwt.audience}") String audience,
            @Value("${jwt.access-token-expiry}") int accessTokenExpiry,
            @Value("${jwt.refresh-token-expiry}") int refreshTokenExpiry
    ) throws Exception {
        this.privateKey = loadPrivateKey(privateKeyResource);
        this.publicKey = loadPublicKey(publicKeyResource);
        this.issuer = issuer;
        this.audience = audience;
        this.accessTokenExpiry = accessTokenExpiry;
        this.refreshTokenExpiry = refreshTokenExpiry;
        
        log.info("JWT Token Provider initialized with RS256");
    }

    /**
     * 生成访问 Token
     */
    public String generateAccessToken(Integer userId, String username, String displayName, String role) {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(accessTokenExpiry);

        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId.toString());
        claims.put("username", username);
        claims.put("displayName", displayName);
        claims.put("role", role);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuer(issuer)
                .setAudience(audience)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiration))
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }

    /**
     * 生成刷新 Token
     */
    public String generateRefreshToken() {
        Instant now = Instant.now();
        Instant expiration = now.plusSeconds(refreshTokenExpiry);

        return Jwts.builder()
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiration))
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }

    /**
     * 验证 Token
     */
    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(issuer)
                    .requireAudience(audience)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("Token expired: {}", e.getMessage());
            throw new JwtException("Token expired");
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT: {}", e.getMessage());
            throw new JwtException("Unsupported token");
        } catch (MalformedJwtException e) {
            log.error("Malformed JWT: {}", e.getMessage());
            throw new JwtException("Invalid token");
        } catch (SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
            throw new JwtException("Invalid signature");
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
            throw new JwtException("Empty token");
        }
    }

    /**
     * 从 Token 中提取用户 ID
     */
    public Integer getUserIdFromToken(String token) {
        Claims claims = validateToken(token);
        return Integer.parseInt(claims.getSubject());
    }

    /**
     * 从 Token 中提取用户名
     */
    public String getUsernameFromToken(String token) {
        Claims claims = validateToken(token);
        return claims.get("username", String.class);
    }

    /**
     * 获取 JWKS 格式的公钥
     */
    public Map<String, Object> getJwks() {
        Map<String, Object> jwks = new HashMap<>();
        Map<String, Object> key = new HashMap<>();

        // 获取 RSA 公钥参数
        if (publicKey instanceof java.security.interfaces.RSAPublicKey) {
            java.security.interfaces.RSAPublicKey rsaPublicKey = 
                (java.security.interfaces.RSAPublicKey) publicKey;

            // 模数（n）
            byte[] modulusBytes = rsaPublicKey.getModulus().toByteArray();
            String n = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(modulusBytes);

            // 指数（e）
            byte[] exponentBytes = rsaPublicKey.getPublicExponent().toByteArray();
            String e = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(exponentBytes);

            key.put("kty", "RSA");
            key.put("use", "sig");
            key.put("kid", "2026-11");
            key.put("alg", "RS256");
            key.put("n", n);
            key.put("e", e);
        }

        jwks.put("keys", new Object[]{key});
        return jwks;
    }

    /**
     * 加载私钥
     */
    private PrivateKey loadPrivateKey(Resource resource) throws Exception {
        try {
            String key = new String(Files.readAllBytes(resource.getFile().toPath()));
            key = key.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] keyBytes = Base64.getDecoder().decode(key);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        } catch (IOException e) {
            log.error("Failed to load private key: {}", e.getMessage());
            throw new Exception("Could not load private key", e);
        }
    }

    /**
     * 加载公钥
     */
    private PublicKey loadPublicKey(Resource resource) throws Exception {
        try {
            String key = new String(Files.readAllBytes(resource.getFile().toPath()));
            key = key.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] keyBytes = Base64.getDecoder().decode(key);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePublic(spec);
        } catch (IOException e) {
            log.error("Failed to load public key: {}", e.getMessage());
            throw new Exception("Could not load public key", e);
        }
    }
}
