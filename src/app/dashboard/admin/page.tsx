import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  // Fetch all data for admin
  const [
    { data: groups },
    { data: projects },
    { data: preferences },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, group_name, member_1, member_2, member_3")
      .order("group_name"),
    supabase.from("projects").select("*").order("id"),
    supabase.from("preferences").select("group_id, project_id, rank"),
    supabase
      .from("assignments")
      .select(
        "id, group_id, project_id, rank_given, score, run_at, profiles(group_name, member_1, member_2, member_3), projects(title, professor)"
      )
      .order("score", { ascending: false }),
  ]);

  // Count groups that have submitted preferences
  const groupsWithPrefs = new Set(
    (preferences ?? []).map((p) => p.group_id)
  ).size;

  return (
    <AdminClient
      totalGroups={groups?.length ?? 0}
      submittedGroups={groupsWithPrefs}
      groups={groups ?? []}
      projects={projects ?? []}
      preferences={preferences ?? []}
      assignments={(assignments as any) ?? []}
    />
  );
}
