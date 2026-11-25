import db from '../config/database.js';

class AdminService {
  // 获取注册申请列表
  async getRegistrations(filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        rr.id,
        rr.user_id,
        rr.reason,
        rr.status,
        rr.review_comment,
        rr.reviewed_at,
        rr.created_at,
        u.username,
        u.email,
        u.phone,
        u.display_name,
        reviewer.username as reviewer_username
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      LEFT JOIN users reviewer ON rr.reviewer_id = reviewer.id
    `;

    const params = [];

    if (status) {
      sql += ' WHERE rr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY rr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const registrations = await db.all(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM registration_requests';
    const countParams = [];

    if (status) {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult = await db.get(countSql, countParams);

    return {
      data: registrations,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // 获取单个注册申请详情
  async getRegistrationById(id) {
    const registration = await db.get(
      `SELECT 
        rr.*,
        u.username,
        u.email,
        u.phone,
        u.display_name,
        u.created_at as user_created_at,
        reviewer.username as reviewer_username,
        reviewer.display_name as reviewer_display_name
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      LEFT JOIN users reviewer ON rr.reviewer_id = reviewer.id
      WHERE rr.id = ?`,
      [id]
    );

    if (!registration) {
      throw new Error('Registration request not found');
    }

    return registration;
  }

  // 批准注册
  async approveRegistration(id, reviewerId, comment = '') {
    const registration = await this.getRegistrationById(id);

    if (registration.status !== 'pending') {
      throw new Error('Registration request is not pending');
    }

    // 更新注册申请状态
    await db.run(
      `UPDATE registration_requests 
       SET status = 'approved', 
           reviewer_id = ?, 
           review_comment = ?, 
           reviewed_at = datetime('now')
       WHERE id = ?`,
      [reviewerId, comment, id]
    );

    // 更新用户状态
    await db.run(
      `UPDATE users 
       SET status = 'approved', 
           approved_at = datetime('now'), 
           approved_by = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [reviewerId, registration.user_id]
    );

    // 记录审计日志
    await this.createAuditLog({
      userId: reviewerId,
      action: 'approve_registration',
      resourceType: 'registration_request',
      resourceId: id,
      details: JSON.stringify({
        targetUserId: registration.user_id,
        targetUsername: registration.username,
        comment
      })
    });

    return {
      message: 'Registration approved successfully',
      userId: registration.user_id,
      username: registration.username
    };
  }

  // 拒绝注册
  async rejectRegistration(id, reviewerId, reason, comment = '') {
    const registration = await this.getRegistrationById(id);

    if (registration.status !== 'pending') {
      throw new Error('Registration request is not pending');
    }

    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    // 更新注册申请状态
    await db.run(
      `UPDATE registration_requests 
       SET status = 'rejected', 
           reviewer_id = ?, 
           review_comment = ?, 
           reviewed_at = datetime('now')
       WHERE id = ?`,
      [reviewerId, `${reason}. ${comment}`.trim(), id]
    );

    // 更新用户状态
    await db.run(
      `UPDATE users 
       SET status = 'rejected',
           updated_at = datetime('now')
       WHERE id = ?`,
      [registration.user_id]
    );

    // 记录审计日志
    await this.createAuditLog({
      userId: reviewerId,
      action: 'reject_registration',
      resourceType: 'registration_request',
      resourceId: id,
      details: JSON.stringify({
        targetUserId: registration.user_id,
        targetUsername: registration.username,
        reason,
        comment
      })
    });

    return {
      message: 'Registration rejected',
      userId: registration.user_id,
      username: registration.username
    };
  }

  // 获取用户列表
  async getUsers(filters = {}) {
    const { status, role, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
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
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      sql += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const users = await db.all(sql, params);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    if (role) {
      countSql += ' AND role = ?';
      countParams.push(role);
    }

    if (search) {
      countSql += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await db.get(countSql, countParams);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // 获取用户详情
  async getUserById(id) {
    const user = await db.get(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.display_name,
        u.status,
        u.role,
        u.created_at,
        u.updated_at,
        u.approved_at,
        approver.username as approved_by_username,
        approver.display_name as approved_by_display_name
      FROM users u
      LEFT JOIN users approver ON u.approved_by = approver.id
      WHERE u.id = ?`,
      [id]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // 获取用户的会话数量
    const sessionCount = await db.get(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")',
      [id]
    );

    user.activeSessions = sessionCount.count;

    return user;
  }

  // 禁用用户
  async disableUser(id, adminId, reason) {
    const user = await this.getUserById(id);

    if (user.status === 'disabled') {
      throw new Error('User is already disabled');
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      throw new Error('Cannot disable admin users through this API');
    }

    await db.run(
      `UPDATE users 
       SET status = 'disabled', 
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );

    // 记录审计日志
    await this.createAuditLog({
      userId: adminId,
      action: 'disable_user',
      resourceType: 'user',
      resourceId: id,
      details: JSON.stringify({
        targetUsername: user.username,
        reason
      })
    });

    return {
      message: 'User disabled successfully',
      userId: id,
      username: user.username
    };
  }

  // 启用用户
  async enableUser(id, adminId) {
    const user = await this.getUserById(id);

    if (user.status === 'approved') {
      throw new Error('User is already enabled');
    }

    if (user.status === 'pending') {
      throw new Error('User registration is still pending approval');
    }

    await db.run(
      `UPDATE users 
       SET status = 'approved', 
           updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );

    // 记录审计日志
    await this.createAuditLog({
      userId: adminId,
      action: 'enable_user',
      resourceType: 'user',
      resourceId: id,
      details: JSON.stringify({
        targetUsername: user.username
      })
    });

    return {
      message: 'User enabled successfully',
      userId: id,
      username: user.username
    };
  }

  // 获取审计日志
  async getAuditLogs(filters = {}) {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.details,
        al.ip_address,
        al.created_at,
        u.username,
        u.display_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      sql += ' AND al.user_id = ?';
      params.push(userId);
    }

    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }

    if (startDate) {
      sql += ' AND al.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND al.created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = await db.all(sql, params);

    // 解析 details JSON
    logs.forEach(log => {
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];

    if (userId) {
      countSql += ' AND user_id = ?';
      countParams.push(userId);
    }

    if (action) {
      countSql += ' AND action = ?';
      countParams.push(action);
    }

    if (startDate) {
      countSql += ' AND created_at >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ' AND created_at <= ?';
      countParams.push(endDate);
    }

    const countResult = await db.get(countSql, countParams);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // 创建审计日志
  async createAuditLog({ userId, action, resourceType, resourceId, details, ipAddress = null, userAgent = null }) {
    await db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId, action, resourceType, resourceId, details, ipAddress, userAgent]
    );
  }
}

export default new AdminService();
