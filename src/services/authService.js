import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFile } from 'fs/promises';
import config from '../config/index.js';
import db from '../config/database.js';

class AuthService {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
  }

  async initialize() {
    // 加载 JWT 密钥
    try {
      this.privateKey = await readFile(config.jwt.privateKeyPath, 'utf8');
      this.publicKey = await readFile(config.jwt.publicKeyPath, 'utf8');
      console.log('JWT keys loaded successfully');
    } catch (err) {
      console.error('Failed to load JWT keys:', err.message);
      throw new Error('JWT keys not found. Please run initialization script first.');
    }
  }

  // 密码哈希
  async hashPassword(password) {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  // 验证密码
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // 生成 Access Token
  generateAccessToken(user) {
    const payload = {
      sub: user.id.toString(),
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      iss: config.jwt.issuer,
      aud: config.jwt.audience
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.accessTokenExpiry
    });
  }

  // 生成 Refresh Token
  generateRefreshToken(user) {
    const payload = {
      sub: user.id.toString(),
      type: 'refresh',
      iss: config.jwt.issuer
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: config.jwt.algorithm,
      expiresIn: config.jwt.refreshTokenExpiry
    });
  }

  // 验证 Token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer
      });
    } catch (err) {
      throw new Error(`Token verification failed: ${err.message}`);
    }
  }

  // 获取公钥（JWKS 格式）
  getPublicKeyJWKS() {
    const jwk = this.publicKeyToJWK(this.publicKey);
    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: '2026-11',
          alg: 'RS256',
          ...jwk
        }
      ]
    };
  }

  // 将 PEM 公钥转换为 JWK 格式（简化版）
  publicKeyToJWK(publicKeyPEM) {
    // 注意：这是简化实现，生产环境建议使用 node-jose 等库
    // 这里返回基本结构，实际的 n 和 e 需要从 PEM 解析
    return {
      n: 'PLACEHOLDER_MODULUS',  // 需要实际解析 PEM
      e: 'AQAB'  // 通常是 65537
    };
  }

  // 用户注册
  async register(userData) {
    const { username, password, email, phone, displayName, reason } = userData;

    // 检查用户名是否已存在
    const existingUser = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await db.get(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    // 哈希密码
    const passwordHash = await this.hashPassword(password);

    // 创建用户
    const userResult = await db.run(
      `INSERT INTO users (username, password_hash, email, phone, display_name, status, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 'user', datetime('now'), datetime('now'))`,
      [username, passwordHash, email, phone, displayName]
    );

    const userId = userResult.lastID;

    // 创建注册申请
    await db.run(
      `INSERT INTO registration_requests (user_id, reason, status, created_at)
       VALUES (?, ?, 'pending', datetime('now'))`,
      [userId, reason]
    );

    return {
      userId,
      status: 'pending',
      message: '注册申请已提交，请等待管理员审核'
    };
  }

  // 用户登录
  async login(username, password, deviceType) {
    // 查询用户
    const user = await db.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 检查用户状态
    if (user.status === 'pending') {
      throw new Error('Account pending approval');
    }
    if (user.status === 'rejected') {
      throw new Error('Account has been rejected');
    }
    if (user.status === 'disabled') {
      throw new Error('Account has been disabled');
    }

    // 验证密码
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // 生成 Token
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 记录会话
    const tokenHash = await this.hashPassword(accessToken);
    await db.run(
      `INSERT INTO sessions (user_id, token_hash, device_type, ip_address, expires_at, created_at, last_active_at)
       VALUES (?, ?, ?, ?, datetime('now', '+2 hours'), datetime('now'), datetime('now'))`,
      [user.id, tokenHash, deviceType, null]  // IP 由中间件填充
    );

    return {
      token: accessToken,
      refreshToken,
      expiresIn: 7200,  // 2 小时
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role
      }
    };
  }

  // 刷新 Token
  async refreshToken(refreshToken) {
    const decoded = this.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const user = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [decoded.sub]
    );

    if (!user || user.status !== 'approved') {
      throw new Error('User not found or not approved');
    }

    const newAccessToken = this.generateAccessToken(user);

    return {
      token: newAccessToken,
      expiresIn: 7200
    };
  }
}

export default new AuthService();
