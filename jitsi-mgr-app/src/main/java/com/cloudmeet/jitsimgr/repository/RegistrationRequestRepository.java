package com.cloudmeet.jitsimgr.repository;

import com.cloudmeet.jitsimgr.entity.RegistrationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Integer> {
    
    List<RegistrationRequest> findByStatus(String status);
    
    boolean existsByUsername(String username);
}
