package com.cloudmeet.jitsimgr.repository;

import com.cloudmeet.jitsimgr.entity.Session;
import com.cloudmeet.jitsimgr.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    
    Optional<Session> findByRefreshToken(String refreshToken);
    
    List<Session> findByUser(User user);
    
    void deleteByExpiresAtBefore(LocalDateTime dateTime);
    
    void deleteByUser(User user);
}
