// src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Upload a Base64 string or file buffer to Cloudinary
 */
export async function uploadImage(
  dataUri: string,
  folder: string = 'ubs_general'
): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `ubs_global/${folder}`,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    logger.error({ err: error.message, folder }, 'Cloudinary upload failed');
    throw new Error(`Media upload failed: ${error.message}`);
  }
}
