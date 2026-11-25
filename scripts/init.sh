#!/bin/bash

echo "Initializing jitsi-mgr..."

# 创建必要的目录
mkdir -p data
mkdir -p secrets
mkdir -p logs

# 生成 JWT 密钥对
if [ ! -f secrets/jwt-private.pem ]; then
    echo "Generating JWT key pair..."
    openssl genrsa -out secrets/jwt-private.pem 2048
    openssl rsa -in secrets/jwt-private.pem -pubout -out secrets/jwt-public.pem
    chmod 600 secrets/jwt-private.pem
    chmod 644 secrets/jwt-public.pem
    echo "✓ JWT keys generated"
else
    echo "✓ JWT keys already exist"
fi

# 复制环境变量文件
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created (please update with your settings)"
else
    echo "✓ .env file already exists"
fi

# 运行数据库迁移
echo "Running database migrations..."
npm run db:migrate

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   jitsi-mgr initialization complete!                   ║"
echo "║                                                        ║"
echo "║   Next steps:                                          ║"
echo "║   1. Update .env with your settings                    ║"
echo "║   2. Create admin user: npm run admin:create           ║"
echo "║   3. Start the service: npm start                      ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
