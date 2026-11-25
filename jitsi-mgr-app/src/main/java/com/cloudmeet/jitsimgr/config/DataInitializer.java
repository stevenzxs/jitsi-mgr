package com.cloudmeet.jitsimgr.config;

import com.cloudmeet.jitsimgr.entity.User;
import com.cloudmeet.jitsimgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initializeData() {
        return args -> {
            // 检查是否已存在管理员用户
            if (userRepository.existsByUsername("admin")) {
                log.info("Admin user already exists, skipping initialization");
                return;
            }

            // 创建初始管理员用户
            User admin = User.builder()
                    .username("admin")
                    .displayName("系统管理员")
                    .email("admin@cloudmeet.example.com")
                    .passwordHash(passwordEncoder.encode("Admin123!"))
                    .role("admin")
                    .status("active")
                    .build();

            userRepository.save(admin);

            log.info("=".repeat(60));
            log.info("Initial admin user created successfully!");
            log.info("Username: admin");
            log.info("Password: Admin123!");
            log.info("PLEASE CHANGE THE PASSWORD AFTER FIRST LOGIN!");
            log.info("=".repeat(60));
        };
    }
}
