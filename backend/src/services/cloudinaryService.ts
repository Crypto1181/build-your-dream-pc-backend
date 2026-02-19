import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}

/**
 * Upload an image buffer to Cloudinary
 */
export async function uploadImage(
    buffer: Buffer,
    filename: string,
    folder: string = 'techtitan-products'
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename.replace(/\.[^.]+$/, ''), // Remove extension
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' }, // Auto optimize
                    { width: 1200, crop: 'limit' }, // Max width 1200px
                ],
            },
            (error, result) => {
                if (error) {
                    logger.error('Cloudinary upload error:', error);
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        bytes: result.bytes,
                    });
                }
            }
        );
        uploadStream.end(buffer);
    });
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<boolean> {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        logger.error('Cloudinary delete error:', error);
        return false;
    }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}
