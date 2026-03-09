import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Shield } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy handles auth redirects — no redirect("/login") here to avoid loops
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("group_name, is_admin")
        .eq("id", user.id)
        .single()
    : { data: null };

  if (!profile && user) {
    // Profile missing — create it from user metadata
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

  const displayName = profile?.group_name ?? user?.user_metadata?.group_name ?? "Mon binôme";
  const isAdmin = profile?.is_admin ?? false;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg hidden sm:inline">
              GED Project Matcher
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" render={<Link href="/dashboard/admin" />}>
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {displayName}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
