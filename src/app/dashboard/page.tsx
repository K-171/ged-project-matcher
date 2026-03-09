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

  if (!profile) {
    // Profile may have just been created by the layout — try creating it
    const meta = user.user_metadata ?? {};
    await supabase.from("profiles").upsert({
      id: user.id,
      group_name: meta.group_name || "Sans nom",
      member_1: meta.member_1 || "",
      member_2: meta.member_2 || "",
      member_3: meta.member_3 || null,
      is_admin: false,
    });

    // Re-fetch profile after creation
    const { data: newProfile } = await supabase
      .from("profiles")
      .select("group_name, member_1, member_2, member_3, is_admin")
      .eq("id", user.id)
      .single();

    if (!newProfile || !projects) {
      await supabase.auth.signOut();
      redirect("/login");
    }

    return (
      <DashboardClient
        profile={newProfile}
        projects={projects}
        savedPreferences={preferences ?? []}
      />
    );
  }

  return (
    <DashboardClient
      profile={profile}
      projects={projects}
      savedPreferences={preferences ?? []}
    />
  );
}
