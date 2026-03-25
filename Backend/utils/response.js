export class ApiResponse {
    static success(res, data, message = "Success", statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }

    static error(res, message = "Internal Server Error", statusCode = 500, errors = undefined) {
        const payload = {
            success: false,
            message,        // human-readable description
        };
        if (errors) {
            payload.errors = errors;
        }
        return res.status(statusCode).json(payload);
    }
}
