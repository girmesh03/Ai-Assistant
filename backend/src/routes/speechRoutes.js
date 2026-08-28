import { Router } from 'express';
import { body } from 'express-validator';
import { constants } from '../utils/constants.js';
import { validate } from '../middleware/validate.js';
import { uploadAudio } from '../middleware/upload.js';
import { transcribe } from '../controllers/speechController.js';

/**
 * Speech routes, mounted under `/api/speech`.
 *
 * @module routes/speechRoutes
 */
const router = Router();

/**
 * Validators for a transcription request (multipart: `audio` file + optional
 * `language` field).
 *
 * @type {ReadonlyArray<import('express-validator').ValidationChain>}
 */
const transcribeValidators = [
  body('language').optional({ values: 'falsy' }).isIn(constants.LANGUAGES).withMessage('Invalid language'),
];

router.post('/transcribe', uploadAudio, [...transcribeValidators, validate], transcribe);

export const speechRoutes = router;