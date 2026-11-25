#!/bin/bash

# jitsi-mgr 初始化脚本

echo "=================================="
echo "jitsi-mgr 初始化"
echo "=================================="

# 创建密钥目录
echo ""
echo "1. 创建密钥目录..."
mkdir -p src/main/resources/keys

# 生成 JWT 密钥对
echo ""
echo "2. 生成 JWT RSA 密钥对..."

if [ ! -f "src/main/resources/keys/jwt-private.pem" ]; then
    openssl genrsa -out src/main/resources/keys/jwt-private.pem 2048
    echo "✅ 私钥生成成功"
else
    echo "⚠️  私钥已存在，跳过"
fi

if [ ! -f "src/main/resources/keys/jwt-public.pem" ]; then
    openssl rsa -in src/main/resources/keys/jwt-private.pem \
        -pubout -out src/main/resources/keys/jwt-public.pem
    echo "✅ 公钥生成成功"
else
    echo "⚠️  公钥已存在，跳过"
fi

# 设置文件权限
echo ""
echo "3. 设置密钥文件权限..."
chmod 600 src/main/resources/keys/jwt-private.pem
chmod 644 src/main/resources/keys/jwt-public.pem
echo "✅ 权限设置完成"

echo ""
echo "=================================="
echo "初始化完成！"
echo "=================================="
echo ""
echo "下一步："
echo "1. 编译项目: mvn clean install"
echo "2. 运行项目: mvn spring-boot:run"
echo "3. 访问 API: http://localhost:8080/api/mgr/v1"
echo "4. 健康检查: http://localhost:8080/api/mgr/v1/health"
echo "5. H2 Console: http://localhost:8080/api/mgr/v1/h2-console"
echo ""
