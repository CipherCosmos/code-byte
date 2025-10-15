import QRCode from 'qrcode';
import cloudinary from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate QR code for game join URL and upload to Cloudinary
 * @param {string} gameCode - The game code to generate QR for
 * @returns {Promise<string>} - Cloudinary URL of the uploaded QR code
 */
export async function generateAndUploadQRCode(gameCode) {
  try {
    // Generate join URL
    const joinUrl = `https://code-byte-eta.vercel.app/join/${gameCode}`;

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(joinUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'hackarena/qrcodes',
          public_id: `game-${gameCode}-${uuidv4()}`,
          resource_type: 'image',
          format: 'png',
          transformation: [
            { width: 300, height: 300, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(qrCodeBuffer);
    });

    return result.secure_url;
  } catch (error) {
    console.error('❌ Error generating/uploading QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Delete QR code from Cloudinary
 * @param {string} qrCodeUrl - The Cloudinary URL of the QR code to delete
 */
export async function deleteQRCode(qrCodeUrl) {
  try {
    if (!qrCodeUrl) return;

    // Extract public_id from Cloudinary URL
    const urlParts = qrCodeUrl.split('/');
    const publicIdWithExt = urlParts[urlParts.length - 1];
    const publicId = `hackarena/qrcodes/${publicIdWithExt.split('.')[0]}`;

    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error) {
    console.error('❌ Error deleting QR code from Cloudinary:', error);
    // Don't throw error for delete failures
  }
}