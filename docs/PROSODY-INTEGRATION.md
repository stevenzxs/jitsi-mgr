# Prosody JWT 集成指南

版本：1.0.0  
更新日期：2026-11-25

---

## 目录

1. [概述](#概述)
2. [Prosody 配置](#prosody-配置)
3. [JWT Token 流程](#jwt-token-流程)
4. [测试验证](#测试验证)
5. [故障排查](#故障排查)

---

## 概述

jitsi-mgr 通过 JWT（JSON Web Token）与 Prosody XMPP 服务器集成，实现以下功能：

- **用户认证**：只有通过 jitsi-mgr 认证的用户才能加入会议
- **权限控制**：基于 JWT claims 控制用户权限
- **无状态验证**：Prosody 通过公钥验证 Token，无需查询数据库

### 工作流程

```
1. 用户登录 jitsi-mgr
      ↓
2. jitsi-mgr 签发 JWT Token（使用 RSA 私钥）
      ↓
3. 客户端携带 Token 连接 Prosody
      ↓
4. Prosody 从 jitsi-mgr 获取公钥（JWKS 端点）
      ↓
5. Prosody 验证 Token 签名和 claims
      ↓
6. 验证通过 → 允许加入会议
   验证失败 → 拒绝连接
```

---

## Prosody 配置

### 1. 安装必要的模块

```bash
# Prosody JWT 认证模块
cd /usr/share/prosody/modules
wget https://raw.githubusercontent.com/jitsi-contrib/prosody-plugins/main/token_verification/mod_auth_token.lua

# 或使用 Jitsi 自带的模块（推荐）
# 通常已包含在 Jitsi Meet 安装中
ls /usr/share/jitsi-meet/prosody-plugins/
```

### 2. 配置 VirtualHost

编辑 Prosody 配置文件（通常在 `/etc/prosody/conf.avail/` 或 `/etc/prosody/conf.d/`）：

```lua
-- /etc/prosody/conf.d/meet.cloudmeet.example.com.cfg.lua

VirtualHost "meet.cloudmeet.example.com"
    -- 启用 Token 认证
    authentication = "token"
    
    -- Token 验证配置
    token_verification = "asap"  -- 使用 ASAP (JWT) 验证
    
    -- JWT Issuer（必须与 jitsi-mgr 配置一致）
    asap_accepted_issuers = { "cloudmeet-mgr" }
    
    -- JWT Audience（必须与 jitsi-mgr 配置一致）
    asap_accepted_audiences = { "cloudmeet-client" }
    
    -- JWT 公钥获取方式：从 jitsi-mgr JWKS 端点
    asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
    
    -- 可选：Token 生命周期（秒）
    -- asap_ttl_threshold = 7200  -- 2 小时
    
    -- 其他 Jitsi 配置...
    modules_enabled = {
        "bosh";
        "websocket";
        "ping";
        -- 其他模块...
    }

-- 访客域（匿名访问，用于 H5）
VirtualHost "guest.meet.cloudmeet.example.com"
    authentication = "anonymous"
    
    -- 允许访客加入会议（但不能创建会议）
    c2s_require_encryption = false
```

### 3. 配置会议组件

```lua
-- 会议组件配置
Component "conference.meet.cloudmeet.example.com" "muc"
    -- 会议室配置
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "token_verification";  -- 启用 Token 验证
    }
    
    -- 只有认证用户可以创建会议
    muc_room_locking = false
    muc_room_default_public_jids = true
    
    -- Token 验证
    token_verification_module = "token_verification"
    token_affiliation = "owner"  -- 持有 Token 的用户为会议室 owner

-- 内部 MUC（用于 jicofo）
Component "internal.auth.meet.cloudmeet.example.com" "muc"
    modules_enabled = {
        "ping";
    }
    muc_room_locking = false
    muc_room_default_public_jids = true
```

### 4. 配置 jicofo

编辑 jicofo 配置（`/etc/jitsi/jicofo/jicofo.conf`）：

```hocon
jicofo {
  authentication {
    enabled = true
    type = XMPP
    login-url = "meet.cloudmeet.example.com"
  }
  
  conference {
    enable-auto-owner = false  # 禁用自动 owner（由 Token 控制）
  }
}
```

### 5. 重启服务

```bash
# 重启 Prosody
sudo systemctl restart prosody

# 重启 jicofo
sudo systemctl restart jicofo

# 检查状态
sudo systemctl status prosody
sudo systemctl status jicofo

# 查看日志
sudo tail -f /var/log/prosody/prosody.log
sudo tail -f /var/log/jitsi/jicofo.log
```

---

## JWT Token 流程

### 1. jitsi-mgr 签发的 Token 结构

**Header**:
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "sub": "123",                      // 用户 ID
  "username": "zhangsan",            // 用户名
  "displayName": "张三",             // 显示名称
  "role": "user",                    // 角色
  "iat": 1700000000,                 // 签发时间
  "exp": 1700007200,                 // 过期时间（2小时后）
  "iss": "cloudmeet-mgr",            // Issuer（必须与 Prosody 配置一致）
  "aud": "cloudmeet-client"          // Audience（必须与 Prosody 配置一致）
}
```

**Signature**:
```
RS256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  jitsi-mgr 的 RSA 私钥
)
```

### 2. Prosody 验证流程

```
1. 客户端发送 XMPP 认证请求，携带 JWT Token
   
2. Prosody 解析 Token Header，获取 kid（Key ID）
   
3. Prosody 从 JWKS 端点获取公钥：
   GET https://cloudmeet.example.com/api/mgr/auth/jwks
   
4. Prosody 使用公钥验证 Token 签名
   
5. Prosody 验证 Token Claims：
   - iss（Issuer）是否在 asap_accepted_issuers 中
   - aud（Audience）是否在 asap_accepted_audiences 中
   - exp（过期时间）是否有效
   
6. 验证通过 → 允许连接
   验证失败 → 返回 401 Unauthorized
```

### 3. JWKS 端点响应示例

```bash
curl https://cloudmeet.example.com/api/mgr/auth/jwks
```

**响应**:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "2026-11",
      "alg": "RS256",
      "n": "xGOr1Yqr_-7MN...",  // RSA 公钥模数（Base64）
      "e": "AQAB"                // RSA 公钥指数（通常是 65537）
    }
  ]
}
```

---

## 测试验证

### 1. 验证 Prosody 配置

```bash
# 检查 Prosody 配置语法
sudo prosodyctl check config

# 检查 VirtualHost 配置
sudo prosodyctl check dns meet.cloudmeet.example.com

# 测试 Token 模块加载
sudo prosodyctl about | grep token
```

### 2. 验证 JWKS 端点

```bash
# 本地测试
curl http://127.0.0.1:3000/api/mgr/v1/auth/jwks | jq

# 通过 Caddy 测试
curl https://cloudmeet.example.com/api/mgr/auth/jwks | jq

# 预期响应：
# {
#   "keys": [
#     {
#       "kty": "RSA",
#       "use": "sig",
#       "kid": "2026-11",
#       "alg": "RS256",
#       "n": "...",
#       "e": "AQAB"
#     }
#   ]
# }
```

### 3. 完整流程测试

#### 步骤 1: 用户登录获取 Token

```bash
TOKEN=$(curl -X POST https://cloudmeet.example.com/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "SecurePass123!",
    "deviceType": "test"
  }' | jq -r '.data.token')

echo "Token: $TOKEN"
```

#### 步骤 2: 解析 Token（调试用）

```bash
# 安装 jq（如果没有）
# sudo apt install jq

# 解析 Token Payload
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq

# 预期输出：
# {
#   "sub": "123",
#   "username": "zhangsan",
#   "displayName": "张三",
#   "role": "user",
#   "iat": 1700000000,
#   "exp": 1700007200,
#   "iss": "cloudmeet-mgr",
#   "aud": "cloudmeet-client"
# }
```

#### 步骤 3: 使用 Token 连接 Prosody

**方法 A: 使用 Jitsi Meet Web 界面**

在浏览器中打开：
```
https://meet.cloudmeet.example.com/testroom?jwt=$TOKEN
```

**方法 B: 使用 Electron/Android 客户端**

在客户端配置中设置 Token：

```javascript
// Electron 示例
const jitsiConfig = {
  hosts: {
    domain: 'meet.cloudmeet.example.com',
    muc: 'conference.meet.cloudmeet.example.com'
  },
  bosh: 'https://meet.cloudmeet.example.com/http-bind',
  websocket: 'wss://meet.cloudmeet.example.com/xmpp-websocket',
  
  // 关键：传入 JWT Token
  jwt: TOKEN,
  
  // 用户信息（从 Token 中提取）
  user: {
    id: '123',
    name: '张三'
  }
};

// 加入会议
const api = new JitsiMeetExternalAPI('meet.cloudmeet.example.com', {
  roomName: 'testroom',
  jwt: TOKEN,
  configOverwrite: jitsiConfig
});
```

#### 步骤 4: 检查 Prosody 日志

```bash
# 实时查看 Prosody 日志
sudo tail -f /var/log/prosody/prosody.log

# 查找 Token 验证日志
sudo grep "token" /var/log/prosody/prosody.log | tail -20

# 成功示例：
# token	Token verified successfully for user: zhangsan@meet.cloudmeet.example.com
# token	User authorized: zhangsan (role: user)

# 失败示例：
# token	Token verification failed: invalid signature
# token	Token verification failed: expired
# token	Token verification failed: invalid issuer
```

### 4. 自动化测试脚本

```bash
#!/bin/bash
# test-prosody-jwt.sh

echo "=== Prosody JWT Integration Test ==="

# 1. 获取 Token
echo "1. Getting JWT Token..."
TOKEN=$(curl -s -X POST https://cloudmeet.example.com/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!",
    "deviceType": "test"
  }' | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"
echo "Token: ${TOKEN:0:50}..."

# 2. 验证 Token 结构
echo -e "\n2. Validating Token structure..."
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null)

if [ -z "$PAYLOAD" ]; then
    echo "❌ Failed to decode token"
    exit 1
fi

echo "✅ Token decoded"
echo "Payload: $(echo $PAYLOAD | jq -c)"

# 3. 检查必需的 claims
echo -e "\n3. Checking required claims..."

ISS=$(echo $PAYLOAD | jq -r '.iss')
AUD=$(echo $PAYLOAD | jq -r '.aud')
EXP=$(echo $PAYLOAD | jq -r '.exp')
USERNAME=$(echo $PAYLOAD | jq -r '.username')

echo "  iss: $ISS"
echo "  aud: $AUD"
echo "  username: $USERNAME"
echo "  exp: $EXP"

if [ "$ISS" != "cloudmeet-mgr" ]; then
    echo "❌ Invalid issuer: $ISS"
    exit 1
fi

if [ "$AUD" != "cloudmeet-client" ]; then
    echo "❌ Invalid audience: $AUD"
    exit 1
fi

NOW=$(date +%s)
if [ "$EXP" -lt "$NOW" ]; then
    echo "❌ Token expired"
    exit 1
fi

echo "✅ All claims valid"

# 4. 测试 JWKS 端点
echo -e "\n4. Testing JWKS endpoint..."
JWKS=$(curl -s https://cloudmeet.example.com/api/mgr/auth/jwks)

if [ -z "$JWKS" ]; then
    echo "❌ Failed to fetch JWKS"
    exit 1
fi

KEY_COUNT=$(echo $JWKS | jq '.keys | length')
echo "✅ JWKS endpoint working (keys: $KEY_COUNT)"

# 5. 检查 Prosody 状态
echo -e "\n5. Checking Prosody status..."
if systemctl is-active --quiet prosody; then
    echo "✅ Prosody is running"
else
    echo "❌ Prosody is not running"
    exit 1
fi

echo -e "\n=== All Tests Passed! ✅ ==="
echo -e "\nNext: Test actual meeting connection with this token:"
echo "https://meet.cloudmeet.example.com/testroom?jwt=$TOKEN"
```

```bash
chmod +x test-prosody-jwt.sh
./test-prosody-jwt.sh
```

---

## 故障排查

### 问题 1: Token 验证失败 - Invalid Signature

**症状**:
```
token	Token verification failed: invalid signature
```

**原因**:
- Prosody 使用的公钥与 jitsi-mgr 的私钥不匹配
- JWKS 端点返回了错误的公钥

**解决方案**:
```bash
# 1. 验证 jitsi-mgr 的 JWT 密钥
ls -la /opt/jitsi-mgr/secrets/
# 应该看到：
# jwt-private.pem (600 权限)
# jwt-public.pem (644 权限)

# 2. 验证公钥格式
openssl rsa -pubin -in /opt/jitsi-mgr/secrets/jwt-public.pem -text -noout

# 3. 重新生成密钥对（如果需要）
cd /opt/jitsi-mgr/secrets
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
chmod 600 jwt-private.pem
chmod 644 jwt-public.pem

# 4. 重启 jitsi-mgr
sudo systemctl restart jitsi-mgr

# 5. 重启 Prosody（清除缓存）
sudo systemctl restart prosody
```

---

### 问题 2: Token 验证失败 - Invalid Issuer

**症状**:
```
token	Token verification failed: invalid issuer 'cloudmeet-mgr'
```

**原因**:
- Prosody 配置中的 `asap_accepted_issuers` 与 Token 中的 `iss` 不匹配

**解决方案**:
```bash
# 1. 检查 jitsi-mgr 配置
grep JWT_ISSUER /opt/jitsi-mgr/.env

# 2. 检查 Prosody 配置
sudo grep asap_accepted_issuers /etc/prosody/conf.d/*.cfg.lua

# 3. 确保两者一致
# jitsi-mgr: JWT_ISSUER=cloudmeet-mgr
# Prosody: asap_accepted_issuers = { "cloudmeet-mgr" }

# 4. 重启服务
sudo systemctl restart jitsi-mgr
sudo systemctl restart prosody
```

---

### 问题 3: Prosody 无法访问 JWKS 端点

**症状**:
```
token	Failed to fetch JWKS from https://cloudmeet.example.com/api/mgr/auth/jwks
```

**原因**:
- Prosody 服务器无法访问 jitsi-mgr 的 JWKS 端点
- 网络防火墙阻止
- Caddy 未正确配置路由

**解决方案**:
```bash
# 1. 在 Prosody 服务器上测试 JWKS 端点
curl -v https://cloudmeet.example.com/api/mgr/auth/jwks

# 2. 如果失败，尝试本地地址（如果在同一服务器）
curl -v http://127.0.0.1:3000/api/mgr/v1/auth/jwks

# 3. 检查 Caddy 配置
sudo cat /etc/caddy/Caddyfile | grep "/api/mgr"

# 4. 检查防火墙
sudo ufw status | grep 3000

# 5. 如果 Prosody 和 jitsi-mgr 在同一服务器，可以使用本地地址
# Prosody 配置：
# asap_key_server = "http://127.0.0.1:3000/api/mgr/v1/auth/jwks"
```

---

### 问题 4: Token 过期

**症状**:
```
token	Token verification failed: token expired
```

**原因**:
- Token 的 `exp` 时间已过
- 客户端时钟与服务器不同步

**解决方案**:
```bash
# 1. 检查服务器时间
date
timedatectl

# 2. 如果时间不正确，同步时间
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd

# 3. 检查 Token 过期时间配置
grep JWT_ACCESS_TOKEN_EXPIRY /opt/jitsi-mgr/.env
# 默认：2h（2小时）

# 4. 客户端应实现 Token 自动刷新机制
# 在 Token 过期前 5 分钟刷新
```

---

### 问题 5: 匿名访客无法加入会议

**症状**:
H5 访客无法加入会议，提示需要认证

**原因**:
- 没有正确配置访客域（guest domain）
- 会议室设置不允许匿名用户

**解决方案**:
```lua
-- Prosody 配置中添加访客域
VirtualHost "guest.meet.cloudmeet.example.com"
    authentication = "anonymous"
    c2s_require_encryption = false
```

```javascript
// Jitsi Meet 配置（config.js）
var config = {
    hosts: {
        domain: 'meet.cloudmeet.example.com',
        anonymousdomain: 'guest.meet.cloudmeet.example.com',
        muc: 'conference.meet.cloudmeet.example.com'
    },
    
    // 允许匿名用户加入（但不能创建会议）
    enableUserRolesBasedOnToken: true
};
```

---

## 附录

### A. 完整的 Prosody 配置示例

```lua
-- /etc/prosody/conf.d/meet.cloudmeet.example.com.cfg.lua

admins = { }

plugin_paths = { "/usr/share/jitsi-meet/prosody-plugins/" }

-- 认证用户域（需要 JWT Token）
VirtualHost "meet.cloudmeet.example.com"
    authentication = "token"
    
    -- Token 验证
    token_verification = "asap"
    asap_accepted_issuers = { "cloudmeet-mgr" }
    asap_accepted_audiences = { "cloudmeet-client" }
    asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
    
    ssl = {
        key = "/etc/prosody/certs/meet.cloudmeet.example.com.key";
        certificate = "/etc/prosody/certs/meet.cloudmeet.example.com.crt";
    }
    
    modules_enabled = {
        "bosh";
        "websocket";
        "ping";
        "speakerstats";
        "conference_duration";
    }
    
    c2s_require_encryption = false

-- 访客域（匿名访问）
VirtualHost "guest.meet.cloudmeet.example.com"
    authentication = "anonymous"
    c2s_require_encryption = false

-- 会议组件
Component "conference.meet.cloudmeet.example.com" "muc"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "token_verification";
    }
    muc_room_locking = false
    muc_room_default_public_jids = true

-- 内部认证
Component "internal.auth.meet.cloudmeet.example.com" "muc"
    modules_enabled = {
        "ping";
    }
    muc_room_locking = false
    muc_room_default_public_jids = true

-- Focus 组件
Component "focus.meet.cloudmeet.example.com" "client_proxy"
    target_address = "focus@auth.meet.cloudmeet.example.com"
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11-25  
**下一步**: [Electron 客户端集成指南](ELECTRON-INTEGRATION.md)
