package com.cloudmeet.jitsimgr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectRegistrationRequest {
    
    @NotBlank(message = "Rejection reason is required")
    private String reason;
}
