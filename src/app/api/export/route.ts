import { exportCsv } from "@/lib/csv";
import { AppError, errorResponse } from "@/lib/errors";
import { exportFilterSchema, filterScans } from "@/lib/filters";
import { readScans } from "@/lib/records";
import { requireApiUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireApiUser();
    const parsed = exportFilterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new AppError("The export filters are invalid. Reset the filters and retry.", 400);
    const scans = filterScans(await readScans(client, user.id), parsed.data);
    return new Response(exportCsv(scans), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="lepide-masked-findings.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
