# jitsi-mgr - Java Spring Boot 实现

版本：0.1.0  
日期：2026-11-25  
技术栈：Java 17 + Spring Boot 3.2.0 + PostgreSQL/H2

CloudMeet 视频会议用户管理后台服务 - Java 版本实现

---

## 🚀 快速开始

### 1. 初始化项目

**Windows:**
```cmd
init.bat
```

**Linux/Mac:**
```bash
chmod +x init.sh
./init.sh
```

初始化脚本会：
- 创建 `src/main/resources/keys` 目录
- 生成 JWT RSA 密钥对（2048 位）
- 设置正确的文件权限

### 2. 编译项目

```bash
mvn clean install
```

### 3. 运行项目

**开发模式（H2 内存数据库）：**
```bash
mvn spring-boot:run
```

**生产模式（PostgreSQL）：**
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### 4. 访问服务

- **API Base**: `http://localhost:8080/api/mgr/v1`
- **健康检查**: `http://localhost:8080/api/mgr/v1/health`
- **H2 Console**: `http://localhost:8080/api/mgr/v1/h2-console` (仅开发模式)
- **JWKS 端点**: `http://localhost:8080/api/mgr/v1/auth/jwks`

---

## 📊 项目状态

### ✅ 已完成（阶段 1：核心认证 - 80%）

**基础设施：**
- ✅ Maven 项目配置（pom.xml）
- ✅ Spring Boot 配置（application.yml + dev/prod profiles）
- ✅ Flyway 数据库迁移（4 张表）

**数据层：**
- ✅ JPA 实体类（User, RegistrationRequest, Session, AuditLog）
- ✅ Repository 接口（4 个）

**DTO 层：**
- ✅ ApiResponse（统一响应格式）
- ✅ LoginRequest / LoginResponse
- ✅ UserDto

**安全认证：**
- ✅ JwtTokenProvider（RS256 签名与验证）
- ✅ JwtAuthenticationFilter（JWT 认证过滤器）
- ✅ SecurityConfig（Spring Security 配置）
- ✅ CorsConfig（CORS 跨域配置）

**业务逻辑：**
- ✅ AuthService（登录、刷新 Token、注册、登出）
- ✅ AuditLogService（审计日志记录）

**Web 层：**
- ✅ AuthController（认证 API）
- ✅ HealthController（健康检查）
- ✅ GlobalExceptionHandler（全局异常处理）

---

## 🎯 核心功能

### 认证功能
- ✅ 用户登录（密码验证）
- ✅ JWT Token 签发（RS256）
- ✅ Token 刷新机制
- ✅ 用户登出（销毁 Session）
- ✅ JWKS 端点（Prosody 集成）

### 安全特性
- ✅ BCrypt 密码加密（cost factor 12）
- ✅ JWT RS256 签名
- ✅ Token 过期时间控制
- ✅ Session 管理
- ✅ 审计日志追踪
- ✅ CORS 跨域支持

---

## 📁 项目结构

```
jitsi-mgr-java/
├── src/main/java/com/cloudmeet/jitsimgr/
│   ├── JitsiMgrApplication.java          # 主应用
│   ├── config/                           # 配置类
│   │   ├── SecurityConfig.java          # Spring Security
│   │   └── CorsConfig.java              # CORS 配置
│   ├── controller/                       # REST 控制器
│   │   ├── AuthController.java          # 认证 API
│   │   └── HealthController.java        # 健康检查
│   ├── service/                          # 业务逻辑
│   │   ├── AuthService.java             # 认证服务
│   │   └── AuditLogService.java         # 审计日志
│   ├── repository/                       # 数据访问
│   │   ├── UserRepository.java
│   │   ├── RegistrationRequestRepository.java
│   │   ├── SessionRepository.java
│   │   └── AuditLogRepository.java
│   ├── entity/                           # JPA 实体
│   │   ├── User.java
│   │   ├── RegistrationRequest.java
│   │   ├── Session.java
│   │   └── AuditLog.java
│   ├── dto/                              # 数据传输对象
│   │   ├── ApiResponse.java
│   │   ├── LoginRequest.java
│   │   ├── LoginResponse.java
│   │   └── UserDto.java
│   ├── security/                         # 安全组件
│   │   ├── JwtTokenProvider.java        # JWT 处理
│   │   └── JwtAuthenticationFilter.java # JWT 过滤器
│   └── exception/                        # 异常处理
│       └── GlobalExceptionHandler.java
│
├── src/main/resources/
│   ├── application.yml                   # 主配置
│   ├── application-dev.yml              # 开发配置
│   ├── application-prod.yml             # 生产配置
│   ├── db/migration/                     # Flyway 迁移脚本
│   │   ├── V1__create_users_table.sql
│   │   ├── V2__create_registration_requests_table.sql
│   │   ├── V3__create_sessions_table.sql
│   │   └── V4__create_audit_logs_table.sql
│   └── keys/                             # JWT 密钥（需生成）
│       ├── jwt-private.pem
│       └── jwt-public.pem
│
├── pom.xml                               # Maven 配置
├── init.sh                               # Linux/Mac 初始化脚本
├── init.bat                              # Windows 初始化脚本
└── README.md
```

---

## 🔌 API 端点

### 认证 API

**用户登录:**
```bash
POST /api/mgr/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!",
  "deviceType": "web"
}
```

**刷新 Token:**
```bash
POST /api/mgr/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**获取 JWKS 公钥:**
```bash
GET /api/mgr/v1/auth/jwks
```

**用户登出:**
```bash
POST /api/mgr/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### 健康检查

```bash
GET /api/mgr/v1/health
```

---

## ⏭️ 下一步（阶段 2：管理功能）

### 待实现功能：

1. **用户管理 Service & Controller**
   - 获取用户信息
   - 更新用户信息
   - 修改密码
   - 用户列表
   - 禁用/启用用户

2. **管理员功能 Service & Controller**
   - 注册请求列表
   - 批准/拒绝注册
   - 用户管理（管理员视角）
   - 审计日志查询

3. **测试**
   - 单元测试
   - 集成测试
   - API 测试

---

## 🛠️ 技术栈

- **Java**: 17 (LTS)
- **Spring Boot**: 3.2.0
- **Spring Security**: JWT 认证
- **Spring Data JPA**: ORM
- **Flyway**: 数据库迁移
- **H2**: 开发环境数据库
- **PostgreSQL**: 生产环境数据库
- **JJWT**: JWT 处理（RS256）
- **Lombok**: 减少样板代码
- **Maven**: 构建工具

---

## 📚 参考文档

- **原架构设计**: `../docs/DESIGN.md`
- **API 规范**: `../docs/API-GUIDE.md`
- **Prosody 集成**: `../docs/PROSODY-INTEGRATION.md`
- **Electron 集成**: `../docs/ELECTRON-INTEGRATION.md`
- **Android 集成**: `../docs/ANDROID-INTEGRATION.md`

---

## 📝 许可证

MIT License
