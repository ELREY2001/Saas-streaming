import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "saas-account-manager-secret-key-2024"
);
const COOKIE_NAME = "admin_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<{ adminId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { adminId: payload.adminId as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ adminId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentAdmin() {
  const session = await getSession();
  if (!session) return null;
  const [admin] = await db
    .select({
      id: admins.id,
      email: admins.email,
      name: admins.name,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .where(eq(admins.id, session.adminId))
    .limit(1);
  return admin || null;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("UNAUTHORIZED");
  }
  return admin;
}

// Seed default admin if none exists
export async function seedDefaultAdmin() {
  const existingAdmins = await db.select().from(admins).limit(1);
  if (existingAdmins.length === 0) {
    const passwordHash = await hashPassword("admin123");
    await db.insert(admins).values({
      email: "admin@saas.com",
      passwordHash,
      name: "Administrateur",
    });
    console.log("✅ Default admin created: admin@saas.com / admin123");
  }
}
