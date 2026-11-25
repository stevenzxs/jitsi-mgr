import adminService from '../services/adminService.js';

// 获取注册申请列表
export const getRegistrations = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    const result = await adminService.getRegistrations({
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// 获取单个注册申请详情
export const getRegistrationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const registration = await adminService.getRegistrationById(parseInt(id));

    res.json({
      success: true,
      data: registration,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 批准注册
export const approveRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const result = await adminService.approveRegistration(
      parseInt(id),
      req.user.id,
      comment
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    if (err.message.includes('not pending')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 拒绝注册
export const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection reason is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await adminService.rejectRegistration(
      parseInt(id),
      req.user.id,
      reason,
      comment
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    if (err.message.includes('not pending')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 获取用户列表
export const getUsers = async (req, res, next) => {
  try {
    const { status, role, search, page, limit } = req.query;

    const result = await adminService.getUsers({
      status,
      role,
      search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// 获取用户详情
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await adminService.getUserById(parseInt(id));

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 禁用用户
export const disableUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reason is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await adminService.disableUser(
      parseInt(id),
      req.user.id,
      reason
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    if (err.message.includes('already disabled') || err.message.includes('Cannot disable')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 启用用户
export const enableUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await adminService.enableUser(
      parseInt(id),
      req.user.id
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    if (err.message.includes('already enabled') || err.message.includes('pending')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 获取审计日志
export const getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, startDate, endDate, page, limit } = req.query;

    const result = await adminService.getAuditLogs({
      userId: userId ? parseInt(userId) : undefined,
      action,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};
