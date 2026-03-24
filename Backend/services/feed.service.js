import { FeedRepository } from "../repositories/feed.repository.js";

const feedRepo = new FeedRepository();

export class FeedService {

    /**
     * GET /feed
     *
     * Responsibilities:
     * - Parse and normalize cursor (string → Date, default = now)
     * - Delegate all DB orchestration to FeedRepository
     * - Return the enriched, paginated feed payload
     *
     * The empty-connections short-circuit lives in FeedRepository — it is a
     * data concern (no rows to fetch), not a business rule violation.
     *
     * @param {string}          userId  - Current user's ID from req.user.id
     * @param {string|undefined} cursor - ISO 8601 cursor string from query param
     * @param {number}          limit   - Validated limit from query param (1–50)
     */
    async getFeed(userId, cursor, limit) {
        // Normalize cursor: undefined → now, string → Date
        const cursorDate = cursor ? new Date(cursor) : new Date();

        return await feedRepo.getFeed(userId, cursorDate, limit);
    }
}
