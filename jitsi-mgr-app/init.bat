@echo off
chcp 65001 >nul
echo ==================================
echo jitsi-mgr 初始化
echo ==================================
echo.

REM 创建密钥目录
echo 1. 创建密钥目录...
if not exist "src\main\resources\keys" mkdir "src\main\resources\keys"
echo ✅ 目录创建完成
echo.

REM 生成 JWT 密钥对
echo 2. 生成 JWT RSA 密钥对...
echo.

if not exist "src\main\resources\keys\jwt-private.pem" (
    echo 正在生成私钥...
    openssl genrsa -out "src\main\resources\keys\jwt-private.pem" 2048
    echo ✅ 私钥生成成功
) else (
    echo ⚠️  私钥已存在，跳过
)

if not exist "src\main\resources\keys\jwt-public.pem" (
    echo 正在生成公钥...
    openssl rsa -in "src\main\resources\keys\jwt-private.pem" -pubout -out "src\main\resources\keys\jwt-public.pem"
    echo ✅ 公钥生成成功
) else (
    echo ⚠️  公钥已存在，跳过
)

echo.
echo ==================================
echo 初始化完成！
echo ==================================
echo.
echo 下一步：
echo 1. 编译项目: mvn clean install
echo 2. 运行项目: mvn spring-boot:run
echo 3. 访问 API: http://localhost:8080/api/mgr/v1
echo 4. 健康检查: http://localhost:8080/api/mgr/v1/health
echo 5. H2 Console: http://localhost:8080/api/mgr/v1/h2-console
echo.
pause
