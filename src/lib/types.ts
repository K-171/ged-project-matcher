export type Profile = {
  id: string;
  group_name: string;
  member_1: string;
  member_2: string;
  member_3: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Project = {
  id: number;
  title: string;
  professor: string;
  created_at: string;
};

export type Preference = {
  id: number;
  group_id: string;
  project_id: number;
  rank: number;
  created_at: string;
};

export type Assignment = {
  id: number;
  group_id: string;
  project_id: number;
  rank_given: number | null;
  score: number;
  run_at: string;
};

// Joined types for display
export type AssignmentWithDetails = Assignment & {
  profiles: Pick<Profile, "group_name" | "member_1" | "member_2">;
  projects: Pick<Project, "title" | "professor">;
};

export type PreferenceWithProject = Preference & {
  projects: Pick<Project, "title" | "professor">;
};

// Score mapping — rank 1 gets highest score, decreasing linearly
// rank 1 = 23pts, rank 2 = 22pts, ..., rank 23 = 1pt
export const TOTAL_PROJECTS = 23;
export const MAX_RANKS = TOTAL_PROJECTS;

export const RANK_SCORES: Record<number, number> = Object.fromEntries(
  Array.from({ length: TOTAL_PROJECTS }, (_, i) => [i + 1, TOTAL_PROJECTS - i])
);

export const TOTAL_GROUPS = 22;
