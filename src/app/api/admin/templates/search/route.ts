import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminForApi } from "@/lib/auth/admin";
import { fetchTemplateRecipients } from "@/lib/admin/templates";

const searchSchema = z.object({
  search: z.string().min(1).optional(),
  subscriptionStatuses: z
    .array(z.enum(["trialing", "subscribed", "unsubscribed", "canceled", "past_due"]))
    .optional(),
  channelIds: z.array(z.string()).optional(),
  verifiedOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const adminId = await requireAdminForApi();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filter payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const { recipients, total } = await fetchTemplateRecipients(parsed.data);
    return NextResponse.json({ recipients, total });
  } catch (error) {
    console.error("[ADMIN_TEMPLATE_SEARCH_ERROR]", {
      error,
      adminId,
      payload: parsed.data,
    });
    return NextResponse.json(
      { error: "Failed to load recipients" },
      { status: 500 }
    );
  }
}
