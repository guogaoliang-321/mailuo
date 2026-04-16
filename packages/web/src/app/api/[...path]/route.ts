import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:4000";

async function proxy(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const targetUrl = `${API_URL}${url.pathname}${url.search}`;

    const headers = new Headers();
    const ct = req.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    const xff = req.headers.get("x-forwarded-for");
    if (xff) headers.set("x-forwarded-for", xff);

    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.text()
        : undefined;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      responseHeaders.append(key, value);
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[proxy error]", err);
    return NextResponse.json(
      { success: false, error: "API proxy error" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
