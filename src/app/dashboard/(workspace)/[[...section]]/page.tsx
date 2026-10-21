import { notFound } from "next/navigation";

// Content is rendered by the persistent layout; this route only rejects unknown sections.
export default async function DashboardSection({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  if (section && (section.length > 1 || !["overview", "scan", "history", "findings", "settings"].includes(section[0]))) notFound();
  return null;
}
