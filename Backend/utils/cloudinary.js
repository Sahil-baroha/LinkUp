import { v2 as cloudinary } from "cloudinary";

// Configure once on module load — dotenv must be called before this module imports
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer directly to Cloudinary using an upload stream.
 * This is the memory-storage pattern: buffer → stream → Cloudinary.
 * Never writes to disk.
 *
 * @param {Buffer} buffer   - The file buffer from multer memoryStorage
 * @param {string} mimetype - MIME type of the file for format hint
 * @param {string} folder   - Cloudinary folder path (e.g. "linkup/posts")
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadToCloudinary = (buffer, mimetype, folder = "linkup/posts") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                // Derive format from MIME to avoid Cloudinary guessing wrong
                format: mimetype.split("/")[1],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(buffer);
    });
};

/**
 * Delete an asset from Cloudinary by its public_id.
 * Returns true on success, false on failure (caller decides how to handle).
 *
 * @param {string} publicId - The Cloudinary public_id of the asset
 * @returns {Promise<boolean>}
 */
export const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
        return true;
    } catch (error) {
        console.error(`[Cloudinary] Failed to delete asset: ${publicId}`, error.message);
        return false;
    }
};
