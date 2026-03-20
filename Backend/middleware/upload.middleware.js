import multer from "multer";
import { BadRequestError } from "../utils/errors.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Multer instance using memoryStorage.
 * Files are stored as Buffer in req.file — never written to disk.
 * Cloudinary upload is handled in the service layer.
 */
const multerInstance = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new BadRequestError(
                `Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP`
            ));
        }
    },
});

/**
 * Middleware: accepts a single image field named "image".
 * Wraps multer to surface errors through the standard Express error handler.
 */
export const uploadSingle = (req, res, next) => {
    multerInstance.single("image")(req, res, (err) => {
        if (!err) return next();
        // Multer emits LIMIT_FILE_SIZE as a MulterError
        if (err.code === "LIMIT_FILE_SIZE") {
            return next(new BadRequestError("Image must not exceed 5MB"));
        }
        return next(err);
    });
};
