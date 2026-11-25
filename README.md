# CloudMeet User Management Service (jitsi-mgr)

CloudMeet 视频会议管理后台服务，为 Electron 桌面端和 Android 移动端提供统一的用户认证和权限管理。

## 功能特性

- ✅ 用户注册与审核
- ✅ 用户登录认证
- ✅ JWT Token 签发与验证
- ✅ 管理员审核系统
- ✅ 会话管理
- ✅ 审计日志
- ✅ Rate Limiting
- ✅ 与 Prosody XMPP 的 JWT 集成

## 技术栈

- **运行时**: Node.js 22+
- **框架**: Express
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **认证**: JWT (RS256)
- **密码加密**: bcrypt

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化

```bash
# Linux/macOS
bash scripts/init.sh

# Windows (PowerShell)
# 手动执行以下步骤：
mkdir data, secrets, logs
# 生成 JWT 密钥（需要 OpenSSL）
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
# 复制配置文件
copy .env.example .env
# 运行数据库迁移
npm run db:migrate
```

### 3. 配置环境变量

编辑 `.env` 文件：

```bash
NODE_ENV=development
PORT=3000
HOST=127.0.0.1

# 开发环境使用 SQLite
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/jitsi-mgr.db
```

### 4. 创建管理员

```bash
npm run admin:create -- --username admin --password YourSecurePassword123! --email admin@example.com
```

### 5. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务将在 `http://127.0.0.1:3000` 启动。

## API 端点

### 认证 API

**Base URL**: `http://127.0.0.1:3000/api/mgr/v1`

#### 用户注册
```bash
POST /auth/register
Content-Type: application/json

{
  "username": "zhangsan",
  "password": "SecurePass123!",
  "email": "zhangsan@example.com",
  "displayName": "张三",
  "reason": "需要参加公司视频会议"
}
```

#### 用户登录
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "zhangsan",
  "password": "SecurePass123!",
  "deviceType": "electron"
}
```

#### 刷新 Token
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### 获取 JWT 公钥 (JWKS)
```bash
GET /auth/jwks
```

#### 健康检查
```bash
GET /health
```

## 测试

```bash
# 运行所有测试
npm test

# 测试用户注册
curl -X POST http://127.0.0.1:3000/api/mgr/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!","displayName":"Test User"}'

# 测试登录（需要先批准用户）
curl -X POST http://127.0.0.1:3000/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourPassword123!","deviceType":"test"}'
```

## 目录结构

```
jitsi-mgr/
├── src/
│   ├── config/              # 配置
│   │   ├── index.js
│   │   └── database.js
│   ├── controllers/         # 控制器
│   │   └── authController.js
│   ├── services/            # 业务逻辑
│   │   └── authService.js
│   ├── middleware/          # 中间件
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/              # 路由
│   │   └── authRoutes.js
│   └── app.js               # 应用入口
├── scripts/                 # 脚本
│   ├── init.sh
│   ├── migrate.js
│   └── create-admin.js
├── docs/                    # 文档
│   └── diagrams.md
├── data/                    # 数据库文件 (SQLite)
├── secrets/                 # JWT 密钥
├── logs/                    # 日志
├── .env                     # 环境变量
├── .env.example
├── package.json
├── DESIGN.md                # 完整设计文档
└── README.md
```

## 与 Prosody 集成

在 Prosody 配置中添加：

```lua
-- prosody.cfg.lua
authentication = "token"
token_verification = "asap"
asap_accepted_issuers = { "cloudmeet-mgr" }
asap_accepted_audiences = { "cloudmeet-client" }

-- JWT 公钥 URL
asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
```

## 部署

### Docker Compose

```yaml
version: '3.8'
services:
  jitsi-mgr:
    build: .
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgresql
      - DATABASE_URL=postgresql://user:pass@postgres/jitsi_mgr
    volumes:
      - ./secrets:/app/secrets:ro
      - ./data:/app/data
    restart: unless-stopped
```

## 开发状态

- [x] 项目初始化
- [x] 数据库设计
- [x] 用户注册 API
- [x] 用户登录 API
- [x] JWT 签发与验证
- [x] Rate Limiting
- [ ] 管理员审核 API
- [ ] 用户管理 API
- [ ] 审计日志 API
- [ ] 单元测试
- [ ] 集成测试
- [ ] Prosody 集成测试
- [ ] 客户端集成

## 文档

- [完整设计文档](DESIGN.md) - 系统架构、API 设计、安全设计
- [架构图集](docs/diagrams.md) - 12 张可视化架构图

## 许可证

MIT

## 相关项目

- [CloudMeet Deploy](https://github.com/stevenzxs/cloudemeet-deploy) - CloudMeet 部署配置
- [Jitsi Meet](https://github.com/jitsi/jitsi-meet) - 视频会议核心
