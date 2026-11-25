# jitsi-mgr API 测试指南

版本：0.1.0  
日期：2026-11-25

---

## 🚀 快速测试

### 1. 启动服务

```bash
mvn spring-boot:run
```

**初始管理员账户（自动创建）：**
- Username: `admin`
- Password: `Admin123!`

---

## 📋 完整 API 列表

### 认证 API

#### 1. 用户登录
```bash
curl -X POST http://localhost:8080/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!",
    "deviceType": "web"
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 7200,
    "user": {
      "id": 1,
      "username": "admin",
      "displayName": "系统管理员",
      "email": "admin@cloudmeet.example.com",
      "role": "admin",
      "status": "active"
    }
  }
}
```

#### 2. 刷新 Token
```bash
curl -X POST http://localhost:8080/api/mgr/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 3. 获取 JWKS 公钥
```bash
curl http://localhost:8080/api/mgr/v1/auth/jwks
```

#### 4. 退出登录
```bash
curl -X POST http://localhost:8080/api/mgr/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

### 用户管理 API（需要认证）

#### 5. 获取当前用户信息
```bash
curl http://localhost:8080/api/mgr/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 6. 更新用户信息
```bash
curl -X PUT http://localhost:8080/api/mgr/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "displayName": "新的显示名称",
    "email": "newemail@example.com"
  }'
```

#### 7. 修改密码
```bash
curl -X POST http://localhost:8080/api/mgr/v1/users/me/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "oldPassword": "Admin123!",
    "newPassword": "NewPassword123!"
  }'
```

#### 8. 获取会话列表
```bash
curl http://localhost:8080/api/mgr/v1/users/me/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 9. 删除指定会话
```bash
curl -X DELETE http://localhost:8080/api/mgr/v1/users/me/sessions/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 管理员 API（需要管理员权限）

#### 10. 获取注册请求列表
```bash
curl http://localhost:8080/api/mgr/v1/admin/registration-requests \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 11. 批准注册请求
```bash
curl -X POST http://localhost:8080/api/mgr/v1/admin/registration-requests/1/approve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 12. 拒绝注册请求
```bash
curl -X POST http://localhost:8080/api/mgr/v1/admin/registration-requests/1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "reason": "信息不完整"
  }'
```

#### 13. 获取用户列表（分页）
```bash
curl "http://localhost:8080/api/mgr/v1/admin/users?page=0&size=20&sort=id&direction=DESC" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 14. 获取用户详情
```bash
curl http://localhost:8080/api/mgr/v1/admin/users/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 15. 禁用用户
```bash
curl -X PUT http://localhost:8080/api/mgr/v1/admin/users/2/disable \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 16. 启用用户
```bash
curl -X PUT http://localhost:8080/api/mgr/v1/admin/users/2/enable \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 17. 获取审计日志（分页）
```bash
curl "http://localhost:8080/api/mgr/v1/admin/audit-logs?page=0&size=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 健康检查

#### 18. 健康检查
```bash
curl http://localhost:8080/api/mgr/v1/health
```

---

## 🧪 完整测试流程

### 测试脚本（Bash）

```bash
#!/bin/bash

BASE_URL="http://localhost:8080/api/mgr/v1"

echo "========================================="
echo "jitsi-mgr API 测试"
echo "========================================="

# 1. 健康检查
echo ""
echo "1. 测试健康检查..."
curl -s $BASE_URL/health | jq

# 2. 管理员登录
echo ""
echo "2. 管理员登录..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!",
    "deviceType": "test"
  }')

echo $LOGIN_RESPONSE | jq

# 提取 Token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken')

if [ "$ACCESS_TOKEN" == "null" ]; then
    echo "❌ 登录失败"
    exit 1
fi

echo "✅ 登录成功"
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

# 3. 获取当前用户信息
echo ""
echo "3. 获取当前用户信息..."
curl -s $BASE_URL/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# 4. 获取 JWKS
echo ""
echo "4. 获取 JWKS 公钥..."
curl -s $BASE_URL/auth/jwks | jq

# 5. 获取用户列表
echo ""
echo "5. 获取用户列表..."
curl -s "$BASE_URL/admin/users?page=0&size=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# 6. 获取审计日志
echo ""
echo "6. 获取审计日志..."
curl -s "$BASE_URL/admin/audit-logs?page=0&size=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# 7. 刷新 Token
echo ""
echo "7. 刷新 Token..."
curl -s -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq

echo ""
echo "========================================="
echo "测试完成！✅"
echo "========================================="
```

保存为 `test-api.sh`，然后执行：

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 📊 API 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 🔐 认证说明

### 1. JWT Token

- **类型**: Bearer Token
- **位置**: HTTP Header `Authorization: Bearer {token}`
- **有效期**: 2 小时（7200 秒）
- **刷新**: 使用 Refresh Token 刷新

### 2. Refresh Token

- **有效期**: 30 天
- **使用**: 调用 `/auth/refresh` 端点
- **存储**: 客户端安全存储

---

## 🎯 下一步

- ✅ 阶段 1：核心认证（100%）
- ✅ 阶段 2：管理功能（100%）
- ⏳ 阶段 3：前端（React + Tailwind CSS）
- ⏳ 阶段 4：测试与部署
