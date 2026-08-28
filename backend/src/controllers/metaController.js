import expressAsyncHandler from 'express-async-handler';
import { providerCatalog } from '../services/providerCatalog.js';

/**
 * Lists the AI models available to the client. Only providers whose API key
 * is configured appear here — the picker never offers a provider that would
 * fail at chat time.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const listAvailableModels = expressAsyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Available AI models',
    data: providerCatalog.getAvailableModels(),
  });
});