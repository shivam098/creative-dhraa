import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { customerAccounts, customerProfiles } from "@/lib/db/schema";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth/customer-auth";
import { eq } from "drizzle-orm";

// Google OAuth token exchange
export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: "Missing credential" }, { status: 400 });
    }

    // Verify Google ID token
    const googleTokenInfo = await verifyGoogleToken(credential);
    if (!googleTokenInfo) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const { email, name, picture, sub: googleId } = googleTokenInfo;

    const db = getDb();

    // Check if account already exists
    let account = await db.query.customerAccounts.findFirst({
      where: eq(customerAccounts.googleId, googleId),
    });

    if (!account) {
      // Check if email already registered with different provider
      account = await db.query.customerAccounts.findFirst({
        where: eq(customerAccounts.email, email),
      });

      if (account) {
        // Link Google to existing account
        const [updated] = await db
          .update(customerAccounts)
          .set({ googleId, avatarUrl: picture, provider: "google", isEmailVerified: true })
          .where(eq(customerAccounts.id, account.id))
          .returning();
        account = updated;
      } else {
        // Create new account + profile
        const [profile] = await db
          .insert(customerProfiles)
          .values({
            name,
            email,
            source: "voluntary",
          })
          .returning();

        const [newAccount] = await db
          .insert(customerAccounts)
          .values({
            email,
            name,
            avatarUrl: picture,
            provider: "google",
            googleId,
            profileId: profile.id,
            isEmailVerified: true,
          })
          .returning();
        account = newAccount;
      }
    }

    // Update last login
    await db
      .update(customerAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(customerAccounts.id, account.id));

    // Create JWT
    const token = await createCustomerToken({
      sub: account.id,
      email: account.email,
      name: account.name,
    });

    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

async function verifyGoogleToken(credential: string) {
  try {
    // Decode the JWT without verification first to get header
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!response.ok) return null;

    const payload = await response.json();

    // Verify audience matches our client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return null;
    }

    return {
      email: payload.email as string,
      name: payload.name as string,
      picture: payload.picture as string,
      sub: payload.sub as string,
    };
  } catch {
    return null;
  }
}
