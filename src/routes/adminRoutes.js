import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// 所有管理员路由需要认证和 admin 角色
router.use(authenticate);
router.use(requireRole('admin', 'superadmin'));

// 注册申请管理
router.get('/registrations', adminController.getRegistrations);
router.get('/registrations/:id', adminController.getRegistrationById);
router.post('/registrations/:id/approve', adminController.approveRegistration);
router.post('/registrations/:id/reject', adminController.rejectRegistration);

// 用户管理
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users/:id/disable', adminController.disableUser);
router.post('/users/:id/enable', adminController.enableUser);

// 审计日志
router.get('/audit-logs', adminController.getAuditLogs);

export default router;
