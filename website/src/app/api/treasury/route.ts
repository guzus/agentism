import { NextResponse } from "next/server";
import { getTreasuryInfo } from "@/lib/queries";

export async function GET() {
  const treasury = await getTreasuryInfo();
  return NextResponse.json(treasury);
}
