# CloudMeet 架构图集

## 1. 整体架构图（系统全景）

```mermaid
graph TB
    subgraph "客户端层"
        A1[Electron 客户端<br/>桌面端]
        A2[Android 客户端<br/>移动端]
        A3[H5 浏览器<br/>微信/企业微信]
        A4[Web 浏览器<br/>直接访问]
    end

    subgraph "网关层"
        B[Caddy Gateway<br/>HTTPS 反向代理<br/>TLS 终止]
    end

    subgraph "业务服务层"
        C1[jitsi-mgr<br/>用户管理<br/>认证授权]
        C2[app-web<br/>控制面板<br/>会议管理]
        C3[api<br/>业务逻辑<br/>会议 CRUD]
        C4[H5 静态文件<br/>访客入口]
    end

    subgraph "Jitsi 核心层"
        D1[web<br/>Jitsi UI<br/>WebRTC]
        D2[prosody<br/>XMPP 服务器<br/>JWT 验证]
        D3[jicofo<br/>会议控制器<br/>调度]
        D4[jvb<br/>视频桥<br/>SFU 转发]
    end

    subgraph "数据层"
        E1[(PostgreSQL<br/>用户/审核/日志)]
        E2[(Redis<br/>缓存/会话)]
    end

    A1 -->|HTTPS + JWT| B
    A2 -->|HTTPS + JWT| B
    A3 -->|HTTPS 匿名| B
    A4 -->|HTTPS| B

    B -->|/api/mgr/*| C1
    B -->|/cm/*| C2
    B -->|/mapi/*| C3
    B -->|/cm/h5/*| C4
    B -->|/*| D1
    B -->|/xmpp-websocket| D2

    C1 --> E1
    C1 -.JWT 公钥.-> D2

    D2 <-->|XMPP| D3
    D3 <-->|REST| D4
    D1 <-->|WebRTC 信令| D2

    A1 -.媒体流.-> D4
    A2 -.媒体流.-> D4

    style C1 fill:#ff9999
    style B fill:#99ccff
    style D2 fill:#ffcc99
```

## 2. 认证流程图（用户登录）

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as Electron/Android
    participant M as jitsi-mgr
    participant DB as PostgreSQL
    participant P as Prosody
    participant J as Jitsi

    U->>C: 1. 输入用户名/密码
    C->>M: 2. POST /api/mgr/auth/login
    M->>DB: 3. 查询用户
    DB-->>M: 4. 返回用户信息
    M->>M: 5. 验证密码（bcrypt）
    M->>M: 6. 签发 JWT Token (RS256)
    M-->>C: 7. 返回 Token
    C->>C: 8. 存储 Token
    
    Note over C: 用户加入会议
    
    C->>J: 9. 加入会议（携带 JWT）
    J->>P: 10. 转发 JWT
    P->>M: 11. 获取 JWT 公钥
    M-->>P: 12. 返回公钥
    P->>P: 13. 验证 Token 签名
    
    alt Token 有效
        P-->>J: 14. 验证通过
        J-->>C: 15. 进入会议
    else Token 无效
        P-->>J: 16. 验证失败
        J-->>C: 17. 拒绝连接
    end
```

## 3. 注册审核流程图

```mermaid
sequenceDiagram
    participant U as 用户
    participant C as 客户端
    participant M as jitsi-mgr
    participant DB as PostgreSQL
    participant A as 管理员

    U->>C: 1. 填写注册信息
    C->>M: 2. POST /api/mgr/auth/register
    M->>DB: 3. 创建用户记录<br/>status='pending'
    M->>DB: 4. 创建注册申请<br/>status='pending'
    M-->>C: 5. 注册成功，等待审核
    C-->>U: 6. 显示"请等待审核"

    Note over U,A: 等待管理员审核

    A->>M: 7. GET /admin/registrations
    M->>DB: 8. 查询待审核列表
    DB-->>M: 9. 返回申请列表
    M-->>A: 10. 显示申请列表

    alt 批准
        A->>M: 11. POST /registrations/:id/approve
        M->>DB: 12. 更新 status='approved'
        M-->>A: 13. 审核成功
        Note over U: 用户可以登录
    else 拒绝
        A->>M: 14. POST /registrations/:id/reject
        M->>DB: 15. 更新 status='rejected'
        M-->>A: 16. 已拒绝
        Note over U: 用户无法登录
    end
```

## 4. H5 访客流程图

```mermaid
sequenceDiagram
    participant U as 访客
    participant W as 微信浏览器
    participant G as Gateway
    participant H as H5 静态页面
    participant J as Jitsi
    participant P as Prosody

    U->>W: 1. 点击分享链接
    W->>G: 2. GET /cm/h5/?room=123&subject=会议
    G->>H: 3. 返回 H5 页面
    H-->>W: 4. 显示会议界面
    
    U->>W: 5. 输入昵称，点击"加入"
    W->>H: 6. 加载 Jitsi External API
    H->>J: 7. 匿名加入会议（无 JWT）
    J->>P: 8. 请求加入
    
    alt 会议无密码/等候室
        P-->>J: 9. 允许加入
        J-->>W: 10. 进入会议
    else 会议有密码
        P-->>J: 11. 要求输入密码
        J-->>W: 12. 显示密码输入框
        U->>W: 13. 输入密码
        W->>J: 14. 提交密码
        J->>P: 15. 验证密码
        P-->>J: 16. 验证通过
        J-->>W: 17. 进入会议
    end
```

## 5. 服务部署拓扑图

```mermaid
graph TB
    subgraph "公网"
        Internet[互联网用户]
    end

    subgraph "物理服务器 (Ubuntu 22.04, 8C16G)"
        subgraph "Docker Compose 网络: cloudmeet-network"
            GW[gateway<br/>Caddy:8443]
            MGR[jitsi-mgr<br/>Node.js:3000]
            APP[app-web<br/>:3001]
            API[api<br/>:3002]
            WEB[web<br/>Jitsi:80]
            PRO[prosody<br/>XMPP:5222/5280]
            JIC[jicofo<br/>:8888]
            JVB[jvb<br/>UDP:10000]
            DB[(PostgreSQL<br/>:5432)]
        end

        subgraph "持久化卷"
            V1[/data/postgres]
            V2[/data/caddy_data]
            V3[/data/jitsi-mgr]
            V4[/data/prosody]
        end
    end

    Internet -->|HTTPS:8443| GW
    Internet -.UDP:10000.-> JVB

    GW --> MGR
    GW --> APP
    GW --> API
    GW --> WEB
    GW --> PRO

    MGR --> DB
    PRO --> JIC
    JIC --> JVB

    DB --> V1
    GW --> V2
    MGR --> V3
    PRO --> V4

    style GW fill:#99ccff
    style MGR fill:#ff9999
    style DB fill:#ffcc99
```

## 6. 数据库 ER 图

```mermaid
erDiagram
    users ||--o{ registration_requests : has
    users ||--o{ sessions : has
    users ||--o{ audit_logs : performs
    users ||--o{ users : approves

    users {
        int id PK
        string username UK
        string password_hash
        string email UK
        string phone
        string display_name
        string status "pending/approved/rejected/disabled"
        string role "user/admin/superadmin"
        timestamp created_at
        timestamp approved_at
        int approved_by FK
    }

    registration_requests {
        int id PK
        int user_id FK
        text reason
        text additional_info
        string status "pending/approved/rejected"
        int reviewer_id FK
        text review_comment
        timestamp reviewed_at
        timestamp created_at
    }

    sessions {
        int id PK
        int user_id FK
        string token_hash
        string device_type "electron/android"
        text device_info
        string ip_address
        timestamp expires_at
        timestamp created_at
        timestamp last_active_at
    }

    audit_logs {
        int id PK
        int user_id FK
        string action
        string resource_type
        int resource_id
        text details
        string ip_address
        text user_agent
        timestamp created_at
    }
```

## 7. JWT Token 流转图

```mermaid
graph LR
    subgraph "1. Token 生成"
        A1[客户端登录] --> A2[jitsi-mgr 验证]
        A2 --> A3[签发 JWT<br/>私钥 RS256]
        A3 --> A4[返回 Token]
    end

    subgraph "2. Token 存储"
        B1[Electron<br/>electron-store]
        B2[Android<br/>SharedPreferences]
    end

    subgraph "3. Token 使用"
        C1[加入会议] --> C2[携带 JWT]
        C2 --> C3[Prosody 接收]
    end

    subgraph "4. Token 验证"
        D1[Prosody 请求公钥] --> D2[jitsi-mgr<br/>GET /auth/jwks]
        D2 --> D3[返回公钥]
        D3 --> D4[验证签名<br/>exp/iss/aud]
    end

    subgraph "5. 验证结果"
        E1{Token 有效?}
        E2[允许加入会议]
        E3[拒绝连接]
    end

    A4 --> B1
    A4 --> B2
    B1 --> C1
    B2 --> C1
    C3 --> D1
    D4 --> E1
    E1 -->|是| E2
    E1 -->|否| E3

    style A3 fill:#ff9999
    style D4 fill:#99ccff
```

## 8. 权限分层图

```mermaid
graph TB
    subgraph "Layer 4: 超级管理员"
        L4[superadmin<br/>- 管理其他管理员<br/>- 系统配置]
    end

    subgraph "Layer 3: 管理员"
        L3[admin<br/>- 审核注册<br/>- 管理用户<br/>- 查看审计日志]
    end

    subgraph "Layer 2: 注册用户"
        L2[user<br/>- 创建会议<br/>- 加入会议<br/>- 录制会议]
    end

    subgraph "Layer 1: 匿名访客"
        L1[guest<br/>- 加入公开会议<br/>- 有密码/等候室限制]
    end

    L4 -.继承.-> L3
    L3 -.继承.-> L2
    L2 -.部分功能.-> L1

    style L4 fill:#ff6666
    style L3 fill:#ff9999
    style L2 fill:#ffcc99
    style L1 fill:#ffffcc
```

## 9. 路由分发图

```mermaid
graph LR
    A[客户端请求] --> B{Caddy Gateway}

    B -->|/api/mgr/*| C1[jitsi-mgr:3000<br/>用户管理 API]
    B -->|/cm/h5/*| C2[静态文件<br/>H5 访客页面]
    B -->|/cm/desktop<br/>/cm/invite| C3[app-web:3001<br/>控制面板]
    B -->|/mapi/*| C4[api:3002<br/>业务 API]
    B -->|/xmpp-websocket| C5[prosody:5280<br/>XMPP WebSocket]
    B -->|/http-bind| C6[prosody:5280<br/>BOSH]
    B -->|/*| C7[web:80<br/>Jitsi 会议界面]

    style B fill:#99ccff
    style C1 fill:#ff9999
```

## 10. 媒体流向图

```mermaid
graph TB
    subgraph "2人会议 (P2P)"
        P1[参与者 A] <-.P2P 直连.-> P2[参与者 B]
    end

    subgraph "3+ 人会议 (SFU)"
        S1[参与者 A]
        S2[参与者 B]
        S3[参与者 C]
        SFU[jvb<br/>SFU 转发]

        S1 -->|上行音视频| SFU
        S2 -->|上行音视频| SFU
        S3 -->|上行音视频| SFU

        SFU -->|下行: B+C 流| S1
        SFU -->|下行: A+C 流| S2
        SFU -->|下行: A+B 流| S3
    end

    subgraph "信令通道"
        SIG1[所有参与者] <--> SIG2[Prosody XMPP]
        SIG2 <--> SIG3[jicofo]
    end

    style SFU fill:#ffcc99
    style SIG2 fill:#99ccff
```

## 11. 扩展部署拓扑图

```mermaid
graph TB
    subgraph "公网"
        LB[负载均衡器<br/>Nginx/HAProxy]
    end

    subgraph "业务服务集群"
        S1[服务器 1<br/>gateway + jitsi-mgr<br/>+ app-web + api]
        S2[服务器 2<br/>gateway + jitsi-mgr<br/>+ app-web + api]
    end

    subgraph "Jitsi 服务集群"
        S3[服务器 3<br/>web + prosody<br/>+ jicofo + jvb]
        S4[服务器 4<br/>web + prosody<br/>+ jicofo + jvb]
    end

    subgraph "数据库集群"
        DB1[(PostgreSQL<br/>主节点)]
        DB2[(PostgreSQL<br/>从节点)]
    end

    subgraph "缓存层"
        R1[(Redis<br/>主节点)]
        R2[(Redis<br/>从节点)]
    end

    LB --> S1
    LB --> S2
    LB --> S3
    LB --> S4

    S1 --> DB1
    S2 --> DB1
    S1 --> R1
    S2 --> R1

    DB1 -.复制.-> DB2
    R1 -.复制.-> R2

    style LB fill:#99ccff
    style DB1 fill:#ffcc99
```

## 12. 安全边界图

```mermaid
graph TB
    subgraph "公网 (不信任区)"
        Z1[恶意攻击者]
        Z2[Electron 客户端]
        Z3[Android 客户端]
        Z4[H5 浏览器]
    end

    subgraph "信任边界: Gateway"
        TB[Caddy Gateway<br/>- TLS 终止<br/>- Rate Limiting<br/>- DDoS 防护<br/>- JWT 验证]
    end

    subgraph "内部网络 (相对信任区)"
        I1[jitsi-mgr]
        I2[app-web]
        I3[api]
        I4[web]
        I5[prosody]
        I6[jicofo]
        I7[jvb]
    end

    subgraph "数据库 (高度信任区)"
        D1[(PostgreSQL)]
    end

    Z1 -.攻击.-> TB
    Z2 -->|HTTPS + JWT| TB
    Z3 -->|HTTPS + JWT| TB
    Z4 -->|HTTPS| TB

    TB --> I1
    TB --> I2
    TB --> I3
    TB --> I4
    TB --> I5

    I1 --> D1
    I5 <--> I6
    I6 <--> I7

    style Z1 fill:#ff6666
    style TB fill:#ffcc99
    style D1 fill:#99ff99
```

---

## 使用说明

### 在线渲染

这些 Mermaid 图可以在以下平台渲染：
- GitHub/GitLab（原生支持）
- VS Code（安装 Mermaid 插件）
- 在线工具：https://mermaid.live/

### 导出 PNG/SVG

```bash
# 安装 mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# 导出 PNG
mmdc -i diagrams.md -o architecture.png

# 导出 SVG
mmdc -i diagrams.md -o architecture.svg
```

### 编辑建议

- 使用 VS Code + Mermaid Preview 插件实时预览
- 调整 `style` 语句自定义颜色
- 添加 `subgraph` 分组相关节点

---

**文档维护**：
- 创建日期：2026-11-25
- 图表总数：12 张
- 格式：Mermaid
- 覆盖范围：架构、流程、部署、数据
