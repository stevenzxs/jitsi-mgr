import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 所有用户路由需要认证
router.use(authenticate);

// 当前用户信息
router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);

// 密码管理
router.post('/me/change-password', userController.changePassword);

// 会话管理
router.get('/me/sessions', userController.getSessions);
router.delete('/me/sessions/:id', userController.revokeSession);
router.delete('/me/sessions', userController.revokeAllSessions);

export default router;
