import { fail } from '../utils/response.js';

export function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Erreurs Prisma
  if (err.code === 'P2025') return res.status(404).json(fail('Ressource introuvable'));
  if (err.code === 'P2002') return res.status(409).json(fail('Cette valeur existe déjà'));
  if (err.code === 'P2003') return res.status(400).json(fail('Référence invalide'));

  // Erreurs applicatives (avec .status)
  if (err.status && err.status < 500) {
    return res.status(err.status).json(fail(err.message));
  }

  // Erreur interne
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur interne';
  res.status(500).json(fail(message));
}
