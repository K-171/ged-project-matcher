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
        .select("group_name, member_1, member_2, member_3, is_admin")
        .eq("id", user.id)
        .single(),
      supabase.from("projects").select("*").order("id"),
      supabase
        .from("preferences")
        .select("project_id, rank")
        .eq("group_id", user.id)
        .order("rank"),
    ]);

  // Ensure profile exists
  const resolvedProfile = profile ?? await (async () => {
    const meta = user.user_metadata ?? {};
    await supabase.from("profiles").upsert({
      id: user.id,
      group_name: meta.group_name || "Sans nom",
      member_1: meta.member_1 || "",
      member_2: meta.member_2 || "",
      member_3: meta.member_3 || null,
      is_admin: false,
    });
    const { data } = await supabase
      .from("profiles")
      .select("group_name, member_1, member_2, member_3, is_admin")
      .eq("id", user.id)
      .single();
    return data;
  })();

  if (!resolvedProfile) {
    redirect("/login");
  }

  return (
    <DashboardClient
      profile={resolvedProfile}
      projects={projects ?? []}
      savedPreferences={preferences ?? []}
    />
  );
}
