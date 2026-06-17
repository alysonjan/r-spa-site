import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure the public/bistro directory exists
    const uploadDir = join(process.cwd(), 'public', 'bistro');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.name.split('.').pop();
    const filename = `item-${uniqueSuffix}.${extension}`;
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/bistro/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Failed to upload image:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
