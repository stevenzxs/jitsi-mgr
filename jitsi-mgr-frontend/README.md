# jitsi-mgr 前端 - React + Tailwind CSS

CloudMeet 用户管理后台前端项目

---

## 🎨 技术栈

- **React** 18.2.0
- **React Router DOM** 6.20.0 - 路由管理
- **Tailwind CSS** 3.3.0 - UI 样式
- **Axios** 1.6.0 - HTTP 客户端
- **React Hot Toast** 2.4.1 - 通知提示

---

## 📁 项目结构

```
jitsi-mgr-frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx      # 路由守卫
│   │   └── layout/
│   │       └── Layout.jsx               # 主布局
│   ├── pages/
│   │   ├── LoginPage.jsx                # 登录页面
│   │   ├── DashboardPage.jsx            # Dashboard
│   │   ├── RegistrationsPage.jsx        # 注册审核
│   │   ├── UsersPage.jsx                # 用户管理
│   │   ├── AuditLogsPage.jsx            # 审计日志
│   │   └── ProfilePage.jsx              # 个人设置
│   ├── services/
│   │   ├── authService.js               # 认证服务
│   │   ├── userService.js               # 用户服务
│   │   └── adminService.js              # 管理员服务
│   ├── hooks/
│   │   └── useAuth.js                   # 认证 Hook
│   ├── utils/
│   │   ├── request.js                   # Axios 配置
│   │   └── storage.js                   # LocalStorage 管理
│   ├── App.jsx                          # 主应用
│   ├── index.js                         # 入口文件
│   └── index.css                        # Tailwind CSS
├── .env.development                     # 开发环境配置
├── tailwind.config.js                   # Tailwind 配置
├── postcss.config.js                    # PostCSS 配置
└── package.json
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm start
```

访问：`http://localhost:3000`

### 3. 构建生产版本

```bash
npm run build
```

---

## 🔐 默认账户

**初始管理员账户：**
- 用户名: `admin`
- 密码: `Admin123!`

---

## 📋 功能列表

### 认证功能
- ✅ 用户登录
- ✅ JWT Token 管理
- ✅ 自动刷新 Token
- ✅ 路由守卫
- ✅ 退出登录

### 用户管理
- ✅ 查看个人信息
- ✅ 修改个人信息
- ✅ 修改密码
- ✅ 会话管理

### 管理员功能
- ✅ 注册审核（批准/拒绝）
- ✅ 用户列表（分页）
- ✅ 启用/禁用用户
- ✅ 审计日志查询

### UI 特性
- ✅ 响应式布局
- ✅ Tailwind CSS 样式
- ✅ 加载状态
- ✅ 错误提示
- ✅ 成功通知

---

## 🎯 页面路由

| 路径 | 页面 | 权限要求 |
|------|------|----------|
| `/login` | 登录页面 | 公开 |
| `/` | Dashboard | 需要登录 |
| `/registrations` | 注册审核 | 管理员 |
| `/users` | 用户管理 | 管理员 |
| `/audit-logs` | 审计日志 | 管理员 |
| `/profile` | 个人设置 | 需要登录 |

---

## 🔧 配置说明

### API 地址配置

编辑 `.env.development`：

```env
REACT_APP_API_BASE_URL=http://localhost:8080/api/mgr/v1
```

### Tailwind CSS 配置

已配置主题色：
- Primary: Indigo-600 (`#4F46E5`)
- 自定义组件样式（btn, card, input, label）

---

## 📦 构建与部署

### 开发环境

```bash
npm start
```

### 生产构建

```bash
npm run build
```

构建产物在 `build/` 目录。

### 部署到 Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/mgr/ {
        proxy_pass http://localhost:8080/api/mgr/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 测试

### 功能测试清单

1. **登录测试**
   - [ ] 正确的用户名密码可以登录
   - [ ] 错误的用户名密码无法登录
   - [ ] 登录后跳转到 Dashboard
   - [ ] Token 自动刷新

2. **用户管理测试**
   - [ ] 查看个人信息
   - [ ] 修改显示名称
   - [ ] 修改邮箱
   - [ ] 修改密码
   - [ ] 查看会话列表
   - [ ] 删除会话

3. **管理员功能测试**
   - [ ] 查看注册请求列表
   - [ ] 批准注册
   - [ ] 拒绝注册
   - [ ] 查看用户列表（分页）
   - [ ] 禁用用户
   - [ ] 启用用户
   - [ ] 查看审计日志（分页）

4. **权限测试**
   - [ ] 未登录用户访问需要登录的页面会跳转到登录页
   - [ ] 普通用户无法访问管理员页面
   - [ ] 管理员可以访问所有页面

---

## 🎨 UI 组件

### 按钮样式

```jsx
<button className="btn btn-primary">主要按钮</button>
<button className="btn btn-secondary">次要按钮</button>
<button className="btn btn-danger">危险按钮</button>
```

### 卡片样式

```jsx
<div className="card">
  <h2>标题</h2>
  <p>内容</p>
</div>
```

### 表单输入

```jsx
<label className="label">标签</label>
<input className="input" type="text" />
```

---

## 📚 相关文档

- [后端 API 文档](../jitsi-mgr-java/API-TESTING.md)
- [后端快速开始](../jitsi-mgr-java/QUICKSTART.md)
- [系统架构设计](../jitsi-mgr/docs/DESIGN.md)

---

## 🐛 常见问题

### 1. API 请求失败

检查后端服务是否启动：
```bash
cd ../jitsi-mgr-java
mvn spring-boot:run
```

### 2. CORS 错误

后端已配置 CORS，允许 `http://localhost:3000`。

### 3. Token 过期

Token 有效期 2 小时，会自动刷新。如果仍然提示过期，请重新登录。

---

## 📝 开发规范

1. **组件命名**：使用 PascalCase（如 `LoginForm.jsx`）
2. **文件结构**：一个文件一个组件
3. **样式**：优先使用 Tailwind CSS 类
4. **API 调用**：统一通过 service 层
5. **错误处理**：使用 toast 提示

---

## 🔄 与后端集成

前端通过 Axios 调用后端 API：

- **Base URL**: `http://localhost:8080/api/mgr/v1`
- **认证方式**: Bearer Token
- **Token 刷新**: 自动处理

---

**开发完成！✅**
