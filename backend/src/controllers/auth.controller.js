import { authService } from '../services/auth.service.js';
import { ok } from '../utils/response.js';

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json(ok(result));
  },

  async login(req, res) {
    const result = await authService.login(req.body);
    res.json(ok(result));
  },

  async refresh(req, res) {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(ok(result));
  },

  async logout(req, res) {
    // JWT stateless — le client supprime ses tokens en localStorage
    res.json(ok({ message: 'Déconnecté avec succès' }));
  },
};
