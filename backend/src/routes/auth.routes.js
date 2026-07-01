import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';

const r = Router();

r.post('/register', authController.register);
r.post('/login',    authController.login);
r.post('/refresh',  authController.refresh);
r.post('/logout',   authController.logout);

export default r;
