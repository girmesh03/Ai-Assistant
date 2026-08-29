import expressAsyncHandler from 'express-async-handler';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';
import { buildPaginationPayload, resolveLimit, resolvePage } from '../utils/pagination.js';

/**
 * Lists a conversation's messages, paginated, oldest-first by default. The
 * client chat adapter pages older pages on scroll-to-top via `hasMore`; it
 * may request `sort=desc` to load the newest page first (backward paging).
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>}
 */
export const listMessages = expressAsyncHandler(async (req, res) => {
  const conversation = await Conversation.exists({ _id: req.params.id });

  if (!conversation) {
    throw new AppError('Conversation not found', httpStatus.NOT_FOUND);
  }

  const page = resolvePage(req.query.page);
  const limit = resolveLimit(req.query.limit);
  const sortDirection = req.query.sort === 'desc' ? -1 : 1;

  const result = await Message.paginate(
    { conversationId: req.params.id },
    { page, limit, sort: { createdAt: sortDirection } }
  );

  res.json({
    success: true,
    message: 'Messages fetched',
    data: buildPaginationPayload(result),
  });
});