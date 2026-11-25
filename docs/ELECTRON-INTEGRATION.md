# Electron 客户端集成指南

版本：1.0.0  
更新日期：2026-11-25

---

## 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [登录认证](#登录认证)
4. [Token 管理](#token-管理)
5. [会议集成](#会议集成)
6. [完整示例](#完整示例)
7. [最佳实践](#最佳实践)

---

## 概述

本指南介绍如何在 Electron 桌面应用中集成 jitsi-mgr 用户认证系统。

### 集成流程

```
Electron App 启动
       ↓
检查本地 Token
       ↓
   Token 有效？
    /        \
  是          否
   ↓          ↓
进入主界面   显示登录界面
   ↓          ↓
用户操作    用户登录
   ↓          ↓
加入会议 ← 获取 JWT Token
   ↓
传递 Token 给 Jitsi
   ↓
Prosody 验证 Token
   ↓
成功加入会议
```

---

## 快速开始

### 1. 安装依赖

```bash
npm install electron-store node-fetch
```

### 2. 项目结构

```
electron-app/
├── main.js              # 主进程
├── preload.js           # 预加载脚本
├── renderer/
│   ├── login.html       # 登录界面
│   ├── login.js
│   ├── main.html        # 主界面
│   └── main.js
├── services/
│   ├── auth.js          # 认证服务
│   └── jitsi.js         # Jitsi 集成
└── package.json
```

---

## 登录认证

### 1. 创建认证服务

```javascript
// services/auth.js
const Store = require('electron-store');
const fetch = require('node-fetch');

class AuthService {
  constructor() {
    // 使用加密存储
    this.store = new Store({
      encryptionKey: 'your-encryption-key-here', // 生产环境使用随机密钥
      name: 'auth'
    });
    
    this.baseURL = 'https://cloudmeet.example.com/api/mgr/v1';
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password,
          deviceType: 'electron'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message || 'Login failed');
      }

      const { token, refreshToken, expiresIn, user } = result.data;

      // 存储 Token 和用户信息
      this.store.set('accessToken', token);
      this.store.set('refreshToken', refreshToken);
      this.store.set('expiresAt', Date.now() + expiresIn * 1000);
      this.store.set('user', user);

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken() {
    try {
      const refreshToken = this.store.get('refreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message || 'Token refresh failed');
      }

      const { token, expiresIn } = result.data;

      // 更新 Token
      this.store.set('accessToken', token);
      this.store.set('expiresAt', Date.now() + expiresIn * 1000);

      return token;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * 获取当前 Access Token（自动刷新）
   */
  async getToken() {
    const token = this.store.get('accessToken');
    const expiresAt = this.store.get('expiresAt');

    if (!token) {
      throw new Error('No token available');
    }

    // 提前 5 分钟刷新
    const needsRefresh = Date.now() + 5 * 60 * 1000 >= expiresAt;

    if (needsRefresh) {
      return await this.refreshToken();
    }

    return token;
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated() {
    const token = this.store.get('accessToken');
    const expiresAt = this.store.get('expiresAt');

    return !!(token && expiresAt && Date.now() < expiresAt);
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return this.store.get('user');
  }

  /**
   * 退出登录
   */
  logout() {
    this.store.clear();
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const token = await this.getToken();

      const response = await fetch(`${this.baseURL}/users/me/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message || 'Password change failed');
      }

      return result;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
```

---

## Token 管理

### 1. 自动刷新机制

```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const authService = require('./services/auth');

let mainWindow;
let tokenRefreshInterval;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 检查登录状态
  if (authService.isAuthenticated()) {
    mainWindow.loadFile('renderer/main.html');
    startTokenRefresh();
  } else {
    mainWindow.loadFile('renderer/login.html');
  }
}

// 启动 Token 自动刷新（每 30 分钟检查一次）
function startTokenRefresh() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  tokenRefreshInterval = setInterval(async () => {
    try {
      await authService.getToken(); // 自动刷新
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Token 刷新失败，退出登录
      clearInterval(tokenRefreshInterval);
      authService.logout();
      
      if (mainWindow) {
        mainWindow.loadFile('renderer/login.html');
      }
    }
  }, 30 * 60 * 1000); // 30 分钟
}

// 停止 Token 刷新
function stopTokenRefresh() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopTokenRefresh();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC 处理
ipcMain.handle('auth:login', async (event, { username, password }) => {
  try {
    const result = await authService.login(username, password);
    startTokenRefresh();
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:logout', async () => {
  stopTokenRefresh();
  authService.logout();
  mainWindow.loadFile('renderer/login.html');
  return { success: true };
});

ipcMain.handle('auth:getUser', async () => {
  return authService.getCurrentUser();
});

ipcMain.handle('auth:getToken', async () => {
  try {
    const token = await authService.getToken();
    return { success: true, token };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### 2. Preload 脚本

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 认证 API
  login: (username, password) => 
    ipcRenderer.invoke('auth:login', { username, password }),
  
  logout: () => 
    ipcRenderer.invoke('auth:logout'),
  
  getUser: () => 
    ipcRenderer.invoke('auth:getUser'),
  
  getToken: () => 
    ipcRenderer.invoke('auth:getToken'),

  // Jitsi API
  joinMeeting: (roomName) => 
    ipcRenderer.invoke('jitsi:join', { roomName })
});
```

---

## 会议集成

### 1. Jitsi Meet 集成服务

```javascript
// services/jitsi.js
const authService = require('./auth');

class JitsiService {
  constructor() {
    this.domain = 'meet.cloudmeet.example.com';
    this.api = null;
  }

  /**
   * 加入会议
   */
  async joinMeeting(containerId, roomName) {
    try {
      // 获取 JWT Token
      const token = await authService.getToken();
      const user = authService.getCurrentUser();

      // Jitsi Meet 配置
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: document.querySelector(`#${containerId}`),
        
        // JWT Token
        jwt: token,
        
        configOverwrite: {
          startWithAudioMuted: true,
          startWithVideoMuted: false,
          
          // 显示名称
          displayName: user.displayName,
          
          // 其他配置...
        },
        
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#474747',
          // 其他 UI 配置...
        },
        
        userInfo: {
          email: user.email || '',
          displayName: user.displayName
        }
      };

      // 创建 Jitsi Meet API 实例
      this.api = new JitsiMeetExternalAPI(this.domain, options);

      // 监听事件
      this.setupEventListeners();

      return this.api;
    } catch (error) {
      console.error('Join meeting error:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    if (!this.api) return;

    // 会议准备就绪
    this.api.on('videoConferenceJoined', (e) => {
      console.log('Joined conference:', e);
    });

    // 参与者加入
    this.api.on('participantJoined', (e) => {
      console.log('Participant joined:', e);
    });

    // 参与者离开
    this.api.on('participantLeft', (e) => {
      console.log('Participant left:', e);
    });

    // 会议结束
    this.api.on('videoConferenceLeft', (e) => {
      console.log('Left conference:', e);
      this.dispose();
    });

    // 准备离开
    this.api.on('readyToClose', () => {
      console.log('Ready to close');
      this.dispose();
    });

    // 错误处理
    this.api.on('errorOccurred', (error) => {
      console.error('Jitsi error:', error);
      
      // 如果是认证错误，可能是 Token 过期
      if (error.message && error.message.includes('authentication')) {
        console.error('Authentication error - token may be expired');
        // 触发重新登录
      }
    });
  }

  /**
   * 离开会议
   */
  leaveMeeting() {
    if (this.api) {
      this.api.executeCommand('hangup');
    }
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
  }

  /**
   * 执行命令
   */
  executeCommand(command, ...args) {
    if (this.api) {
      this.api.executeCommand(command, ...args);
    }
  }

  /**
   * 切换音频
   */
  toggleAudio() {
    this.executeCommand('toggleAudio');
  }

  /**
   * 切换视频
   */
  toggleVideo() {
    this.executeCommand('toggleVideo');
  }

  /**
   * 切换屏幕共享
   */
  toggleScreenShare() {
    this.executeCommand('toggleShareScreen');
  }
}

module.exports = new JitsiService();
```

---

## 完整示例

### 1. 登录界面

```html
<!-- renderer/login.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CloudMeet Login</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .login-container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      width: 400px;
    }

    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    button {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s;
    }

    button:hover {
      background: #5568d3;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .error {
      color: #e74c3c;
      font-size: 14px;
      margin-top: 10px;
      text-align: center;
    }

    .loading {
      text-align: center;
      color: #667eea;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>CloudMeet</h1>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="username">用户名</label>
        <input 
          type="text" 
          id="username" 
          name="username" 
          required 
          autocomplete="username"
          placeholder="请输入用户名"
        >
      </div>

      <div class="form-group">
        <label for="password">密码</label>
        <input 
          type="password" 
          id="password" 
          name="password" 
          required 
          autocomplete="current-password"
          placeholder="请输入密码"
        >
      </div>

      <button type="submit" id="loginBtn">登录</button>

      <div id="message"></div>
    </form>
  </div>

  <script src="login.js"></script>
</body>
</html>
```

```javascript
// renderer/login.js
const form = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showError('请输入用户名和密码');
    return;
  }

  // 禁用按钮
  loginBtn.disabled = true;
  showLoading('登录中...');

  try {
    const result = await window.electronAPI.login(username, password);

    if (result.success) {
      // 登录成功，跳转到主界面
      window.location.href = 'main.html';
    } else {
      showError(result.error || '登录失败');
      loginBtn.disabled = false;
    }
  } catch (error) {
    showError('登录失败: ' + error.message);
    loginBtn.disabled = false;
  }
});

function showError(message) {
  messageDiv.className = 'error';
  messageDiv.textContent = message;
}

function showLoading(message) {
  messageDiv.className = 'loading';
  messageDiv.textContent = message;
}
```

### 2. 主界面

```html
<!-- renderer/main.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CloudMeet</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    .header {
      background: #2c3e50;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-name {
      font-weight: 600;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    }

    .btn-logout {
      background: #e74c3c;
      color: white;
    }

    .btn-logout:hover {
      background: #c0392b;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .meeting-controls {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }

    #roomInput {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
    }

    .btn-join {
      background: #27ae60;
      color: white;
      padding: 10px 30px;
    }

    .btn-join:hover {
      background: #229954;
    }

    .btn-leave {
      background: #e74c3c;
      color: white;
      padding: 10px 30px;
    }

    .btn-leave:hover {
      background: #c0392b;
    }

    #jitsiContainer {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
      background: #f5f5f5;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #999;
    }

    .empty-state h2 {
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CloudMeet</h1>
    <div class="user-info">
      <span class="user-name" id="userName"></span>
      <button class="btn btn-logout" id="logoutBtn">退出登录</button>
    </div>
  </div>

  <div class="content">
    <div class="meeting-controls">
      <input 
        type="text" 
        id="roomInput" 
        placeholder="输入会议室名称..."
      >
      <button class="btn btn-join" id="joinBtn">加入会议</button>
      <button class="btn btn-leave" id="leaveBtn" style="display: none;">离开会议</button>
    </div>

    <div id="jitsiContainer">
      <div class="empty-state">
        <h2>欢迎使用 CloudMeet</h2>
        <p>输入会议室名称，点击"加入会议"开始</p>
      </div>
    </div>
  </div>

  <script src="https://meet.cloudmeet.example.com/external_api.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

```javascript
// renderer/main.js
let jitsiAPI = null;

// 加载用户信息
async function loadUser() {
  const user = await window.electronAPI.getUser();
  document.getElementById('userName').textContent = user.displayName;
}

// 加入会议
document.getElementById('joinBtn').addEventListener('click', async () => {
  const roomName = document.getElementById('roomInput').value.trim();
  
  if (!roomName) {
    alert('请输入会议室名称');
    return;
  }

  try {
    // 获取 Token
    const tokenResult = await window.electronAPI.getToken();
    
    if (!tokenResult.success) {
      alert('获取认证信息失败');
      return;
    }

    const token = tokenResult.token;
    const user = await window.electronAPI.getUser();

    // 清空容器
    const container = document.getElementById('jitsiContainer');
    container.innerHTML = '';

    // Jitsi Meet 配置
    const domain = 'meet.cloudmeet.example.com';
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: container,
      jwt: token,
      userInfo: {
        email: user.email || '',
        displayName: user.displayName
      }
    };

    // 创建 Jitsi API
    jitsiAPI = new JitsiMeetExternalAPI(domain, options);

    // 显示/隐藏按钮
    document.getElementById('joinBtn').style.display = 'none';
    document.getElementById('leaveBtn').style.display = 'block';
    document.getElementById('roomInput').disabled = true;

    // 监听事件
    jitsiAPI.on('readyToClose', () => {
      leaveMeeting();
    });

  } catch (error) {
    console.error('Join meeting error:', error);
    alert('加入会议失败: ' + error.message);
  }
});

// 离开会议
document.getElementById('leaveBtn').addEventListener('click', leaveMeeting);

function leaveMeeting() {
  if (jitsiAPI) {
    jitsiAPI.dispose();
    jitsiAPI = null;
  }

  // 恢复 UI
  const container = document.getElementById('jitsiContainer');
  container.innerHTML = `
    <div class="empty-state">
      <h2>欢迎使用 CloudMeet</h2>
      <p>输入会议室名称，点击"加入会议"开始</p>
    </div>
  `;

  document.getElementById('joinBtn').style.display = 'block';
  document.getElementById('leaveBtn').style.display = 'none';
  document.getElementById('roomInput').disabled = false;
  document.getElementById('roomInput').value = '';
}

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (jitsiAPI) {
    leaveMeeting();
  }

  await window.electronAPI.logout();
  window.location.href = 'login.html';
});

// 页面加载时初始化
loadUser();
```

---

## 最佳实践

### 1. 安全存储

```javascript
// ✅ 推荐：使用加密存储
const Store = require('electron-store');
const store = new Store({
  encryptionKey: crypto.randomBytes(32).toString('hex')
});

// ❌ 不推荐：明文存储
localStorage.setItem('token', token);
```

### 2. Token 生命周期管理

```javascript
// ✅ 推荐：自动刷新
async function getToken() {
  const expiresAt = store.get('expiresAt');
  const needsRefresh = Date.now() + 5 * 60 * 1000 >= expiresAt;
  
  if (needsRefresh) {
    return await refreshToken();
  }
  
  return store.get('accessToken');
}

// ❌ 不推荐：等到过期才刷新
if (Date.now() > expiresAt) {
  await refreshToken();
}
```

### 3. 错误处理

```javascript
// ✅ 推荐：完整的错误处理
try {
  const result = await authService.login(username, password);
  return result;
} catch (error) {
  if (error.message.includes('credentials')) {
    showError('用户名或密码错误');
  } else if (error.message.includes('pending')) {
    showError('账户待审核');
  } else {
    showError('登录失败，请稍后重试');
  }
  console.error('Login error:', error);
}
```

### 4. 资源清理

```javascript
// ✅ 推荐：正确清理
app.on('before-quit', () => {
  if (jitsiAPI) {
    jitsiAPI.dispose();
  }
  stopTokenRefresh();
});

// ❌ 不推荐：忘记清理
app.quit();
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-11-25  
**下一步**: [Android 客户端集成指南](ANDROID-INTEGRATION.md)
