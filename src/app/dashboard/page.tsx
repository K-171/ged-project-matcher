import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, projectsResult, preferencesResult] =
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

  const profile = profileResult.data;
  const projects = projectsResult.data;
  const preferences = preferencesResult.data;

  // Debug: log any Supabase errors
  if (projectsResult.error) {
    console.error("Projects query error:", projectsResult.error);
  }
  if (profileResult.error) {
    console.error("Profile query error:", profileResult.error);
  }

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

  // Temporary debug info — remove after fixing
  if (!projects || projects.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <h2 className="text-xl font-bold text-red-400">Debug Info</h2>
        <p>Projects data: {JSON.stringify(projects)}</p>
        <p>Projects error: {JSON.stringify(projectsResult.error)}</p>
        <p>Profile data: {JSON.stringify(resolvedProfile)}</p>
        <p>User ID: {user.id}</p>
        <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p>Key prefix: {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.substring(0, 15)}...</p>
      </div>
    );
  }

  return (
    <DashboardClient
      profile={resolvedProfile}
      projects={projects ?? []}
      savedPreferences={preferences ?? []}
    />
  );
}
