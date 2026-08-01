import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const BACKEND_URL = "http://localhost:5001";
const API_KEY = process.env.BACKEND_API_KEY || "";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const urlPath = path ? path.join("/") : "";
  const targetUrl = `${BACKEND_URL}/api/emails/${urlPath}`;

  const headers = new Headers();
  headers.set("x-api-key", API_KEY);
  if (req.headers.has("content-type")) {
    headers.set("content-type", req.headers.get("content-type")!);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const text = await req.text();
    if (text) init.body = text;
  }

  try {
    const res = await fetch(targetUrl, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Backend error" }, { status: 500 });
  }
}

export { proxyRequest as GET, proxyRequest as POST, proxyRequest as DELETE };
