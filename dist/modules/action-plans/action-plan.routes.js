"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const action_plan_controller_1 = require("./action-plan.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/:id', auth_middleware_1.authenticate, action_plan_controller_1.ActionPlanController.getById);
router.patch('/:id', auth_middleware_1.authenticate, action_plan_controller_1.ActionPlanController.updateStatus);
exports.default = router;
