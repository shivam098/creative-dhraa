import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, JWTPayload } from "./jwt";

/**
 * Middleware to protect admin API routes
 * Extracts and verifies JWT from Authorization header
 */
export function withAuth(
  handler: (
    req: NextRequest,
    context: { user: JWTPayload }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Token expired or invalid" },
        { status: 401 }
      );
    }

    return handler(req, { user: payload });
  };
}

/**
 * Simple admin verification for route handlers
 * Checks for admin_token cookie or Bearer token
 * Returns NextResponse (error) if unauthorized, or null if valid
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  // Check cookie first
  const cookieToken = request.cookies.get("admin_token")?.value;
  // Then check Bearer header
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized: Token expired or invalid" },
      { status: 401 }
    );
  }

  // Valid — return null to indicate success
  return null;
}
