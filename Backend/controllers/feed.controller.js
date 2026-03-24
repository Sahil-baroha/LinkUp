import { FeedService } from "../services/feed.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const feedService = new FeedService();

/**
 * GET /feed?cursor=<ISO8601>&limit=10
 *
 * Returns a cursor-paginated, context-enriched stream of posts from
 * the current user's accepted connections.
 */
export const getFeed = asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;
    const result = await feedService.getFeed(req.user.id, cursor, limit);
    return ApiResponse.success(res, result, "Feed fetched successfully");
});
