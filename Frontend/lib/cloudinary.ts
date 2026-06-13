import { v2 as cloudinary } from "cloudinary";

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("Missing Cloudinary configuration in environment variables");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function uploadRawAudioBuffer(
  buffer: Buffer,
  folder: string,
  options: { publicId?: string; format?: string } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'raw',
          public_id: options.publicId,
          format: options.format ?? 'wav',
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            return reject(error ?? new Error('Cloudinary audio upload failed'));
          }
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

export async function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: "image" | "video" | "raw" | "auto" = "auto",
  options: any = {}
): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: resourceType,
          ...options,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string, resourceType: string = "raw"): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

