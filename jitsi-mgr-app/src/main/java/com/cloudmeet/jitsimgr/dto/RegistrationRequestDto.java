package com.cloudmeet.jitsimgr.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RegistrationRequestDto {
    private Integer id;
    private String username;
    private String displayName;
    private String email;
    private String status;
    private LocalDateTime createdAt;
}
