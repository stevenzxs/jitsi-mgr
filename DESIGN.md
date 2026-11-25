# CloudMeet 视频会议管理后台服务 - 完整设计文档

版本：1.0.0  
日期：2026-11-25  
状态：设计阶段

---

## 目录

1. [项目概述](#1-项目概述)
2. [CloudMeet 整体架构](#2-cloudmeet-整体架构)
3. [jitsi-mgr 详细设计](#3-jitsi-mgr-详细设计)
4. [数据模型设计](#4-数据模型设计)
5. [API 设计](#5-api-设计)
6. [认证与授权](#6-认证与授权)
7. [安全设计](#7-安全设计)
8. [部署设计](#8-部署设计)
9. [客户端集成](#9-客户端集成)
10. [监控与运维](#10-监控与运维)
11. [测试策略](#11-测试策略)
12. [交付清单](#12-交付清单)

---

## 1. 项目概述

### 1.1 项目定位

CloudMeet 视频会议管理后台服务（jitsi-mgr），为 Electron 桌面端和 Android 移动端提供统一的用户认证和权限管理。

### 1.2 核心功能

- **用户注册**：用户提交注册申请
- **后台审核**：管理员审核注册申请（通过/拒绝）
- **用户登录**：通过审核的用户可登录
- **客户端认证**：Electron 和 Android 端必须登录后才能进入会议
- **JWT 签发**：为 Prosody 提供 JWT 验证支持

### 1.3 技术目标

- 轻量级、易部署
- 与现有 CloudMeet 7服务栈集成
- 支持 JWT 认证
- RESTful API 设计
- 数据持久化
- 高可用、可扩展

---

## 2. CloudMeet 整体架构

### 2.1 服务组成（8个服务 + H5）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户访问层                                          │
├──────────────────┬────────────────┬───────────────────┬─────────────────────┤
│  Electron 客户端  │ Android 客户端  │   H5 (微信浏览器)  │  Web 浏览器访问     │
│  (桌面端)        │  (移动端)       │   (访客无需安装)   │  (直接访问)        │
└────────┬─────────┴────────┬───────┴─────────┬─────────┴──────────┬──────────┘
         │                  │                 │                    │
         │  HTTPS + JWT     │  HTTPS + JWT    │  HTTPS (匿名)      │  HTTPS
         │  (需要登录认证)   │  (需要登录认证)  │  (访客模式)        │
         │                  │                 │                    │
         └──────────────────┴─────────────────┴────────────────────┘
                                      │
                                      ▼
         ┌────────────────────────────────────────────────────────┐
         │              Caddy Gateway (HTTPS 反向代理)             │
         │  - TLS 终止 (private-ca / caddy-public-acme)          │
         │  - 路由分发                                            │
         └──────┬───────────────┬──────────────┬──────────────────┘
                │               │              │
      ┌─────────┴─────┐  ┌─────┴──────┐  ┌───┴──────────┐
      │ /api/mgr/*    │  │ /cm/*      │  │ /cm/h5/*     │
      │ jitsi-mgr     │  │ app-web    │  │ H5 静态文件   │
      └─────────┬─────┘  └─────┬──────┘  └──────────────┘
                │               │
                ▼               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        CloudMeet 服务层（8+1服务）                          │
├─────────────────┬─────────────────┬──────────────┬────────────────────────┤
│                 │                 │              │                        │
│  ① jitsi-mgr    │  ② gateway      │  ③ app-web   │  ④ api                 │
│  (用户管理)      │  (反向代理)      │  (控制面板)   │  (业务逻辑)             │
│                 │                 │              │                        │
│  ⑤ web          │  ⑥ prosody      │  ⑦ jicofo    │  ⑧ jvb                 │
│  (Jitsi UI)     │  (XMPP 信令)    │  (会议控制)   │  (视频桥)               │
│                 │                 │              │                        │
│  ⑨ H5 静态页面  │  ⑩ PostgreSQL   │              │                        │
│  (微信访客)      │  (数据库)        │              │                        │
└─────────────────┴─────────────────┴──────────────┴────────────────────────┘
```

### 2.2 服务职责

| 服务 | 职责 | 端口 | 技术栈 |
|------|------|------|--------|
| **① jitsi-mgr** | 用户管理、认证授权、JWT签发 | 3000 | Node.js + Express + PostgreSQL |
| **② gateway** | 反向代理、TLS终止、路由分发 | 8443 | Caddy |
| **③ app-web** | 会议管理控制面板 | 3001 | Web UI |
| **④ api** | 会议 CRUD、业务逻辑 | 3002 | REST API |
| **⑤ web** | Jitsi 会议界面、WebRTC | 80 | Jitsi Meet |
| **⑥ prosody** | XMPP 信令、JWT 验证 | 5222/5280 | Prosody XMPP |
| **⑦ jicofo** | 会议调度、资源分配 | 8888 | Java |
| **⑧ jvb** | SFU 媒体转发 | 10000(UDP) | Java |
| **⑨ H5** | 微信访客无需安装入口 | - | 静态文件 |
| **⑩ PostgreSQL** | 用户/审核/审计数据 | 5432 | PostgreSQL |

### 2.3 路由规则

```
/api/mgr/*        → jitsi-mgr:3000     (用户管理 API)
/cm/h5/*          → 静态文件托管         (H5 访客页面)
/cm/desktop       → app-web:3001        (Electron 入口)
/cm/invite        → app-web:3001        (移动端入口)
/mapi/*           → api:3002            (业务 API)
/xmpp-websocket   → prosody:5280        (XMPP WebSocket)
/http-bind        → prosody:5280        (BOSH)
/*                → web:80              (Jitsi 会议界面)
```

### 2.4 关键集成点

**① jitsi-mgr ↔ Prosody（JWT 验证）**
```
1. jitsi-mgr 签发 JWT (RS256 私钥)
2. 客户端携带 JWT 连接 Prosody
3. Prosody 从 jitsi-mgr 获取公钥 (GET /api/mgr/auth/jwks)
4. Prosody 验证 Token 签名、过期时间、issuer/audience
5. 验证通过 → 允许加入会议
```

**② gateway ↔ 所有服务（路由分发）**
- Caddy 统一 HTTPS 入口
- 按路径前缀分发到不同服务
- 支持双 TLS 模式（private-ca / caddy-public-acme）

**③ 客户端 ↔ jitsi-mgr（认证）**
- Electron/Android：必须登录获取 JWT
- H5 访客：匿名访问，无需登录
- Web 浏览器：直接访问

---

## 3. jitsi-mgr 详细设计

### 3.1 技术栈（推荐）

- **运行时**：Node.js 22+
- **Web 框架**：Express
- **数据库**：PostgreSQL（生产）/ SQLite（开发）
- **认证**：JWT (RS256)
- **密码加密**：bcrypt (cost factor = 12)
- **配置管理**：dotenv / config

### 3.2 目录结构

```
jitsi-mgr/
├── src/
│   ├── controllers/        # 控制器（处理请求）
│   │   ├── auth.js
│   │   ├── user.js
│   │   └── admin.js
│   ├── services/           # 业务逻辑
│   │   ├── authService.js
│   │   ├── userService.js
│   │   └── auditService.js
│   ├── models/             # 数据模型
│   │   ├── User.js
│   │   ├── RegistrationRequest.js
│   │   └── Session.js
│   ├── middleware/         # 中间件
│   │   ├── auth.js
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── routes/             # 路由
│   │   ├── auth.js
│   │   ├── user.js
│   │   └── admin.js
│   ├── config/             # 配置
│   │   └── database.js
│   └── app.js              # 应用入口
├── migrations/             # 数据库迁移
├── tests/                  # 测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                # 脚本
│   ├── init.sh
│   └── create-admin.js
├── docs/                   # 文档
│   ├── diagrams.md
│   └── API.md
├── config/
│   ├── default.json
│   └── production.json
├── .env.example
├── package.json
└── README.md
```

---

## 4. 数据模型设计

### 4.1 数据库选择

**开发/测试环境**：SQLite
- 零配置、文件数据库
- 适合单机部署

**生产环境**：PostgreSQL（推荐）
- 高并发、事务支持
- JSON 支持强大（审计日志）
- 与 Jitsi 生态一致

### 4.2 表结构

#### users 表（用户表）

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  display_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/approved/rejected/disabled
  role VARCHAR(20) NOT NULL DEFAULT 'user',      -- user/admin/superadmin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email ON users(email);
```

#### registration_requests 表（注册申请表）

```sql
CREATE TABLE registration_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  additional_info TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_id INTEGER REFERENCES users(id),
  review_comment TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registration_status ON registration_requests(status);
CREATE INDEX idx_registration_user ON registration_requests(user_id);
```

#### sessions 表（会话表）

```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  device_type VARCHAR(20),  -- electron/android
  device_info TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

#### audit_logs 表（审计日志）

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  details JSONB,              -- PostgreSQL JSONB 高性能
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_details ON audit_logs USING GIN (details);  -- JSON 索引
```

---

## 5. API 设计

### 5.1 通用规范

**Base URL**: `https://<server>:port/api/mgr/v1`

**响应格式**:
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2026-11-25T10:00:00Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "用户名或密码错误",
    "details": {}
  },
  "timestamp": "2026-11-25T10:00:00Z"
}
```

### 5.2 认证端点（公开）

#### POST /auth/register
用户注册

**请求**:
```json
{
  "username": "zhangsan",
  "password": "SecurePass123!",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "displayName": "张三",
  "reason": "需要参加公司视频会议"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "status": "pending",
    "message": "注册申请已提交，请等待管理员审核"
  }
}
```

#### POST /auth/login
用户登录

**请求**:
```json
{
  "username": "zhangsan",
  "password": "SecurePass123!",
  "deviceType": "electron"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresIn": 7200,
    "user": {
      "id": 123,
      "username": "zhangsan",
      "displayName": "张三",
      "role": "user"
    }
  }
}
```

#### POST /auth/refresh
刷新 Token

**请求**:
```json
{
  "refreshToken": "..."
}
```

#### GET /auth/jwks
获取 JWT 公钥（供 Prosody 验证）

**响应**:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "2026-11",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

#### GET /auth/status
服务健康检查

### 5.3 用户端点（需要认证）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /users/me | 获取当前用户信息 |
| PUT | /users/me | 更新用户信息 |
| POST | /users/me/change-password | 修改密码 |
| GET | /users/me/sessions | 查看登录会话 |
| DELETE | /users/me/sessions/:id | 注销指定会话 |

### 5.4 管理员端点（需要 admin 角色）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /admin/registrations | 获取注册申请列表 |
| GET | /admin/registrations/:id | 获取注册申请详情 |
| POST | /admin/registrations/:id/approve | 批准注册 |
| POST | /admin/registrations/:id/reject | 拒绝注册 |
| GET | /admin/users | 获取用户列表 |
| GET | /admin/users/:id | 获取用户详情 |
| PUT | /admin/users/:id | 更新用户信息 |
| POST | /admin/users/:id/disable | 禁用用户 |
| POST | /admin/users/:id/enable | 启用用户 |
| DELETE | /admin/users/:id | 删除用户（软删除）|
| GET | /admin/audit-logs | 获取审计日志 |

---

## 6. 认证与授权

### 6.1 JWT Token 设计

**Access Token**（短期，2小时）:
```json
{
  "sub": "123",
  "username": "zhangsan",
  "displayName": "张三",
  "role": "user",
  "iat": 1700000000,
  "exp": 1700007200,
  "iss": "cloudmeet-mgr",
  "aud": "cloudmeet-client"
}
```

**Refresh Token**（长期，7天）:
```json
{
  "sub": "123",
  "type": "refresh",
  "iat": 1700000000,
  "exp": 1700604800,
  "iss": "cloudmeet-mgr"
}
```

### 6.2 密钥管理

- **RSA 密钥对**：RS256 算法
  - 私钥：签发 Token（仅后端持有）
  - 公钥：验证 Token（Prosody 获取）

```bash
# 生成密钥对
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
```

- **密钥轮换**：定期更新（如每季度）
  - 保留旧公钥一段时间（grace period）
  - 新 Token 使用新私钥签发

### 6.3 密码安全

- **哈希算法**：bcrypt（cost factor = 12）
- **密码复杂度要求**：
  - 最小长度：8 字符
  - 必须包含：大写、小写、数字
  - 可选：特殊字符

### 6.4 权限分层

| 角色 | 权限 |
|------|------|
| **guest** | 加入公开会议（H5访客） |
| **user** | 登录会议、创建会议 |
| **admin** | 审核注册、管理用户、查看审计日志 |
| **superadmin** | 管理其他管理员、系统配置 |

---

## 7. 安全设计

### 7.1 认证安全

- **防暴力破解**：登录失败 5 次锁定 15 分钟
- **Token 安全**：
  - 仅 HTTPS 传输
  - HttpOnly Cookie（可选）
  - 短期 Access Token + 长期 Refresh Token
  - Token 黑名单（注销时）

### 7.2 网络安全

- **HTTPS 强制**：禁止 HTTP 访问
- **CORS 配置**：限制允许的 Origin
- **Rate Limiting**：
  - 注册：10 次/小时/IP
  - 登录：20 次/小时/IP
  - API：1000 次/小时/用户

### 7.3 数据安全

- **敏感数据加密**：密码哈希、Token 加密传输
- **SQL 注入防护**：参数化查询
- **XSS 防护**：输入验证、输出转义
- **CSRF 防护**：Token 验证
- **审计日志**：记录所有关键操作

---

## 8. 部署设计

### 8.1 Docker Compose 部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  jitsi-mgr:
    image: cloudmeet/jitsi-mgr:latest
    container_name: jitsi-mgr
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres/jitsi_mgr
      - JWT_PRIVATE_KEY_PATH=/secrets/jwt-private.pem
      - JWT_PUBLIC_KEY_PATH=/secrets/jwt-public.pem
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./secrets:/secrets:ro
      - ./data:/app/data
    networks:
      - cloudmeet-network
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    container_name: jitsi-mgr-db
    environment:
      - POSTGRES_DB=jitsi_mgr
      - POSTGRES_USER=jitsi_mgr
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - cloudmeet-network
    restart: unless-stopped

networks:
  cloudmeet-network:
    external: true

volumes:
  postgres-data:
```

### 8.2 配置管理

**配置文件** (`config/default.json`):
```json
{
  "server": {
    "port": 3000,
    "host": "127.0.0.1",
    "trustProxy": true
  },
  "database": {
    "type": "sqlite",
    "path": "./data/jitsi-mgr.db"
  },
  "jwt": {
    "algorithm": "RS256",
    "accessTokenExpiry": "2h",
    "refreshTokenExpiry": "7d",
    "issuer": "cloudmeet-mgr",
    "audience": "cloudmeet-client"
  },
  "security": {
    "bcryptRounds": 12,
    "maxLoginAttempts": 5,
    "lockoutDuration": 900,
    "passwordMinLength": 8
  },
  "rateLimit": {
    "register": { "max": 10, "windowMs": 3600000 },
    "login": { "max": 20, "windowMs": 3600000 },
    "api": { "max": 1000, "windowMs": 3600000 }
  }
}
```

### 8.3 初始化

**初始化脚本** (`scripts/init.sh`):
```bash
#!/bin/bash
# 生成 JWT 密钥对
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem

# 初始化数据库
npm run db:migrate

# 创建管理员
npm run admin:create -- \
  --username admin \
  --password "$ADMIN_PASSWORD" \
  --email "$ADMIN_EMAIL"
```

---

## 9. 客户端集成

### 9.1 Electron 集成

```javascript
// 1. 用户输入用户名密码
const response = await fetch('https://cloudmeet.example.com/api/mgr/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username,
    password,
    deviceType: 'electron'
  })
});

const { token, user } = await response.json();

// 2. 存储 Token（使用 electron-store）
store.set('authToken', token);
store.set('currentUser', user);

// 3. 进入会议时携带 Token
const jitsiConfig = {
  jwt: token,
  roomName: '123456789',
  // ... 其他配置
};
```

### 9.2 Android 集成

```kotlin
// 1. 用户登录
val response = api.login(LoginRequest(
    username = username,
    password = password,
    deviceType = "android"
))

// 2. 存储 Token（使用 SharedPreferences 或 DataStore）
authManager.saveToken(response.token)
authManager.saveUser(response.user)

// 3. 进入会议时携带 Token
val jitsiOptions = JitsiMeetConferenceOptions.Builder()
    .setToken(authManager.getToken())
    .setRoom("123456789")
    .build()
```

### 9.3 Prosody JWT 验证配置

```lua
-- prosody.cfg.lua
authentication = "token"
token_verification = "asap"
asap_accepted_issuers = { "cloudmeet-mgr" }
asap_accepted_audiences = { "cloudmeet-client" }

-- JWT 公钥 URL（Prosody 获取公钥）
asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
```

---

## 10. 监控与运维

### 10.1 健康检查

**GET /health**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-25T10:00:00Z",
  "uptime": 86400,
  "checks": {
    "database": "connected",
    "jwt": "valid"
  }
}
```

### 10.2 日志记录

**日志级别**：ERROR / WARN / INFO / DEBUG / TRACE

**日志格式** (JSON):
```json
{
  "level": "info",
  "timestamp": "2026-11-25T10:00:00Z",
  "requestId": "req-123",
  "userId": 123,
  "action": "login",
  "message": "User logged in successfully",
  "metadata": {
    "ip": "192.168.1.100",
    "userAgent": "CloudMeet-Electron/1.0.21"
  }
}
```

### 10.3 性能监控

**关键指标**：
- 请求延迟（P50、P95、P99）
- 请求成功率
- 数据库连接池使用率
- Token 签发/验证速度
- 内存/CPU 使用率

**告警规则**：
- 请求失败率 > 5%
- P99 延迟 > 2 秒
- 数据库连接池满
- 磁盘空间 < 10%

---

## 11. 测试策略

### 11.1 单元测试

```javascript
// tests/unit/auth.test.js
describe('Auth Service', () => {
  test('should hash password correctly', async () => {
    const hash = await authService.hashPassword('password123');
    expect(await bcrypt.compare('password123', hash)).toBe(true);
  });
  
  test('should generate valid JWT token', async () => {
    const token = await authService.generateToken({ userId: 1 });
    const decoded = jwt.verify(token, publicKey);
    expect(decoded.sub).toBe('1');
  });
});
```

### 11.2 集成测试

```javascript
// tests/integration/api.test.js
describe('API Integration', () => {
  test('should register and login user', async () => {
    // 1. 注册
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'test', password: 'Test123!' });
    expect(registerRes.status).toBe(201);
    
    // 2. 管理员批准
    await db.users.update({ status: 'approved' }, { where: { id: registerRes.body.userId } });
    
    // 3. 登录
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'Test123!' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });
});
```

---

## 12. 交付清单

### 12.1 代码仓库

- [x] 源码仓库：`https://github.com/stevenzxs/jitsi-mgr`
- [x] 完整设计文档：`DESIGN.md`（本文档）
- [x] 架构图集：`docs/diagrams.md`（12张图）
- [ ] API 文档：`docs/API.md`
- [ ] 部署文档：`docs/DEPLOYMENT.md`
- [ ] 运维手册：`docs/OPERATIONS.md`
- [ ] 客户端集成指南：`docs/CLIENT_INTEGRATION.md`

### 12.2 交付物

- [ ] Docker 镜像
- [ ] 数据库迁移脚本
- [ ] 初始化脚本
- [ ] 测试套件
- [ ] CI/CD 配置

### 12.3 下一步行动

**Phase 1：项目初始化（1天）**
1. ✅ 完成设计文档
2. ✅ 生成架构图
3. [ ] 项目脚手架搭建
4. [ ] 依赖安装

**Phase 2：核心功能实现（1周）**
1. [ ] 数据库迁移脚本
2. [ ] 用户注册 API
3. [ ] 用户登录 API
4. [ ] JWT 签发与验证
5. [ ] 管理员审核 API

**Phase 3：集成与测试（3天）**
1. [ ] Prosody JWT 验证集成
2. [ ] Electron 客户端适配
3. [ ] Android 客户端适配
4. [ ] 单元测试
5. [ ] 集成测试

**Phase 4：部署与验收（2天）**
1. [ ] Docker 镜像构建
2. [ ] 本地测试环境部署
3. [ ] 生产环境部署
4. [ ] 端到端验收

---

## 附录 A：错误码定义

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| AUTH_INVALID_CREDENTIALS | 401 | 用户名或密码错误 |
| AUTH_ACCOUNT_PENDING | 403 | 账户待审核 |
| AUTH_ACCOUNT_REJECTED | 403 | 账户已被拒绝 |
| AUTH_ACCOUNT_DISABLED | 403 | 账户已被禁用 |
| AUTH_TOKEN_EXPIRED | 401 | Token 已过期 |
| AUTH_TOKEN_INVALID | 401 | Token 无效 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| RESOURCE_NOT_FOUND | 404 | 资源不存在 |
| PERMISSION_DENIED | 403 | 权限不足 |
| RATE_LIMIT_EXCEEDED | 429 | 请求过于频繁 |
| INTERNAL_SERVER_ERROR | 500 | 服务器内部错误 |

---

## 附录 B：参考资料

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prosody JWT Authentication](https://prosody.im/doc/modules/mod_auth_token)
- [CloudMeet 部署规范](D:/code/jitsi/deploy/AGENTS.md)
- [CloudMeet 项目规范](D:/knowledgebase/standards/project-delivery.md)

---

**文档维护**：
- 作者：AI Assistant
- 版本：1.0.0（合并版）
- 最后更新：2026-11-25
- 下次审阅：设计评审后
