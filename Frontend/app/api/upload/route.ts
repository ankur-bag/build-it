import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { Readable } from "stream";

interface UploadedFile {
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  secure_url: string;
}

interface UploadResponse {
  files: UploadedFile[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mpeg", "video/quicktime"];
const ALLOWED_DATA_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.spreadsheet",
];

function isImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

function isVideoType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

function isDataType(mimeType: string): boolean {
  return ALLOWED_DATA_TYPES.includes(mimeType);
}

function getResourceType(mimeType: string): "image" | "video" | "raw" {
  if (isImageType(mimeType)) return "image";
  if (isVideoType(mimeType)) return "video";
  if (isDataType(mimeType)) return "raw";
  return "raw";
}

async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  resourceType: "image" | "video" | "raw"
): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: `outreach/${Date.now()}-${fileName.replace(/\s+/g, "-")}`,
        folder: "outreach",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 20MB limit` },
          { status: 413 }
        );
      }

      const mimeType = file.type;
      const isValid =
        isImageType(mimeType) || isVideoType(mimeType) || isDataType(mimeType);

      if (!isValid) {
        return NextResponse.json(
          { error: `File type ${mimeType} is not allowed` },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const resourceType = getResourceType(mimeType);

      const result = await uploadToCloudinary(
        Buffer.from(buffer),
        file.name,
        resourceType
      );

      uploadedFiles.push({
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        secure_url: result.secure_url,
      });
    }

    const response: UploadResponse = {
      files: uploadedFiles,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
