# jitsi-mgr 部署清单

版本：0.1.0  
日期：2026-11-25

---

## 部署前检查清单

### 1. 环境准备

- [ ] **服务器要求**
  - [ ] Linux 服务器（Ubuntu 22.04+ / CentOS 8+）
  - [ ] 至少 2GB RAM
  - [ ] 至少 10GB 磁盘空间
  - [ ] Node.js 22+ 已安装
  - [ ] PostgreSQL 15+ 已安装（生产环境）
  - [ ] Docker & Docker Compose 已安装

- [ ] **网络要求**
  - [ ] 服务器可访问互联网（用于安装依赖）
  - [ ] 端口 3000 可用（或自定义端口）
  - [ ] HTTPS 证书已准备（生产环境必须）

- [ ] **安全要求**
  - [ ] 防火墙配置正确
  - [ ] SSH 密钥认证已启用
  - [ ] root 用户直接登录已禁用

---

### 2. 数据库准备

#### PostgreSQL 安装与配置

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 创建数据库和用户
sudo -u postgres psql
```

```sql
CREATE DATABASE jitsi_mgr;
CREATE USER jitsi_mgr WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE jitsi_mgr TO jitsi_mgr;
\q
```

- [ ] PostgreSQL 已安装
- [ ] 数据库 `jitsi_mgr` 已创建
- [ ] 用户 `jitsi_mgr` 已创建并授权
- [ ] 数据库密码已记录到安全位置

---

### 3. 源码部署

#### 方式 A：直接部署

```bash
# 克隆代码
cd /opt
git clone https://github.com/stevenzxs/jitsi-mgr.git
cd jitsi-mgr

# 安装依赖
npm install --production

# 生成 JWT 密钥
mkdir -p secrets
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
chmod 600 secrets/jwt-private.pem
chmod 644 secrets/jwt-public.pem

# 配置环境变量
cp .env.example .env
nano .env  # 修改配置

# 运行数据库迁移
npm run db:migrate

# 创建管理员
npm run admin:create -- --username admin --password 'YourSecurePassword123!' --email admin@example.com
```

- [ ] 源码已克隆到 `/opt/jitsi-mgr`
- [ ] 依赖已安装
- [ ] JWT 密钥已生成
- [ ] `.env` 已配置
- [ ] 数据库迁移已完成
- [ ] 管理员用户已创建

---

#### 方式 B：Docker 部署

```bash
# 创建部署目录
mkdir -p /opt/jitsi-mgr
cd /opt/jitsi-mgr

# 创建 docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  jitsi-mgr:
    image: cloudmeet/jitsi-mgr:latest
    container_name: jitsi-mgr
    environment:
      - NODE_ENV=production
      - DATABASE_TYPE=postgresql
      - DATABASE_URL=postgresql://jitsi_mgr:password@postgres:5432/jitsi_mgr
      - PORT=3000
      - HOST=0.0.0.0
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - ./secrets:/app/secrets:ro
      - ./data:/app/data
    networks:
      - jitsi-network
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    container_name: jitsi-mgr-db
    environment:
      - POSTGRES_DB=jitsi_mgr
      - POSTGRES_USER=jitsi_mgr
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - jitsi-network
    restart: unless-stopped

networks:
  jitsi-network:
    name: cloudmeet-network
    external: true

volumes:
  postgres-data:
EOF

# 生成 JWT 密钥
mkdir -p secrets
openssl genrsa -out secrets/jwt-private.pem 2048
openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
chmod 600 secrets/jwt-private.pem
chmod 644 secrets/jwt-public.pem

# 启动服务
docker-compose up -d

# 运行数据库迁移
docker-compose exec jitsi-mgr npm run db:migrate

# 创建管理员
docker-compose exec jitsi-mgr npm run admin:create -- \
  --username admin \
  --password 'YourSecurePassword123!' \
  --email admin@example.com
```

- [ ] `docker-compose.yml` 已创建
- [ ] JWT 密钥已生成
- [ ] 数据库密码已修改
- [ ] 服务已启动
- [ ] 数据库迁移已完成
- [ ] 管理员用户已创建

---

### 4. 环境变量配置

**关键配置项**:

```bash
# 必须修改
DATABASE_URL=postgresql://user:password@localhost:5432/jitsi_mgr
JWT_PRIVATE_KEY_PATH=/path/to/jwt-private.pem
JWT_PUBLIC_KEY_PATH=/path/to/jwt-public.pem

# 推荐修改
JWT_ISSUER=cloudmeet-mgr
JWT_AUDIENCE=cloudmeet-client
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5

# 生产环境
NODE_ENV=production
LOG_LEVEL=info
```

- [ ] 数据库连接字符串已配置
- [ ] JWT 密钥路径已配置
- [ ] JWT issuer/audience 已自定义
- [ ] 密码策略已配置
- [ ] 日志级别已设置

---

### 5. 进程管理（systemd）

#### 创建 systemd 服务

```bash
sudo nano /etc/systemd/system/jitsi-mgr.service
```

```ini
[Unit]
Description=CloudMeet User Management Service
After=network.target postgresql.service

[Service]
Type=simple
User=jitsi-mgr
WorkingDirectory=/opt/jitsi-mgr
ExecStart=/usr/bin/node /opt/jitsi-mgr/src/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=jitsi-mgr

Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# 创建用户
sudo useradd -r -s /bin/false jitsi-mgr

# 修改所有权
sudo chown -R jitsi-mgr:jitsi-mgr /opt/jitsi-mgr

# 启用并启动服务
sudo systemctl daemon-reload
sudo systemctl enable jitsi-mgr
sudo systemctl start jitsi-mgr

# 检查状态
sudo systemctl status jitsi-mgr
```

- [ ] systemd 服务文件已创建
- [ ] 用户 `jitsi-mgr` 已创建
- [ ] 文件所有权已修改
- [ ] 服务已启用并启动
- [ ] 服务状态正常

---

### 6. 反向代理配置（Caddy）

#### 添加到 Caddyfile

```
# /etc/caddy/Caddyfile

cloudmeet.example.com {
    # jitsi-mgr API
    handle /api/mgr/* {
        reverse_proxy localhost:3000
    }

    # 其他 CloudMeet 服务...
}
```

```bash
# 重新加载 Caddy
sudo systemctl reload caddy
```

- [ ] Caddy 配置已添加
- [ ] 路由 `/api/mgr/*` 已配置
- [ ] Caddy 已重新加载
- [ ] HTTPS 证书已自动获取

---

### 7. Prosody 集成配置

#### 配置 Prosody JWT 验证

```bash
sudo nano /etc/prosody/conf.d/cloudmeet.cfg.lua
```

```lua
VirtualHost "meet.cloudmeet.example.com"
    authentication = "token"
    
    -- JWT 配置
    token_verification = "asap"
    asap_accepted_issuers = { "cloudmeet-mgr" }
    asap_accepted_audiences = { "cloudmeet-client" }
    
    -- JWT 公钥 URL
    asap_key_server = "https://cloudmeet.example.com/api/mgr/auth/jwks"
```

```bash
# 重启 Prosody
sudo systemctl restart prosody
```

- [ ] Prosody JWT 配置已添加
- [ ] `asap_key_server` URL 已配置
- [ ] Prosody 已重启
- [ ] JWT 验证正常工作

---

### 8. 健康检查与监控

#### 健康检查脚本

```bash
#!/bin/bash
# /opt/jitsi-mgr/scripts/health-check.sh

HEALTH_URL="http://127.0.0.1:3000/health"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "✅ jitsi-mgr is healthy"
    exit 0
else
    echo "❌ jitsi-mgr is unhealthy (HTTP $response)"
    exit 1
fi
```

```bash
chmod +x /opt/jitsi-mgr/scripts/health-check.sh

# 添加到 crontab（每 5 分钟检查一次）
crontab -e
```

```
*/5 * * * * /opt/jitsi-mgr/scripts/health-check.sh >> /var/log/jitsi-mgr-health.log 2>&1
```

- [ ] 健康检查脚本已创建
- [ ] 定时任务已添加
- [ ] 健康日志正常记录

---

### 9. 日志管理

#### 配置日志轮转

```bash
sudo nano /etc/logrotate.d/jitsi-mgr
```

```
/var/log/jitsi-mgr/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 jitsi-mgr jitsi-mgr
    sharedscripts
    postrotate
        systemctl reload jitsi-mgr > /dev/null 2>&1 || true
    endscript
}
```

- [ ] 日志轮转配置已添加
- [ ] 日志保留 30 天
- [ ] 日志压缩已启用

---

### 10. 备份策略

#### 数据库备份脚本

```bash
#!/bin/bash
# /opt/jitsi-mgr/scripts/backup.sh

BACKUP_DIR="/backup/jitsi-mgr"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -U jitsi_mgr jitsi_mgr | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 备份 JWT 密钥
tar -czf "$BACKUP_DIR/secrets_$DATE.tar.gz" /opt/jitsi-mgr/secrets/

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/jitsi-mgr/scripts/backup.sh

# 每天凌晨 2 点备份
crontab -e
```

```
0 2 * * * /opt/jitsi-mgr/scripts/backup.sh >> /var/log/jitsi-mgr-backup.log 2>&1
```

- [ ] 备份脚本已创建
- [ ] 备份目录已创建
- [ ] 定时备份已配置
- [ ] 备份恢复已测试

---

### 11. 安全加固

#### 防火墙配置

```bash
# 只允许从 Caddy 访问 jitsi-mgr
sudo ufw allow from 127.0.0.1 to any port 3000
sudo ufw deny 3000

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j DROP
```

#### 文件权限

```bash
# JWT 私钥只读
chmod 600 /opt/jitsi-mgr/secrets/jwt-private.pem

# JWT 公钥可读
chmod 644 /opt/jitsi-mgr/secrets/jwt-public.pem

# .env 文件保护
chmod 600 /opt/jitsi-mgr/.env
```

- [ ] 防火墙规则已配置
- [ ] 端口 3000 只允许本地访问
- [ ] JWT 私钥权限已设置为 600
- [ ] `.env` 文件权限已设置为 600

---

### 12. 功能验证

#### 基础功能测试

```bash
# 健康检查
curl http://127.0.0.1:3000/health

# 通过 Caddy 访问
curl https://cloudmeet.example.com/api/mgr/v1/auth/status

# 管理员登录测试
curl -X POST https://cloudmeet.example.com/api/mgr/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourPassword123!",
    "deviceType": "test"
  }'

# JWT 公钥测试
curl https://cloudmeet.example.com/api/mgr/v1/auth/jwks
```

- [ ] 本地健康检查通过
- [ ] 外部 HTTPS 访问正常
- [ ] 管理员登录成功
- [ ] JWKS 端点返回正确

#### Prosody JWT 验证测试

```bash
# 使用 Electron/Android 客户端测试
# 1. 用户登录获取 JWT
# 2. 客户端使用 JWT 连接 Prosody
# 3. 验证会议连接成功
```

- [ ] 客户端登录成功
- [ ] JWT Token 正常签发
- [ ] Prosody 验证 Token 成功
- [ ] 会议连接正常

---

### 13. 性能调优

#### Node.js 参数

```bash
# systemd 服务添加
Environment="NODE_OPTIONS=--max-old-space-size=2048"
```

#### PostgreSQL 优化

```sql
-- /etc/postgresql/15/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB
```

```bash
sudo systemctl restart postgresql
```

- [ ] Node.js 内存限制已配置
- [ ] PostgreSQL 参数已优化
- [ ] 数据库连接池已调优

---

### 14. 监控告警

#### 推荐监控指标

- [ ] 服务可用性（健康检查）
- [ ] API 响应时间（P50, P95, P99）
- [ ] 请求成功率
- [ ] 数据库连接数
- [ ] 内存使用率
- [ ] CPU 使用率
- [ ] 磁盘使用率

#### 推荐告警规则

- [ ] 服务不可用 > 1 分钟
- [ ] 错误率 > 5%
- [ ] P99 延迟 > 2 秒
- [ ] 数据库连接池满
- [ ] 磁盘空间 < 10%

---

## 部署后验证

### 最终检查清单

- [ ] **服务状态**
  - [ ] jitsi-mgr 服务正在运行
  - [ ] PostgreSQL 服务正在运行
  - [ ] Caddy 服务正在运行
  - [ ] Prosody 服务正在运行

- [ ] **网络连接**
  - [ ] 健康检查端点正常
  - [ ] API 端点通过 HTTPS 可访问
  - [ ] JWKS 端点返回正确
  - [ ] 客户端可以连接

- [ ] **功能验证**
  - [ ] 管理员可以登录
  - [ ] 用户可以注册
  - [ ] 管理员可以审核注册
  - [ ] 用户可以登录并进入会议
  - [ ] Prosody JWT 验证正常

- [ ] **安全检查**
  - [ ] HTTPS 强制启用
  - [ ] JWT 私钥权限正确
  - [ ] 数据库密码安全
  - [ ] 防火墙规则正确
  - [ ] 敏感端口已关闭

- [ ] **运维就绪**
  - [ ] 日志正常记录
  - [ ] 日志轮转已配置
  - [ ] 备份脚本正常运行
  - [ ] 健康检查正常
  - [ ] 监控告警已配置

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 查看日志
sudo journalctl -u jitsi-mgr -n 50 -f

# 检查端口占用
sudo lsof -i :3000

# 检查配置文件
node -c src/app.js
```

#### 2. 数据库连接失败

```bash
# 测试数据库连接
psql -U jitsi_mgr -h localhost -d jitsi_mgr

# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 3. JWT 验证失败

```bash
# 验证密钥文件存在
ls -la /opt/jitsi-mgr/secrets/

# 测试 JWKS 端点
curl https://cloudmeet.example.com/api/mgr/v1/auth/jwks

# 检查 Prosody 日志
sudo tail -f /var/log/prosody/prosody.log
```

---

## 回滚计划

### 快速回滚步骤

```bash
# 1. 停止服务
sudo systemctl stop jitsi-mgr

# 2. 恢复数据库备份
gunzip < /backup/jitsi-mgr/db_YYYYMMDD_HHMMSS.sql.gz | psql -U jitsi_mgr jitsi_mgr

# 3. 恢复代码（Git）
cd /opt/jitsi-mgr
git checkout <previous-commit>
npm install

# 4. 启动服务
sudo systemctl start jitsi-mgr

# 5. 验证服务
curl http://127.0.0.1:3000/health
```

---

**清单版本**: 1.0.0  
**适用版本**: jitsi-mgr 0.1.0  
**最后更新**: 2026-11-25
