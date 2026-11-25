import { Router } from 'express';
import { StudentsController } from './students.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';
import { checkStudentScope } from '../../middlewares/scope.middleware';

const router = Router();

// Endpoint Mahasiswa me
router.get('/me/risk', authenticate, requireRoles('MAHASISWA'), StudentsController.getMeRisk);

// Endpoint Advisees untuk Dosen Wali & Dosbing TA
router.get('/advisees', authenticate, requireRoles('DOSEN_WALI', 'DOSBING_TA'), StudentsController.getAdvisees);

// Endpoint Mahasiswa berdasarkan ID (NIM) dengan validasi scoping RBAC (BRL-13)
router.get('/:id/risk', authenticate, checkStudentScope, StudentsController.getStudentRisk);
router.get('/:id/milestones', authenticate, checkStudentScope, StudentsController.getStudentMilestones);
router.post(
  '/:id/counseling',
  authenticate,
  requireRoles('DOSEN_WALI', 'DOSBING_TA'),
  checkStudentScope,
  StudentsController.createCounseling
);

export default router;
