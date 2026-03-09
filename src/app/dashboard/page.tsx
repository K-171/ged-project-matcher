import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: projects }, { data: preferences }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("group_name, member_1, member_2, is_admin")
        .eq("id", user.id)
        .single(),
      supabase.from("projects").select("*").order("id"),
      supabase
        .from("preferences")
        .select("project_id, rank")
        .eq("group_id", user.id)
        .order("rank"),
    ]);

  if (!profile || !projects) redirect("/login");

  return (
    <DashboardClient
      profile={profile}
      projects={projects}
      savedPreferences={preferences ?? []}
    />
  );
}
