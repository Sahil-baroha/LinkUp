import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
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
 * M6: Magic-byte MIME validation.
 * Multer's fileFilter trusts the Content-Type header supplied by the client,
 * which can be spoofed (e.g. an SVG with JS disguised as image/jpeg).
 * file-type reads the actual file bytes to validate the real MIME type,
 * preventing disguised file attacks before the buffer reaches Cloudinary.
 */
const verifyMimeBytes = async (req, res, next) => {
    if (!req.file) return next(); // no file uploaded — nothing to verify

    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return next(new BadRequestError(
            `File content does not match declared type. Allowed types: JPEG, PNG, WEBP`
        ));
    }
    next();
};

/**
 * Factory for single file upload middleware with magic-byte verification.
 * @param {string} fieldName - Form field name (e.g. "image" or "avatar")
 */
export const createSingleUpload = (fieldName) => {
    const multerField = (req, res, next) => {
        multerInstance.single(fieldName)(req, res, (err) => {
            if (!err) return next();
            if (err instanceof multer.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next(new BadRequestError("Image must not exceed 5MB"));
                }
                if (err.code === "LIMIT_UNEXPECTED_FILE") {
                    return next(new BadRequestError("Unexpected file field"));
                }
                return next(new BadRequestError(err.message || "File upload error"));
            }
            return next(err);
        });
    };
    return [multerField, verifyMimeBytes];
};

/**
 * Combined upload middleware: multer (storage + header MIME filter) →
 * magic-byte verification. Use this on any route that accepts image uploads with field "image".
 */
export const uploadSingle = createSingleUpload("image");

/**
 * Combined upload middleware for avatar uploads with field "avatar".
 */
export const uploadAvatar = createSingleUpload("avatar");
