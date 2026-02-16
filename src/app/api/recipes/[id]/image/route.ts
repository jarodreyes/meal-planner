import { NextResponse } from "next/server";
import { writeClient } from "@/lib/sanity/client";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing recipe id" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("image");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided; use form field 'file' or 'image'" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/jpeg";
    const filename = file.name || "recipe-image.jpg";

    const asset = await writeClient.assets.upload("image", buffer, {
      filename,
      contentType,
    });

    const imageRef = {
      _type: "image" as const,
      asset: {
        _type: "reference" as const,
        _ref: asset._id,
      },
    };

    const recipe = await writeClient.getDocument(id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    const currentImages = Array.isArray(recipe.images) ? recipe.images : [];
    await writeClient
      .patch(id)
      .setIfMissing({ images: [] })
      .append("images", [imageRef])
      .commit();

    return NextResponse.json({
      ok: true,
      assetId: asset._id,
      url: asset.url,
    });
  } catch (error) {
    console.error("Recipe image upload error", error);
    return NextResponse.json(
      { error: "Failed to upload image", details: String(error) },
      { status: 500 }
    );
  }
}
