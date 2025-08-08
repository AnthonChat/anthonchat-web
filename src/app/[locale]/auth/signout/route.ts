
// Locale-aware proxy: forwards POSTs from /[locale]/auth/signout to /api/auth/signout
export async function POST(request: Request) {
  const url = new URL("/api/auth/signout", request.url);

  // Forward the request to the internal API route, preserving headers and body
  const forwarded = await fetch(url.toString(), {
    method: "POST",
    headers: request.headers,
    body: await request.arrayBuffer(),
    // include cookies/credentials for server-side fetch
    credentials: "include",
  });

  // Copy response headers
  const respHeaders = new Headers(forwarded.headers);

  const body = await forwarded.arrayBuffer();

  return new Response(body, {
    status: forwarded.status,
    statusText: forwarded.statusText,
    headers: respHeaders,
  });
}