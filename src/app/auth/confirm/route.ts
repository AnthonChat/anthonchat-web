import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

/**
 * Safe helper to produce an absolute URL for redirects
 */
function toAbsolute(next: string, req: NextRequest): string {
  try {
    // If already absolute and valid, return as-is
    const u = new URL(next);
    return u.toString();
  } catch {
    // Relative path - resolve against current request origin
    const base = new URL(req.url);
    const abs = new URL(next.startsWith("/") ? next : `/${next}`, `${base.protocol}//${base.host}`);
    return abs.toString();
  }
}

/**
 * GET handler
 * Do NOT verify on GET to avoid email/link scanners consuming the OTP.
 * Render a minimal confirmation page with a POST form the user must submit.
 *
 * Expected query params:
 * - token_hash: string
 * - type: "recovery" | "email" | etc. (we use "recovery" for password reset)
 * - next: where to go after successful verification (absolute or path)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash") || "";
  const type = searchParams.get("type") || "recovery";
  const next = searchParams.get("next") || "/en/reset-password";

  // Compute absolute next only for showing link target; POST uses same value
  const absoluteNext = toAbsolute(next, request);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Confirm secure action</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: #f8fafc; color: #0f172a; }
      .card { max-width: 560px; margin: 12vh auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 10px 20px rgba(2,6,23,0.06); }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { margin: 8px 0 16px; color: #334155; }
      form { margin-top: 12px; }
      button { display: inline-flex; align-items: center; gap: 8px; background: #0ea5e9; color: white; padding: 10px 14px; border: 0; border-radius: 8px; cursor: pointer; font-size: 14px; }
      button:hover { background: #0284c7; }
      .meta { margin-top: 12px; font-size: 12px; color: #64748b; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="card" role="dialog" aria-labelledby="title">
      <h1 id="title">Confirm your request</h1>
      <p>To protect your account, click the button below to confirm this action and continue.</p>

      <form method="POST" action="/auth/confirm">
        <input type="hidden" name="token_hash" value="${encodeURIComponent(token_hash)}" />
        <input type="hidden" name="type" value="${encodeURIComponent(type)}" />
        <input type="hidden" name="next" value="${encodeURIComponent(next)}" />
        <button type="submit" aria-label="Continue securely">Continue</button>
      </form>

      <p class="meta">You will be redirected to <code>${absoluteNext}</code> after confirmation.</p>
    </div>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

/**
 * POST handler
 * Verifies the token hash with Supabase and then redirects to the desired location.
 * If verification fails, redirects to target with error parameters for UI display.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token_hash = String(formData.get("token_hash") || "");
    const type = String(formData.get("type") || "recovery");
    const next = String(formData.get("next") || "/en/reset-password");

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    const successLocation = toAbsolute(next, request);

    if (!error) {
      // Success: redirect to the requested next URL
      return NextResponse.redirect(successLocation, { status: 303 });
    }

    // Failure: propagate error info to the next URL for display
    const failureUrl = new URL(successLocation);
    failureUrl.searchParams.set("error", "access_denied");
    failureUrl.searchParams.set("error_code", "otp_invalid");
    failureUrl.searchParams.set(
      "error_description",
      error?.message || "Email link is invalid or has expired"
    );

    return NextResponse.redirect(failureUrl.toString(), { status: 303 });
  } catch (e) {
    const next = "/en/reset-password";
    const failureUrl = new URL(toAbsolute(next, request));
    failureUrl.searchParams.set("error", "access_denied");
    failureUrl.searchParams.set("error_code", "otp_invalid");
    failureUrl.searchParams.set(
      "error_description",
      "Unable to process confirmation"
    );
    return NextResponse.redirect(failureUrl.toString(), { status: 303 });
  }
}