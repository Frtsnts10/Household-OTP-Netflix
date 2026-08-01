import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  // Check session
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Construct backend URL
  const resolvedParams = await params;
  const pathArray = resolvedParams?.path || [];
  const pathString = pathArray.join("/");
  
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const queryStr = userId ? `?userId=${userId}` : "";
  
  const backendUrl = pathString 
    ? `http://localhost:5001/api/otps/${pathString}${queryStr}`
    : `http://localhost:5001/api/otps${queryStr}`;

  try {
    const res = await fetch(backendUrl, {
      headers: {
        "x-api-key": process.env.BACKEND_API_KEY || "",
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (_error) {
    return NextResponse.json({ error: "Backend communication failed" }, { status: 500 });
  }
}
