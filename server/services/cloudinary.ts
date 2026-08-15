import type { AppConfig } from "../config.js";

export class CloudinaryService {
  constructor(private readonly config: AppConfig) {}

  getUnsignedUploadConfig() {
    if (!this.config.CLOUDINARY_CLOUD_NAME || !this.config.CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("Cloudinary is not configured");
    }
    return {
      cloudName: this.config.CLOUDINARY_CLOUD_NAME,
      uploadPreset: this.config.CLOUDINARY_UPLOAD_PRESET,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    };
  }
}
