import { DashboardClient } from "@/components/dashboard-client";
import { readScans } from "@/lib/records";
import { requirePageUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The layout stays mounted while users move between dashboard sections, so scan history
// is fetched once per full load or explicit refresh rather than on every navigation.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { client, user } = await requirePageUser();
  const scans = await readScans(client, user.id);
  const name = typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : user.email?.split("@")[0] || "User";
  return <>
    <DashboardClient scans={scans} displayName={name} email={user.email || "Email not available"} />
    {children}
  </>;
}
