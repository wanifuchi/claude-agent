import { getAvailableProviders } from "@/lib/providers";

export async function GET() {
  const providers = getAvailableProviders();
  return Response.json({ providers });
}
