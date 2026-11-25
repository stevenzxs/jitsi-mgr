# jitsi-mgr

CloudMeet 用户管理系统 Monorepo

## 项目结构

```
jitsi-mgr/
├── jitsi-mgr-app/          # Spring Boot 后端
│   ├── src/
│   │   └── main/java/cn/stevenzxs/jitsimgr/
│   └── pom.xml
├── jitsi-mgr-frontend/     # React 前端
│   ├── src/
│   ├── public/
│   └── package.json
└── docs/                   # 文档
```

## 技术栈

### 后端 (jitsi-mgr-app)
- Java 17
- Spring Boot 3.2.0
- PostgreSQL / H2
- JWT RS256 身份认证
- Prosody XMPP 集成

### 前端 (jitsi-mgr-frontend)
- React 18
- Tailwind CSS
- React Router v6
- Axios

## 快速开始

### 本地开发

详见各子项目的 README：
- [后端文档](jitsi-mgr-app/README.md)
- [前端文档](jitsi-mgr-frontend/README.md)

### 生产构建

**后端：**
```bash
cd jitsi-mgr-app
mvn clean package -DskipTests
```

**前端：**
```bash
cd jitsi-mgr-frontend
npm ci
npm run build
```

## 部署

jitsi-mgr 作为 CloudMeet 第 8 个服务集成到标准部署流程：

- 后端：JAR 文件运行在 `eclipse-temurin:17-jre` 容器
- 前端：静态文件由 Caddy gateway 托管在 `/api/mgr/ui/`
- API：通过 gateway 反向代理到 `/api/mgr/*`

详见 [部署文档](https://github.com/stevenzxs/cloudemeet-deploy)

## 文档

- [项目总览](docs/PROJECT-SUMMARY.md)
- [快速测试指南](docs/QUICK-TEST-GUIDE.md)
- [集成计划](docs/jitsi-mgr-integration.md)

## 权限系统

- **guest** (0) - 访客
- **user** (1) - 普通用户
- **admin** (2) - 管理员
- **superadmin** (3) - 超级管理员

## API 端点

- `POST /api/mgr/v1/auth/login` - 用户登录
- `GET /api/mgr/v1/users` - 用户列表（管理员）
- `GET /api/mgr/v1/admin/registrations` - 注册审核（管理员）
- `GET /api/mgr/v1/admin/audit-logs` - 审计日志（管理员）
- `GET /api/mgr/auth/jwks` - Prosody JWT 公钥

## 许可证

与 CloudMeet 主项目保持一致
