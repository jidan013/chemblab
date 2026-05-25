import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const payload = token ? verifyToken(token) : null;
    const userId = payload?.userId;

    // Best effort cleanup: jangan menghambat response logout.
    if (userId) {
      void db.device
        .deleteMany({
          where: { userId },
        })
        .catch((error) => {
          console.error("Logout device cleanup error:", error);
        });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
