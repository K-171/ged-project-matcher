"use server";

import { createClient } from "@/lib/supabase/server";
import {
  RANK_SCORES,
} from "@/lib/types";
import munkres from "munkres-js";

const UNRANKED_COST = 100; // Prohibitively high cost for unranked projects
const MAX_SCORE = 10;

type AssignmentResult = {
  group_id: string;
  project_id: number;
  rank_given: number | null;
  score: number;
  group_name: string;
  project_title: string;
  professor: string;
};

type MatchResult = {
  success: boolean;
  message: string;
  assignments?: AssignmentResult[];
  totalScore?: number;
  maxPossibleScore?: number;
};

export async function runMatchingAlgorithm(): Promise<MatchResult> {
  const supabase = await createClient();

  // 1. Verify caller is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Non authentifié." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, message: "Accès réservé à l'administrateur." };
  }

  // 2. Fetch all groups and projects
  const { data: groups, error: groupsError } = await supabase
    .from("profiles")
    .select("id, group_name, member_1, member_2")
    .order("group_name");

  if (groupsError || !groups) {
    return { success: false, message: "Erreur lors du chargement des groupes." };
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, title, professor")
    .order("id");

  if (projectsError || !projects) {
    return { success: false, message: "Erreur lors du chargement des projets." };
  }

  // 3. Fetch all preferences
  const { data: preferences, error: prefsError } = await supabase
    .from("preferences")
    .select("group_id, project_id, rank");

  if (prefsError || !preferences) {
    return {
      success: false,
      message: "Erreur lors du chargement des préférences.",
    };
  }

  // Build a lookup: groupId -> { projectId -> rank }
  const prefMap = new Map<string, Map<number, number>>();
  for (const pref of preferences) {
    if (!prefMap.has(pref.group_id)) {
      prefMap.set(pref.group_id, new Map());
    }
    prefMap.get(pref.group_id)!.set(pref.project_id, pref.rank);
  }

  // 4. Build the cost matrix (groups × projects)
  // Transform: score -> cost by subtracting from MAX_SCORE
  // 1st choice (10pts) -> cost 0, 2nd (8pts) -> cost 2, ..., unranked -> cost UNRANKED_COST
  const numGroups = groups.length;
  const numProjects = projects.length;

  const costMatrix: number[][] = [];

  for (let g = 0; g < numGroups; g++) {
    const row: number[] = [];
    const groupPrefs = prefMap.get(groups[g].id);

    for (let p = 0; p < numProjects; p++) {
      const projectId = projects[p].id;
      const rank = groupPrefs?.get(projectId);

      if (rank !== undefined && RANK_SCORES[rank] !== undefined) {
        // Convert score to cost: higher score = lower cost
        row.push(MAX_SCORE - RANK_SCORES[rank]);
      } else {
        // Unranked project: very high cost to discourage assignment
        row.push(UNRANKED_COST);
      }
    }
    costMatrix.push(row);
  }

  // 5. The matrix may be rectangular (22 groups × 23 projects).
  //    munkres-js handles rectangular matrices natively (it pads internally).
  //    The result will assign 22 groups to 22 projects, leaving 1 unassigned.

  // 6. Run the Hungarian Algorithm
  let result: [number, number][];
  try {
    result = munkres(costMatrix);
  } catch (err) {
    return {
      success: false,
      message: `Erreur dans l'algorithme: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 7. Build assignments
  const assignments: {
    group_id: string;
    project_id: number;
    rank_given: number | null;
    score: number;
    group_name: string;
    project_title: string;
    professor: string;
  }[] = [];

  let totalScore = 0;

  for (const [groupIdx, projectIdx] of result) {
    if (groupIdx >= numGroups || projectIdx >= numProjects) continue;

    const group = groups[groupIdx];
    const project = projects[projectIdx];
    const rank = prefMap.get(group.id)?.get(project.id) ?? null;
    const score = rank !== null ? (RANK_SCORES[rank] ?? 0) : 0;
    totalScore += score;

    assignments.push({
      group_id: group.id,
      project_id: project.id,
      rank_given: rank,
      score,
      group_name: group.group_name,
      project_title: project.title,
      professor: project.professor,
    });
  }

  // 8. Save to database (clear old assignments first)
  const { error: deleteError } = await supabase
    .from("assignments")
    .delete()
    .neq("id", 0); // Delete all rows

  if (deleteError) {
    return {
      success: false,
      message: "Erreur lors de la suppression des anciennes affectations.",
    };
  }

  const { error: insertError } = await supabase.from("assignments").insert(
    assignments.map(({ group_id, project_id, rank_given, score }) => ({
      group_id,
      project_id,
      rank_given,
      score,
    }))
  );

  if (insertError) {
    return {
      success: false,
      message: `Erreur lors de la sauvegarde: ${insertError.message}`,
    };
  }

  const maxPossibleScore = numGroups * MAX_SCORE; // 22 × 10 = 220

  return {
    success: true,
    message: `Affectation terminée ! Score total: ${totalScore}/${maxPossibleScore}`,
    assignments,
    totalScore,
    maxPossibleScore,
  };
}
