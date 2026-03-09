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
  if (!profile) {
    const meta = user.user_metadata ?? {};
    await supabase.from("profiles").upsert({
      id: user.id,
      group_name: meta.group_name || "Sans nom",
      member_1: meta.member_1 || "",
      member_2: meta.member_2 || "",
      member_3: meta.member_3 || null,
      is_admin: false,
    });
  }

  // Re-fetch profile if upsert was attempted
  const resolvedProfile = profile ?? (await supabase
    .from("profiles")
    .select("group_name, member_1, member_2, member_3, is_admin")
    .eq("id", user.id)
    .single()).data;

  if (!resolvedProfile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Profil introuvable. <a href="/login" className="underline">Se reconnecter</a>
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
