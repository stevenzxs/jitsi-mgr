import userService from '../services/userService.js';

// 获取当前用户信息
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userService.getCurrentUser(req.user.id);

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// 更新用户信息
export const updateCurrentUser = async (req, res, next) => {
  try {
    const { email, phone, displayName } = req.body;

    const user = await userService.updateUser(req.user.id, {
      email,
      phone,
      displayName
    });

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('already in use')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'RESOURCE_ALREADY_EXISTS',
          message: err.message
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

// 修改密码
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Old password and new password are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await userService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('Invalid old password')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid old password'
        },
        timestamp: new Date().toISOString()
      });
    }
    if (err.message.includes('at least')) {
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

// 获取会话列表
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await userService.getUserSessions(req.user.id);

    res.json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

// 注销指定会话
export const revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await userService.revokeSession(req.user.id, parseInt(id));

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
    next(err);
  }
};

// 注销所有会话
export const revokeAllSessions = async (req, res, next) => {
  try {
    const result = await userService.revokeAllSessions(req.user.id);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};
