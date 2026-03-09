import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy handles auth redirects — no redirect("/login") here to avoid loops
  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Session expirée. <a href="/login" className="underline">Se reconnecter</a>
      </div>
    );
  }

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
  const upsertError = !profile ? await (async () => {
    const meta = user.user_metadata ?? {};
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      group_name: meta.group_name || "Sans nom",
      member_1: meta.member_1 || "",
      member_2: meta.member_2 || "",
      member_3: meta.member_3 || null,
      is_admin: false,
    });
    return error;
  })() : null;

  // Re-fetch profile if upsert was attempted
  const resolvedProfile = profile ?? (await supabase
    .from("profiles")
    .select("group_name, member_1, member_2, member_3, is_admin")
    .eq("id", user.id)
    .single()).data;

  if (!resolvedProfile) {
    return (
      <div className="p-8 space-y-3 text-sm">
        <h2 className="text-xl font-bold text-red-400">Debug: Profil introuvable</h2>
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>User email:</strong> {user.email}</p>
        <p><strong>User metadata:</strong> {JSON.stringify(user.user_metadata)}</p>
        <p><strong>Profile query error:</strong> {JSON.stringify(profileResult.error)}</p>
        <p><strong>Upsert error:</strong> {JSON.stringify(upsertError)}</p>
        <p><strong>Projects query error:</strong> {JSON.stringify(projectsResult.error)}</p>
        <p><strong>Projects count:</strong> {projects?.length ?? "null"}</p>
        <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p><strong>Key prefix:</strong> {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.substring(0, 20)}...</p>
        <a href="/login" className="underline text-primary">Se reconnecter</a>
      </div>
    );
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
