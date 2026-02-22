
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('imageUrl');
  const widthStr = searchParams.get('w');
  const heightStr = searchParams.get('h');

  if (!imageUrl) {
    return new NextResponse('Missing imageUrl parameter', { status: 400 });
  }

  if (!widthStr || !heightStr) {
    return new NextResponse('Missing width or height parameters', { status: 400 });
  }

  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    return new NextResponse('Invalid width or height parameters', { status: 400 });
  }

  try {
    const imageBuffer = await fetch(imageUrl).then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
      }
      return res.arrayBuffer();
    });

    const resizedImageBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(width, height, {
        fit: 'cover', // 'cover' will crop to fit the exact dimensions
        position: 'center'
      })
      .png() // Output as PNG
      .toBuffer();

    // Create a Uint8Array from the Buffer to ensure web standards compatibility.
    const imageUint8Array = new Uint8Array(resizedImageBuffer);

    return new Response(imageUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error processing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(`Error processing image: ${errorMessage}`, { status: 500 });
  }
}
