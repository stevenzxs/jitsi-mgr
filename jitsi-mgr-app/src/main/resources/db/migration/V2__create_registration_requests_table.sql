-- V2: Create registration_requests table
CREATE TABLE registration_requests (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_registration_requests_username ON registration_requests(username);
CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_registration_requests_created_at ON registration_requests(created_at);
