/**
 * Image Service
 * Provides utilities for image processing and validation
 */

import cloudinary from 'cloudinary';

export class ImageService {
  constructor() {
    // Configure Cloudinary if not already configured
    if (!cloudinary.v2.config().cloud_name) {
      cloudinary.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  /**
   * Validate image URL accessibility and format
   * @param {string} imageUrl - URL of the image to validate
   * @returns {Promise<Object>} - Validation result
   */
  static async validateImageUrl(imageUrl) {
    const result = {
      isValid: false,
      isAccessible: false,
      contentType: null,
      size: null,
      errors: []
    };

    try {
      // Basic URL validation
      const url = new URL(imageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        result.errors.push('Image URL must use HTTP or HTTPS protocol');
        return result;
      }

      // Check if it's a Cloudinary URL (if configured)
      const isCloudinaryUrl = imageUrl.includes('cloudinary.com');

      if (isCloudinaryUrl) {
        // For Cloudinary URLs, we can assume they're valid if properly formatted
        result.isValid = true;
        result.isAccessible = true;
        result.contentType = 'image/*'; // Generic image type
        return result;
      }

      // For external URLs, we could add HEAD request validation here
      // but for now, we'll do basic validation
      result.isValid = true;
      result.isAccessible = true; // Assume accessible for now

    } catch (error) {
      result.errors.push(`Invalid URL format: ${error.message}`);
    }

    return result;
  }

  /**
   * Get image metadata from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} - Image metadata
   */
  async getImageMetadata(publicId) {
    try {
      const result = await cloudinary.v2.api.resource(publicId);
      return {
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        url: result.secure_url
      };
    } catch (error) {
      console.error('Error fetching image metadata:', error);
      return null;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} cloudinaryUrl - Full Cloudinary URL
   * @returns {string|null} - Public ID or null if not found
   */
  static extractPublicId(cloudinaryUrl) {
    try {
      const url = new URL(cloudinaryUrl);
      const pathParts = url.pathname.split('/');
      // Cloudinary URLs typically have format: /cloud_name/image/upload/v123/public_id.ext
      const uploadIndex = pathParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
        // Remove version and extension
        let publicId = pathParts[uploadIndex + 2];
        if (publicId) {
          // Remove file extension if present
          publicId = publicId.replace(/\.[^/.]+$/, '');
          return publicId;
        }
      }
    } catch (error) {
      console.error('Error extracting public ID:', error);
    }
    return null;
  }

  /**
   * Generate optimized image URL for different screen sizes
   * @param {string} imageUrl - Original image URL
   * @param {Object} options - Transformation options
   * @returns {string} - Optimized image URL
   */
  static generateResponsiveUrl(imageUrl, options = {}) {
    const { width = 800, height = 600, quality = 'auto' } = options;

    // If it's a Cloudinary URL, apply transformations
    if (imageUrl.includes('cloudinary.com')) {
      const publicId = this.extractPublicId(imageUrl);
      if (publicId) {
        return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_limit,q_${quality}/${publicId}`;
      }
    }

    // Return original URL for non-Cloudinary images
    return imageUrl;
  }

  /**
   * Validate image dimensions and format for quiz questions
   * @param {string} imageUrl - Image URL to validate
   * @returns {Promise<Object>} - Validation result
   */
  static async validateForQuiz(imageUrl) {
    const result = {
      isValid: false,
      recommendations: [],
      warnings: []
    };

    const urlValidation = await this.validateImageUrl(imageUrl);
    if (!urlValidation.isValid) {
      result.warnings.push(...urlValidation.errors);
      return result;
    }

    // Check if it's a Cloudinary URL and get metadata
    if (imageUrl.includes('cloudinary.com')) {
      const publicId = this.extractPublicId(imageUrl);
      if (publicId) {
        const imageService = new ImageService();
        const metadata = await imageService.getImageMetadata(publicId);

        if (metadata) {
          // Check dimensions
          if (metadata.width < 400 || metadata.height < 300) {
            result.warnings.push('Image dimensions are quite small. Consider using a larger image for better visibility.');
          }

          if (metadata.width > 2000 || metadata.height > 1500) {
            result.recommendations.push('Image is quite large. Consider optimizing for web delivery.');
          }

          // Check file size
          const sizeMB = metadata.bytes / (1024 * 1024);
          if (sizeMB > 2) {
            result.recommendations.push(`Image size (${sizeMB.toFixed(2)}MB) is large. Consider compressing for faster loading.`);
          }

          // Check format
          const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
          if (!supportedFormats.includes(metadata.format.toLowerCase())) {
            result.warnings.push(`Image format '${metadata.format}' may not be supported by all browsers.`);
          }
        }
      }
    }

    result.isValid = result.warnings.length === 0;
    return result;
  }

  /**
   * Delete image from Cloudinary
   * @param {string} imageUrl - Cloudinary image URL
   * @returns {Promise<boolean>} - Success status
   */
  async deleteImage(imageUrl) {
    try {
      const publicId = ImageService.extractPublicId(imageUrl);
      if (publicId) {
        await cloudinary.v2.uploader.destroy(publicId);
        return true;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
    return false;
  }
}

export default ImageService;