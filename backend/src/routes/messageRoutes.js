import { Router } from 'express';
import { param, query } from 'express-validator';
import { paginationValidators } from '../utils/pagination.js';
import { validate } from '../middleware/validate.js';
import { listMessages } from '../controllers/messageController.js';

/**
 * Message read routes, mounted under `/api/conversations` so the nested URL
 * `GET /api/conversations/:id/messages` resolves here.
 *
 * @module routes/messageRoutes
 */
const router = Router();

router.get(
  '/:id/messages',
  [
    param('id').isMongoId().withMessage('Invalid conversation ID'),
    query('sort').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
    ...paginationValidators,
    validate,
  ],
  listMessages
);

export const messageRoutes = router;