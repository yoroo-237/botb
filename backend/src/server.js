import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import router from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// CORS
app.use(cors({
  origin:      env.frontendUrl,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhooks Alchemy — raw body requis pour vérification HMAC
app.use('/api/webhooks/alchemy', express.raw({ type: 'application/json' }));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les uploads statiquement
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes API
app.use('/api', router);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

// Gestionnaire d'erreurs global
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`BOTB backend démarré sur le port ${env.port} [${env.nodeEnv}]`);
});

export default app;
