import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const title = url.searchParams.get("title");
    const image = url.searchParams.get("image");

    if (!title || !image) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    const generatedImageUrl = image; // temporal, reemplazar con lógica real

    return NextResponse.json({ success: true, url: generatedImageUrl });
  } catch (err: unknown) {
    let errorMessage = "An unknown error occurred";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
