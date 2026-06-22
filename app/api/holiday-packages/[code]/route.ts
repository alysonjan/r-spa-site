import { NextResponse } from "next/server";
import { getPackageByCode } from "@/lib/packages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const pkg = await getPackageByCode(params.code);
    
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Check if package is still available for purchase
    const now = new Date();
    const isAvailable = pkg.available && (!pkg.activeTo || new Date(pkg.activeTo) > now);
    
    if (!isAvailable) {
      return NextResponse.json({ error: "Package no longer available" }, { status: 400 });
    }

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
