import authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const { username, password, email, phone, displayName, reason } = req.body;

    // 验证必填字段
    if (!username || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username, password and displayName are required'
        }
      });
    }

    // 密码复杂度验证
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters'
        }
      });
    }

    const result = await authService.register({
      username,
      password,
      email,
      phone,
      displayName,
      reason
    });

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { username, password, deviceType } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        }
      });
    }

    const result = await authService.login(username, password, deviceType);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('credentials') || err.message.includes('Invalid')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: '用户名或密码错误'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    if (err.message.includes('pending')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_PENDING',
          message: '账户待审核'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (err.message.includes('rejected')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_REJECTED',
          message: '账户已被拒绝'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (err.message.includes('disabled')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_ACCOUNT_DISABLED',
          message: '账户已被禁用'
        },
        timestamp: new Date().toISOString()
      });
    }

    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    if (err.message.includes('token')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid refresh token'
        },
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  }
};

export const getJWKS = async (req, res, next) => {
  try {
    const jwks = authService.getPublicKeyJWKS();
    res.json(jwks);
  } catch (err) {
    next(err);
  }
};

export const getStatus = async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jitsi-mgr',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
};
