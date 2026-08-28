import { Router } from 'express';
import { body, param } from 'express-validator';
import { constants } from '../utils/constants.js';
import { paginationValidators } from '../utils/pagination.js';
import { validate } from '../middleware/validate.js';
import {
  createConversation,
  deleteConversation,
  listConversations,
  updateConversation,
} from '../controllers/conversationController.js';

/**
 * Conversation CRUD routes, mounted under `/api/conversations`.
 *
 * @module routes/conversationRoutes
 */
const router = Router();

/**
 * Validators for creating a conversation.
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const createConversationValidators = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be 200 characters or fewer'),
  body('modelProviderId')
    .trim()
    .notEmpty()
    .withMessage('Model provider is required')
    .isLength({ max: 100 })
    .withMessage('Model provider must be 100 characters or fewer'),
  body('modelId')
    .trim()
    .notEmpty()
    .withMessage('Model ID is required')
    .isLength({ max: 200 })
    .withMessage('Model ID must be 200 characters or fewer'),
  body('reasoningEffort')
    .optional({ values: 'falsy' })
    .isIn(constants.REASONING_LEVELS)
    .withMessage('Invalid reasoning effort'),
  body('language').optional({ values: 'falsy' }).isIn(constants.LANGUAGES).withMessage('Invalid language'),
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: constants.CHAT.SYSTEM_PROMPT_MAX_LENGTH })
    .withMessage(`System prompt must be ${constants.CHAT.SYSTEM_PROMPT_MAX_LENGTH} characters or fewer`),
  body('persona')
    .optional()
    .trim()
    .isLength({ max: constants.CHAT.PERSONA_MAX_LENGTH })
    .withMessage(`Persona must be ${constants.CHAT.PERSONA_MAX_LENGTH} characters or fewer`),
  body('presetId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid preset ID'),
];

/**
 * Validators for updating a conversation (PATCH allows a partial subset).
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const updateConversationValidators = [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title must be 200 characters or fewer'),
  body('modelProviderId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Model provider cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Model provider must be 100 characters or fewer'),
  body('modelId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Model ID cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Model ID must be 200 characters or fewer'),
  body('reasoningEffort')
    .optional({ values: 'falsy' })
    .isIn(constants.REASONING_LEVELS)
    .withMessage('Invalid reasoning effort'),
  body('language').optional({ values: 'falsy' }).isIn(constants.LANGUAGES).withMessage('Invalid language'),
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: constants.CHAT.SYSTEM_PROMPT_MAX_LENGTH })
    .withMessage(`System prompt must be ${constants.CHAT.SYSTEM_PROMPT_MAX_LENGTH} characters or fewer`),
  body('persona')
    .optional()
    .trim()
    .isLength({ max: constants.CHAT.PERSONA_MAX_LENGTH })
    .withMessage(`Persona must be ${constants.CHAT.PERSONA_MAX_LENGTH} characters or fewer`),
  body('presetId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid preset ID'),
];

router.get('/', [...paginationValidators, validate], listConversations);
router.post('/', [...createConversationValidators, validate], createConversation);
router.patch('/:id', [...updateConversationValidators, validate], updateConversation);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid conversation ID'), validate], deleteConversation);

export const conversationRoutes = router;