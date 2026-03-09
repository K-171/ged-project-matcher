"use server";

import { createClient } from "@/lib/supabase/server";
import { MAX_RANKS } from "@/lib/types";

export async function savePreferences(
  rankedProjectIds: number[]
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Non authentifié." };
  }

  if (rankedProjectIds.length !== MAX_RANKS) {
    return {
      success: false,
      message: `Vous devez classer exactement ${MAX_RANKS} projets.`,
    };
  }

  // Check for duplicates
  const uniqueIds = new Set(rankedProjectIds);
  if (uniqueIds.size !== rankedProjectIds.length) {
    return { success: false, message: "Les projets doivent être uniques." };
  }

  // Validate project IDs exist
  const { data: validProjects } = await supabase
    .from("projects")
    .select("id")
    .in("id", rankedProjectIds);

  if (!validProjects || validProjects.length !== rankedProjectIds.length) {
    return {
      success: false,
      message: "Un ou plusieurs projets sélectionnés sont invalides.",
    };
  }

  // Delete existing preferences
  const { error: deleteError } = await supabase
    .from("preferences")
    .delete()
    .eq("group_id", user.id);

  if (deleteError) {
    return {
      success: false,
      message: "Erreur lors de la suppression des anciennes préférences.",
    };
  }

  // Insert new preferences
  const newPreferences = rankedProjectIds.map((projectId, index) => ({
    group_id: user.id,
    project_id: projectId,
    rank: index + 1,
  }));

  const { error: insertError } = await supabase
    .from("preferences")
    .insert(newPreferences);

  if (insertError) {
    return {
      success: false,
      message: `Erreur lors de la sauvegarde: ${insertError.message}`,
    };
  }

  return { success: true, message: "Préférences sauvegardées avec succès !" };
}
