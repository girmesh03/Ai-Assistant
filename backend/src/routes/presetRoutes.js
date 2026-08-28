import { Router } from 'express';
import { body, param } from 'express-validator';
import { constants } from '../utils/constants.js';
import { paginationValidators } from '../utils/pagination.js';
import { validate } from '../middleware/validate.js';
import {
  createPreset,
  deletePreset,
  listPresets,
  updatePreset,
} from '../controllers/presetController.js';

/**
 * Preset CRUD routes, mounted under `/api/presets`.
 *
 * @module routes/presetRoutes
 */
const router = Router();

/**
 * Validators for creating a preset.
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const createPresetValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 120 })
    .withMessage('Name must be 120 characters or fewer'),
  body('prompt').trim().notEmpty().withMessage('Prompt is required'),
  body('modelProviderId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model provider must be 100 characters or fewer'),
  body('modelId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Model ID must be 200 characters or fewer'),
  body('reasoningEffort')
    .optional({ values: 'falsy' })
    .isIn(constants.REASONING_LEVELS)
    .withMessage('Invalid reasoning effort'),
];

/**
 * Validators for updating a preset (PATCH allows a partial subset).
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const updatePresetValidators = [
  param('id').isMongoId().withMessage('Invalid preset ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Name must be 120 characters or fewer'),
  body('prompt').optional().trim().notEmpty().withMessage('Prompt cannot be empty'),
  body('modelProviderId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model provider must be 100 characters or fewer'),
  body('modelId')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Model ID must be 200 characters or fewer'),
  body('reasoningEffort')
    .optional({ values: 'falsy' })
    .isIn(constants.REASONING_LEVELS)
    .withMessage('Invalid reasoning effort'),
];

router.get('/', [...paginationValidators, validate], listPresets);
router.post('/', [...createPresetValidators, validate], createPreset);
router.patch('/:id', [...updatePresetValidators, validate], updatePreset);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid preset ID'), validate], deletePreset);

export const presetRoutes = router;