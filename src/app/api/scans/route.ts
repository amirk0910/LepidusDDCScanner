import { AppError, errorResponse } from "@/lib/errors";
import { isTrustedOrigin } from "@/lib/origin";
import { readScans } from "@/lib/records";
import { scanAndSave } from "@/lib/scan-service";
import { requireApiUser } from "@/lib/supabase/server";
import { readUpload } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { client, user } = await requireApiUser();
    return Response.json({ scans: await readScans(client, user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) throw new AppError("This upload must be submitted from the MiniDSP application.", 403);
    const { client } = await requireApiUser();
    const file = await readUpload(request);
    return Response.json(await scanAndSave(file, client), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
