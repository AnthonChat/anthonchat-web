import { createClient, createServiceRoleClient } from "@/lib/db/server";
import { requireAdminForApi } from "@/lib/auth/admin";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportFormat = "json" | "csv" | "txt";

function getExportSecret(): string {
  // Use a dedicated secret to avoid mismatches between environments
  return process.env.EXPORT_TOKEN_SECRET || "dev-secret";
}

function verifyExportToken(userId: string, token: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  try {
    const secret = getExportSecret();
    const expectedSig = createHmac("sha256", secret).update(payloadB64).digest();
    const givenSig = base64UrlToBuffer(sigB64);
    if (expectedSig.length !== givenSig.length || !timingSafeEqual(expectedSig, givenSig)) {
      return false;
    }
    const payloadJson = base64UrlToBuffer(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as { userId: string; exp: number };
    if (!payload || payload.userId !== userId) return false;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
  return Buffer.from(b64 + pad, "base64");
}

 // admin check moved to requireAdminForApi()

function csvEscape(value: string): string {
  // Escape double quotes and wrap in quotes; normalize newlines
  const v = (value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/"/g, '""');
  return `"${v}"`;
}

function formatTxtLine(ts: string, role: string, channelId: string, content: string): string {
  // Use ISO timestamp for consistency
  const iso = new Date(ts).toISOString();
  return `[${iso}] ${role === "user" ? "User" : "Assistant"} (channel ${channelId}):\n${content}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format")?.toLowerCase() as ExportFormat) || "json";
  const order = url.searchParams.get("order") === "desc" ? "desc" : "asc";

  // Authorization:
  // - In non-production, allow without auth to avoid local cookie/env issues
  // - In production, require either a valid short-lived token (?t=...) or an admin session (ADMIN_EMAILS)
  if (process.env.NODE_ENV === "production") {
    const token = url.searchParams.get("t");
    const tokenValid = verifyExportToken(userId, token);

    if (!tokenValid) {
      const uid = await requireAdminForApi();
      if (!uid) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
  }

  const service = createServiceRoleClient();

  // Gather user's channel mapping
  const { data: userChannels, error: chErr } = await service
    .from("user_channels")
    .select("id,channel_id")
    .eq("user_id", userId);

  if (chErr) {
    console.error("[ADMIN_EXPORT_CHANNELS_ERROR]", { error: chErr, userId });
    return new Response("Failed to fetch channels", { status: 500 });
  }

  const byUserChannel = new Map<string, string>(); // user_channel_id -> channel_id
  const userChannelIds: string[] = [];
  for (const ch of (userChannels || []) as { id: string; channel_id: string }[]) {
    byUserChannel.set(ch.id, ch.channel_id);
    userChannelIds.push(ch.id);
  }

  if (userChannelIds.length === 0) {
    // No channels linked => nothing to export
    const emptyPayload = format === "json" ? "[]" : format === "csv" ? "created_at,role,channel_id,content,id\n" : "";
    return new Response(emptyPayload, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(format),
        "Content-Disposition": `attachment; filename="anthon-user-${userId}-messages.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Page through all chat_messages across user's channels
  const pageSize = 5000;
  let from = 0;
  const ascending = order !== "desc";

  type Row = {
    id: number;
    created_at: string;
    role: string;
    content: string;
    user_channel: string;
  };

  const all: (Row & { channel_id: string })[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await service
      .from("chat_messages")
      .select("id,content,created_at,role,user_channel")
      .in("user_channel", userChannelIds)
      .order("created_at", { ascending })
      .range(from, to);

    if (error) {
      console.error("[ADMIN_EXPORT_MESSAGES_ERROR]", { error, userId, from });
      return new Response("Failed to fetch messages", { status: 500 });
    }

    const rows = (data || []) as Row[];
    for (const m of rows) {
      all.push({
        ...m,
        channel_id: byUserChannel.get(m.user_channel) ?? "",
      });
    }

    if (!rows.length || rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  // If order requested was desc, reverse now (we queried asc for stable pagination)
  const finalRows = ascending ? all : all.slice().reverse();

  let body: string;
  switch (format) {
    case "csv": {
      const header = "created_at,role,channel_id,content,id\n";
      const lines = finalRows.map((r) =>
        [
          csvEscape(r.created_at),
          csvEscape(r.role),
          csvEscape(r.channel_id),
          csvEscape(r.content),
          String(r.id),
        ].join(",")
      );
      body = header + lines.join("\n");
      break;
    }
    case "txt": {
      body = finalRows.map((r) => formatTxtLine(r.created_at, r.role, r.channel_id, r.content)).join("\n\n");
      break;
    }
    case "json":
    default: {
      body = JSON.stringify(
        finalRows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          role: r.role,
          content: r.content,
          user_channel: r.user_channel,
          channel_id: r.channel_id,
        })),
        null,
        2
      );
      break;
    }
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(format),
      "Content-Disposition": `attachment; filename="anthon-user-${userId}-messages.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}

function contentTypeFor(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
    case "json":
    default:
      return "application/json; charset=utf-8";
  }
}