import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/index.js';
import db from './config/database.js';
import authService from './services/authService.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// 信任代理（如果在 Caddy 后面）
if (config.server.trustProxy) {
  app.set('trust proxy', 1);
}

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// 健康检查端点（无需认证）
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jitsi-mgr',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: db.db ? 'connected' : 'disconnected',
      jwt: authService.publicKey ? 'valid' : 'invalid'
    }
  });
});

// API 路由
app.use('/api/mgr/v1/auth', authRoutes);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 初始化
async function initialize() {
  try {
    console.log('Initializing jitsi-mgr...');
    
    // 连接数据库
    await db.connect();
    
    // 加载 JWT 密钥
    await authService.initialize();
    
    console.log('Initialization complete');
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

// 启动服务器
async function start() {
  await initialize();
  
  app.listen(config.server.port, config.server.host, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   CloudMeet User Management Service (jitsi-mgr)        ║
║                                                        ║
║   Status:   Running                                    ║
║   Port:     ${config.server.port}                                     ║
║   Host:     ${config.server.host}                               ║
║   Database: ${config.database.type}                                   ║
║   Env:      ${process.env.NODE_ENV || 'development'}                              ║
║                                                        ║
║   API Base: http://${config.server.host}:${config.server.port}/api/mgr/v1       ║
║   Health:   http://${config.server.host}:${config.server.port}/health           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
  });
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

// 启动
start();

export default app;
