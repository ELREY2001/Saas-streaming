import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    // Seed default admin if none exists
    const existing = await db.select().from(admins).limit(1);
    if (existing.length === 0) {
      const passwordHash = await hashPassword("admin123");
      await db.insert(admins).values({
        email: "admin@saas.com",
        passwordHash,
        name: "Administrateur",
      });
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "AccountFlow SaaS",
    });
  } catch (err) {
    console.error("Health check error:", err);
    return NextResponse.json(
      { status: "error", error: String(err) },
      { status: 500 }
    );
  }
}
