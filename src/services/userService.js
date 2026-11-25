import db from '../config/database.js';
import authService from './authService.js';

class UserService {
  // 获取当前用户信息
  async getCurrentUser(userId) {
    const user = await db.get(
      `SELECT 
        id,
        username,
        email,
        phone,
        display_name,
        status,
        role,
        created_at,
        approved_at
      FROM users
      WHERE id = ?`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // 更新用户信息
  async updateUser(userId, updates) {
    const { email, phone, displayName } = updates;

    // 检查邮箱是否已被其他用户使用
    if (email) {
      const existingEmail = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (existingEmail) {
        throw new Error('Email already in use');
      }
    }

    const fields = [];
    const params = [];

    if (email !== undefined) {
      fields.push('email = ?');
      params.push(email);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      params.push(phone);
    }
    if (displayName !== undefined) {
      fields.push('display_name = ?');
      params.push(displayName);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = datetime("now")');
    params.push(userId);

    await db.run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return this.getCurrentUser(userId);
  }

  // 修改密码
  async changePassword(userId, oldPassword, newPassword) {
    const user = await db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // 验证旧密码
    const isValidPassword = await authService.verifyPassword(oldPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid old password');
    }

    // 验证新密码复杂度
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // 哈希新密码
    const newPasswordHash = await authService.hashPassword(newPassword);

    // 更新密码
    await db.run(
      `UPDATE users 
       SET password_hash = ?, 
           updated_at = datetime('now')
       WHERE id = ?`,
      [newPasswordHash, userId]
    );

    return { message: 'Password changed successfully' };
  }

  // 获取用户的会话列表
  async getUserSessions(userId) {
    const sessions = await db.all(
      `SELECT 
        id,
        device_type,
        device_info,
        ip_address,
        created_at,
        last_active_at,
        expires_at
      FROM sessions
      WHERE user_id = ? AND expires_at > datetime('now')
      ORDER BY last_active_at DESC`,
      [userId]
    );

    return sessions;
  }

  // 注销指定会话
  async revokeSession(userId, sessionId) {
    const session = await db.get(
      'SELECT id FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      throw new Error('Session not found');
    }

    await db.run(
      'DELETE FROM sessions WHERE id = ?',
      [sessionId]
    );

    return { message: 'Session revoked successfully' };
  }

  // 注销所有会话（除了当前会话）
  async revokeAllSessions(userId, currentSessionId = null) {
    let sql = 'DELETE FROM sessions WHERE user_id = ?';
    const params = [userId];

    if (currentSessionId) {
      sql += ' AND id != ?';
      params.push(currentSessionId);
    }

    const result = await db.run(sql, params);

    return {
      message: 'All sessions revoked successfully',
      count: result.changes
    };
  }
}

export default new UserService();
