"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const students_controller_1 = require("./students.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const scope_middleware_1 = require("../../middlewares/scope.middleware");
const router = (0, express_1.Router)();
// Endpoint Mahasiswa me
router.get('/me/risk', auth_middleware_1.authenticate, (0, role_middleware_1.requireRoles)('MAHASISWA'), students_controller_1.StudentsController.getMeRisk);
// Endpoint Advisees untuk Dosen Wali & Dosbing TA
router.get('/advisees', auth_middleware_1.authenticate, (0, role_middleware_1.requireRoles)('DOSEN_WALI', 'DOSBING_TA'), students_controller_1.StudentsController.getAdvisees);
// Endpoint Mahasiswa berdasarkan ID (NIM) dengan validasi scoping RBAC (BRL-13)
router.get('/:id/risk', auth_middleware_1.authenticate, scope_middleware_1.checkStudentScope, students_controller_1.StudentsController.getStudentRisk);
router.get('/:id/milestones', auth_middleware_1.authenticate, scope_middleware_1.checkStudentScope, students_controller_1.StudentsController.getStudentMilestones);
router.post('/:id/counseling', auth_middleware_1.authenticate, (0, role_middleware_1.requireRoles)('DOSEN_WALI', 'DOSBING_TA'), scope_middleware_1.checkStudentScope, students_controller_1.StudentsController.createCounseling);
exports.default = router;
