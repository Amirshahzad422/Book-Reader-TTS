import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: { message: "Supabase is not configured" } },
        { status: 500 }
      );
    }

    const { bucket, path } = await request.json();

    if (!bucket || !path) {
      return NextResponse.json(
        { error: { message: "Bucket and path are required" } },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: { message: error.message || "Failed to delete file" } },
      { status: 500 }
    );
  }
}