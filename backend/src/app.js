import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

/**
 * The Express application: CORS, JSON parsing, dev request logging, the
 * health-check route, and the 404 + error-handling chain.
 *
 * @type {import('express').Express}
 */
export const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

/**
 * Health-check handler for `GET /`.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {void}
 */
const healthHandler = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ai-Assistant API',
    data: { name: 'ai-assistant-backend', version: '0.1.0' },
  });
};

app.get('/', healthHandler);

app.use(notFound);
app.use(errorHandler);