import { ConnectionService } from "../services/connection.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const connectionService = new ConnectionService();

/**
 * GET /connections
 * Returns all accepted connections for the authenticated user.
 */
export const getMyConnections = asyncHandler(async (req, res) => {
    const connections = await connectionService.getMyConnections(req.user.id);
    return ApiResponse.success(res, connections, "Connections fetched successfully");
});

/**
 * GET /connections/requests
 * Returns all incoming pending connection requests.
 */
export const getIncomingRequests = asyncHandler(async (req, res) => {
    const requests = await connectionService.getIncomingRequests(req.user.id);
    return ApiResponse.success(res, requests, "Incoming requests fetched successfully");
});

/**
 * GET /connections/sent
 * Returns all outgoing pending connection requests.
 */
export const getOutgoingRequests = asyncHandler(async (req, res) => {
    const requests = await connectionService.getOutgoingRequests(req.user.id);
    return ApiResponse.success(res, requests, "Sent requests fetched successfully");
});

/**
 * POST /connections/request/:userId
 * Send a connection request to another user.
 */
export const sendRequest = asyncHandler(async (req, res) => {
    const connection = await connectionService.sendRequest(req.user.id, req.params.userId);
    return ApiResponse.success(res, connection, "Connection request sent", 201);
});

/**
 * PATCH /connections/accept/:requestId
 * Accept a pending incoming connection request.
 */
export const acceptRequest = asyncHandler(async (req, res) => {
    const connection = await connectionService.acceptRequest(req.user.id, req.params.requestId);
    return ApiResponse.success(res, connection, "Connection request accepted");
});

/**
 * PATCH /connections/reject/:requestId
 * Reject a pending incoming connection request.
 */
export const rejectRequest = asyncHandler(async (req, res) => {
    const connection = await connectionService.rejectRequest(req.user.id, req.params.requestId);
    return ApiResponse.success(res, connection, "Connection request rejected");
});

/**
 * DELETE /connections/withdraw/:requestId
 * Withdraw (cancel) an outgoing pending request.
 */
export const withdrawRequest = asyncHandler(async (req, res) => {
    const result = await connectionService.withdrawRequest(req.user.id, req.params.requestId);
    return ApiResponse.success(res, null, result.message);
});

/**
 * DELETE /connections/remove/:userId
 * Remove an accepted connection with another user.
 */
export const removeConnection = asyncHandler(async (req, res) => {
    const result = await connectionService.removeConnection(req.user.id, req.params.userId);
    return ApiResponse.success(res, null, result.message);
});
