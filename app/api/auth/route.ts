import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";

const TOKEN_COOKIE = "claude-agent-token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7日間

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  const password = process.env.AUTH_PASSWORD;

  // パスワード未設定なら認証不要
  if (!password) {
    return Response.json({ ok: true, noAuth: true });
  }

  const { password: inputPassword } = (await req.json()) as { password: string };

  if (hashPassword(inputPassword) === hashPassword(password)) {
    const token = generateToken();
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: TOKEN_MAX_AGE,
      path: "/",
    });

    // トークンを環境変数的に保持（簡易実装）
    process.env._AUTH_TOKEN = token;

    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "パスワードが正しくありません" }, { status: 401 });
}

export async function GET() {
  const password = process.env.AUTH_PASSWORD;

  if (!password) {
    return Response.json({ authenticated: true, noAuth: true });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (token && process.env._AUTH_TOKEN === token) {
    return Response.json({ authenticated: true });
  }

  return Response.json({ authenticated: false });
}
