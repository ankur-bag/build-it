import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import Papa from "papaparse";
import * as xlsx from "xlsx";

interface ParseRequest {
  public_id: string;
  format: "csv" | "xlsx" | "ods";
}

interface Contact {
  name: string;
  phone: string;
}

interface ParseResponse {
  contacts: Contact[];
}

function extractContacts(data: any[]): Contact[] {
  return data
    .map((row: any) => {
      const name = row.name || row.Name || row.fullName || row.FullName || "";
      const phone = row.phone || row.Phone || row.phoneNumber || row.PhoneNumber || "";

      if (!name || !phone) return null;

      return {
        name: String(name).trim(),
        phone: String(phone).trim(),
      };
    })
    .filter((contact: Contact | null): contact is Contact => contact !== null);
}

async function fetchFileFromCloudinary(publicId: string, format: string): Promise<Buffer> {
  const extension = format === "ods" ? "xlsx" : format;
  const url = cloudinary.url(publicId, {
    resource_type: "raw",
    format: extension,
    secure: true,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from Cloudinary: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function parseCSV(buffer: Buffer): Contact[] {
  const csvString = buffer.toString("utf-8");
  const { data } = Papa.parse(csvString, { header: true, skipEmptyLines: true });
  return extractContacts(data as any[]);
}

function parseExcel(buffer: Buffer): Contact[] {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("No worksheet found in Excel file");
  }

  const data = xlsx.utils.sheet_to_json(worksheet);
  return extractContacts(data);
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

    const body: ParseRequest = await request.json();
    const { public_id, format } = body;

    if (!public_id || !format) {
      return NextResponse.json(
        { error: "public_id and format are required" },
        { status: 400 }
      );
    }

    if (!["csv", "xlsx", "ods"].includes(format)) {
      return NextResponse.json(
        { error: "Format must be csv, xlsx, or ods" },
        { status: 400 }
      );
    }

    const fileBuffer = await fetchFileFromCloudinary(public_id, format);

    let contacts: Contact[] = [];

    if (format === "csv") {
      contacts = parseCSV(fileBuffer);
    } else if (format === "xlsx" || format === "ods") {
      contacts = parseExcel(fileBuffer);
    }

    const response: ParseResponse = {
      contacts,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
