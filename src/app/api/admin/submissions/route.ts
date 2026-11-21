import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { listSubmissions } from "@/lib/data";
import { errorResponse } from "@/lib/validate";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const status = request.nextUrl.searchParams.get("status");
    const valid = status === "approved" || status === "rejected" ? status : "pending";
    return Response.json(await listSubmissions(valid), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
