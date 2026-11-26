package com.cloudmeet.jitsimgr.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.FileSystemResource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {
    @TempDir
    Path directory;
    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() throws Exception {
        provider = createProvider("primary");
    }

    private JwtTokenProvider createProvider(String name) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        Path privateKey = directory.resolve(name + "-private.pem");
        Path publicKey = directory.resolve(name + "-public.pem");
        Files.writeString(privateKey, "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded())
                + "\n-----END PRIVATE KEY-----");
        Files.writeString(publicKey, "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getEncoder().encodeToString(pair.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----");
        return new JwtTokenProvider(new FileSystemResource(privateKey),
                new FileSystemResource(publicKey), "cloudmeet", "cloudmeet-client", 300, 600);
    }

    @Test
    void validatesSignedAccessTokenAndPreservesClaims() {
        Claims claims = provider.validateToken(
                provider.generateAccessToken(42, "alice", "Alice", "USER"));
        assertEquals("42", claims.getSubject());
        assertEquals("alice", claims.get("username", String.class));
        assertEquals("cloudmeet", claims.getIssuer());
        assertTrue(claims.getAudience().contains("cloudmeet-client"));
    }

    @Test
    void rejectsTokenSignedByAnotherKey() throws Exception {
        String token = createProvider("other").generateAccessToken(42, "alice", "Alice", "USER");
        JwtException error = assertThrows(JwtException.class, () -> provider.validateToken(token));
        assertEquals("Invalid signature", error.getMessage());
    }

    @Test
    void rejectsMalformedToken() {
        assertThrows(JwtException.class, () -> provider.validateToken("not-a-jwt"));
    }
}
