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
 * Middleware: accepts a single image field named "image".
 * Wraps multer to surface errors through the standard Express error handler.
 */
const multerSingle = (req, res, next) => {
    multerInstance.single("image")(req, res, (err) => {
        if (!err) return next();
        // Multer emits LIMIT_FILE_SIZE as a MulterError
        if (err.code === "LIMIT_FILE_SIZE") {
            return next(new BadRequestError("Image must not exceed 5MB"));
        }
        return next(err);
    });
};

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
 * Combined upload middleware: multer (storage + header MIME filter) →
 * magic-byte verification. Use this on any route that accepts image uploads.
 */
export const uploadSingle = [multerSingle, verifyMimeBytes];
