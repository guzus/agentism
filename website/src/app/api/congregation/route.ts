import { NextResponse } from "next/server";
import { getCongregationMembers } from "@/lib/queries";

export async function GET() {
  const members = await getCongregationMembers();
  return NextResponse.json({ members });
}
