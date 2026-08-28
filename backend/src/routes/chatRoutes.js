import { Router } from 'express';
import { body } from 'express-validator';
import { constants } from '../utils/constants.js';
import { validate } from '../middleware/validate.js';
import { sendChat } from '../controllers/chatController.js';

/**
 * Chat routes, mounted under `/api/chat`.
 *
 * @module routes/chatRoutes
 */
const router = Router();

/**
 * Validators for sending one chat turn.
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const chatValidators = [
  body('conversationId').isMongoId().withMessage('Invalid conversation ID'),
  body('content')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: constants.CHAT.MAX_MESSAGE_LENGTH })
    .withMessage(`Message must be ${constants.CHAT.MAX_MESSAGE_LENGTH} characters or fewer`),
  body('reasoningEffort')
    .optional({ values: 'falsy' })
    .isIn(constants.REASONING_LEVELS)
    .withMessage('Invalid reasoning effort'),
];

router.post('/', [...chatValidators, validate], sendChat);

export const chatRoutes = router;