# jitsi-mgr API 使用指南

版本：0.1.0  
更新日期：2026-11-25

---

## 目录

1. [快速开始](#快速开始)
2. [认证流程](#认证流程)
3. [API 参考](#api-参考)
4. [错误处理](#错误处理)
5. [最佳实践](#最佳实践)

---

## 快速开始

### 基础信息

- **Base URL**: `https://cloudmeet.example.com/api/mgr/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: Bearer Token (JWT)

### 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-11-25T10:00:00Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": "2026-11-25T10:00:00Z"
}
```

---

## 认证流程

### 1. 新用户注册流程

```
用户提交注册
    ↓
后台待审核
    ↓
管理员审核（批准/拒绝）
    ↓
用户收到通知
    ↓
用户登录系统
```

#### 步骤 1: 用户注册

```bash
curl -X POST https://cloudmeet.example.com/api/mgr/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "SecurePass123!",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "displayName": "张三",
    "reason": "需要参加公司视频会议"
  }'
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

#### 步骤 2: 管理员批准

```bash
curl -X POST https://cloudmeet.example.com/api/mgr/v1/admin/registrations/123/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "comment": "欢迎加入"
  }'
```

#### 步骤 3: 用户登录

```bash
curl -X POST https://cloudmeet.example.com/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "SecurePass123!",
    "deviceType": "electron"
  }'
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

### 2. 使用 Token 访问 API

在所有需要认证的请求中，添加 `Authorization` 头：

```bash
curl -X GET https://cloudmeet.example.com/api/mgr/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Token 刷新

Access Token 有效期为 2 小时，使用 Refresh Token 获取新的 Access Token：

```bash
curl -X POST https://cloudmeet.example.com/api/mgr/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "..."
  }'
```

---

## API 参考

### 🔓 认证 API（公开）

#### POST /auth/register
用户注册

**请求体**:
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| username | string | 是 | 用户名（3-50字符）|
| password | string | 是 | 密码（至少8字符）|
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| displayName | string | 是 | 显示名称 |
| reason | string | 否 | 注册原因 |

**密码要求**:
- 最小长度：8 字符
- 建议包含：大写字母、小写字母、数字

**响应**: 201 Created
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

---

#### POST /auth/login
用户登录

**请求体**:
| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |
| deviceType | string | 否 | 设备类型（electron/android）|

**响应**: 200 OK
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

**可能的错误**:
- `401 AUTH_INVALID_CREDENTIALS`: 用户名或密码错误
- `403 AUTH_ACCOUNT_PENDING`: 账户待审核
- `403 AUTH_ACCOUNT_REJECTED`: 账户已被拒绝
- `403 AUTH_ACCOUNT_DISABLED`: 账户已被禁用

---

#### POST /auth/refresh
刷新 Token

**请求体**:
```json
{
  "refreshToken": "..."
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7200
  }
}
```

---

#### GET /auth/jwks
获取 JWT 公钥（供 Prosody 验证）

**响应**: 200 OK
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

---

### 👤 用户 API（需要认证）

#### GET /users/me
获取当前用户信息

**Headers**:
```
Authorization: Bearer <token>
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": 123,
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "display_name": "张三",
    "status": "approved",
    "role": "user",
    "created_at": "2026-11-01T10:00:00Z",
    "approved_at": "2026-11-02T10:00:00Z"
  }
}
```

---

#### PUT /users/me
更新用户信息

**请求体**:
```json
{
  "email": "newemail@example.com",
  "phone": "13900139000",
  "displayName": "张三（更新）"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": 123,
    "username": "zhangsan",
    "email": "newemail@example.com",
    "phone": "13900139000",
    "display_name": "张三（更新）",
    ...
  }
}
```

---

#### POST /users/me/change-password
修改密码

**请求体**:
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

---

#### GET /users/me/sessions
查看登录会话

**响应**: 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "device_type": "electron",
      "device_info": null,
      "ip_address": "192.168.1.100",
      "created_at": "2026-11-25T10:00:00Z",
      "last_active_at": "2026-11-25T12:00:00Z",
      "expires_at": "2026-11-25T14:00:00Z"
    }
  ]
}
```

---

#### DELETE /users/me/sessions/:id
注销指定会话

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Session revoked successfully"
  }
}
```

---

### 🛡️ 管理员 API（需要 admin 角色）

#### GET /admin/registrations
获取注册申请列表

**Query 参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| status | string | 状态过滤（pending/approved/rejected）|
| page | number | 页码（默认 1）|
| limit | number | 每页数量（默认 20）|

**示例**:
```bash
GET /admin/registrations?status=pending&page=1&limit=20
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "display_name": "张三",
      "reason": "需要参加公司视频会议",
      "status": "pending",
      "created_at": "2026-11-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

#### POST /admin/registrations/:id/approve
批准注册

**请求体**:
```json
{
  "comment": "欢迎加入"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Registration approved successfully",
    "userId": 123,
    "username": "zhangsan"
  }
}
```

---

#### POST /admin/registrations/:id/reject
拒绝注册

**请求体**:
```json
{
  "reason": "不符合注册条件",
  "comment": "请联系管理员获取更多信息"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Registration rejected",
    "userId": 123,
    "username": "zhangsan"
  }
}
```

---

#### GET /admin/users
获取用户列表

**Query 参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| status | string | 状态过滤（pending/approved/rejected/disabled）|
| role | string | 角色过滤（user/admin/superadmin）|
| search | string | 搜索（用户名/邮箱/显示名）|
| page | number | 页码（默认 1）|
| limit | number | 每页数量（默认 20）|

**示例**:
```bash
GET /admin/users?status=approved&search=zhang&page=1&limit=20
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "phone": "13800138000",
      "display_name": "张三",
      "status": "approved",
      "role": "user",
      "created_at": "2026-11-25T10:00:00Z",
      "approved_at": "2026-11-25T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### POST /admin/users/:id/disable
禁用用户

**请求体**:
```json
{
  "reason": "违反使用规定"
}
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "User disabled successfully",
    "userId": 123,
    "username": "zhangsan"
  }
}
```

---

#### POST /admin/users/:id/enable
启用用户

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "User enabled successfully",
    "userId": 123,
    "username": "zhangsan"
  }
}
```

---

#### GET /admin/audit-logs
获取审计日志

**Query 参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| userId | number | 用户 ID 过滤 |
| action | string | 操作类型过滤 |
| startDate | string | 开始日期（ISO 8601）|
| endDate | string | 结束日期（ISO 8601）|
| page | number | 页码（默认 1）|
| limit | number | 每页数量（默认 50）|

**示例**:
```bash
GET /admin/audit-logs?action=approve_registration&limit=10
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "user_id": 1,
      "username": "admin",
      "display_name": "Administrator",
      "action": "approve_registration",
      "resource_type": "registration_request",
      "resource_id": 123,
      "details": {
        "targetUserId": 123,
        "targetUsername": "zhangsan",
        "comment": "欢迎加入"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2026-11-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 200,
    "totalPages": 4
  }
}
```

---

## 错误处理

### 错误码列表

| 错误码 | HTTP 状态码 | 描述 |
|--------|-------------|------|
| `AUTH_INVALID_CREDENTIALS` | 401 | 用户名或密码错误 |
| `AUTH_ACCOUNT_PENDING` | 403 | 账户待审核 |
| `AUTH_ACCOUNT_REJECTED` | 403 | 账户已被拒绝 |
| `AUTH_ACCOUNT_DISABLED` | 403 | 账户已被禁用 |
| `AUTH_TOKEN_MISSING` | 401 | 缺少认证 Token |
| `AUTH_TOKEN_INVALID` | 401 | Token 无效或已过期 |
| `PERMISSION_DENIED` | 403 | 权限不足 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `RESOURCE_ALREADY_EXISTS` | 409 | 资源已存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "用户名或密码错误"
  },
  "timestamp": "2026-11-25T10:00:00Z"
}
```

---

## 最佳实践

### 1. 安全建议

- ✅ **始终使用 HTTPS**：生产环境必须使用 HTTPS
- ✅ **安全存储 Token**：不要在日志或 URL 中暴露 Token
- ✅ **Token 过期处理**：实现自动刷新机制
- ✅ **密码复杂度**：强制用户使用强密码
- ✅ **限制登录尝试**：防止暴力破解

### 2. Token 管理

```javascript
// 推荐的 Token 存储方式（Electron）
const Store = require('electron-store');
const store = new Store({
  encryptionKey: 'your-encryption-key'
});

// 存储 Token
store.set('auth.accessToken', token);
store.set('auth.refreshToken', refreshToken);

// 读取 Token
const token = store.get('auth.accessToken');
```

### 3. 自动刷新 Token

```javascript
async function refreshTokenIfNeeded() {
  const expiresAt = store.get('auth.expiresAt');
  const now = Date.now();
  
  // 提前 5 分钟刷新
  if (now + 5 * 60 * 1000 >= expiresAt) {
    const refreshToken = store.get('auth.refreshToken');
    const response = await fetch('/api/mgr/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const { token, expiresIn } = await response.json();
    store.set('auth.accessToken', token);
    store.set('auth.expiresAt', now + expiresIn * 1000);
  }
}
```

### 4. Rate Limiting

API 有以下速率限制：

| 端点 | 限制 |
|------|------|
| `/auth/register` | 10 次/小时/IP |
| `/auth/login` | 20 次/小时/IP |
| 其他认证端点 | 1000 次/小时/用户 |

超过限制会返回 `429 Too Many Requests`。

### 5. 分页处理

```javascript
async function getAllUsers() {
  let page = 1;
  let allUsers = [];
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `/api/mgr/v1/admin/users?page=${page}&limit=50`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const { data, pagination } = await response.json();
    allUsers = allUsers.concat(data);
    
    hasMore = page < pagination.totalPages;
    page++;
  }
  
  return allUsers;
}
```

---

## 附录

### A. JWT Token 结构

**Access Token Payload**:
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

### B. 审计日志操作类型

| 操作 | 描述 |
|------|------|
| `approve_registration` | 批准注册 |
| `reject_registration` | 拒绝注册 |
| `disable_user` | 禁用用户 |
| `enable_user` | 启用用户 |
| `change_password` | 修改密码 |
| `update_profile` | 更新个人资料 |

### C. Prosody 集成配置

```lua
-- prosody.cfg.lua
authentication = "token"
token_verification = "asap"
asap_accepted_issuers = { "cloudmeet-mgr" }
asap_accepted_audiences = { "cloudmeet-client" }

-- JWT 公钥 URL
asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11-25  
**维护者**: jitsi-mgr 开发团队
