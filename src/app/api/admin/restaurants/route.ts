import type { NextRequest } from "next/server";
import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { listAllRestaurants, parseRestaurant } from "@/lib/data";
import { db } from "@/lib/supabase";
import { errorResponse, readJson } from "@/lib/validate";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  try {
    return Response.json(await listAllRestaurants(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const row = parseRestaurant(await readJson(request), false);
    const { data, error } = await db().from("restaurants").insert(row).select("id").single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
