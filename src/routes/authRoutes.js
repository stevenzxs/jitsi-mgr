import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const router = Router();

// Rate limiters
const registerLimiter = rateLimit({
  windowMs: config.rateLimit.register.windowMs,
  max: config.rateLimit.register.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts, please try again later'
    }
  }
});

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later'
    }
  }
});

// 公开端点
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.get('/jwks', authController.getJWKS);
router.get('/status', authController.getStatus);

export default router;
