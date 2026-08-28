import { Router } from 'express';
import { listAvailableModels } from '../controllers/metaController.js';

/**
 * Metadata routes, mounted under `/api/meta`.
 *
 * @module routes/metaRoutes
 */
const router = Router();

router.get('/models', listAvailableModels);

export const metaRoutes = router;