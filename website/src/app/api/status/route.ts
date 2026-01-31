import { NextResponse } from "next/server";
import { getChurchStatus } from "@/lib/queries";

export const runtime = "edge";

export async function GET() {
  const status = await getChurchStatus();
  return NextResponse.json(status);
}
