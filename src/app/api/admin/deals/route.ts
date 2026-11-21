import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { parseDeal } from "@/lib/data";
import { db } from "@/lib/supabase";
import { errorResponse, readJson } from "@/lib/validate";

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const row = parseDeal(await readJson(request), false);
    const { data, error } = await db().from("deals").insert(row).select("id").single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
