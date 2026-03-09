"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const groupName = formData.get("group_name") as string;
  const member1 = formData.get("member_1") as string;
  const member2 = formData.get("member_2") as string;
  const member3 = (formData.get("member_3") as string) || null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        group_name: groupName,
        member_1: member1,
        member_2: member2,
        member_3: member3,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, the session is available immediately
  if (data.session) {
    redirect("/dashboard");
  }

  // If email confirmation is enabled, user must confirm first
  return {
    error: "Vérifiez votre email pour confirmer votre inscription.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
