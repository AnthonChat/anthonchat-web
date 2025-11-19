import { NextResponse } from "next/server";
import { requireAdminForApi } from "@/lib/auth/admin";
import { getEnv } from "@/lib/config/env";
import { META_GRAPH_API_VERSION } from "@/lib/meta/templates";

export async function POST(req: Request) {
  const adminId = await requireAdminForApi();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const env = getEnv();
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/media`;

    const metaFormData = new FormData();
    metaFormData.append("file", file);
    metaFormData.append("type", type || file.type);
    metaFormData.append("messaging_product", "whatsapp");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      },
      body: metaFormData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[ADMIN_TEMPLATE_UPLOAD_ERROR]", {
        status: response.status,
        body: errorBody,
      });
      return NextResponse.json(
        { error: `Meta API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[ADMIN_TEMPLATE_UPLOAD_EXCEPTION]", error);
    return NextResponse.json(
      { error: "Internal server error during upload" },
      { status: 500 }
    );
  }
}