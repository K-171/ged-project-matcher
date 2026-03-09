"use client";

import { useState } from "react";
import { runMatchingAlgorithm } from "@/actions/match-projects";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Zap,
  Download,
  Users,
  BarChart3,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { Project } from "@/lib/types";

interface AssignmentRow {
  id: number;
  group_id: string;
  project_id: number;
  rank_given: number | null;
  score: number;
  run_at: string;
  profiles: { group_name: string; member_1: string; member_2: string; member_3: string | null };
  projects: { title: string; professor: string };
}

interface AdminClientProps {
  totalGroups: number;
  submittedGroups: number;
  groups: { id: string; group_name: string; member_1: string; member_2: string; member_3: string | null }[];
  projects: Project[];
  preferences: { group_id: string; project_id: number; rank: number }[];
  assignments: AssignmentRow[];
}

export function AdminClient({
  totalGroups,
  submittedGroups,
  groups,
  projects,
  preferences,
  assignments: initialAssignments,
}: AdminClientProps) {
  const [assignments, setAssignments] =
    useState<AssignmentRow[]>(initialAssignments);
  const [running, setRunning] = useState(false);
  const [totalScore, setTotalScore] = useState(
    initialAssignments.reduce((sum, a) => sum + a.score, 0)
  );

  const submissionPct =
    totalGroups > 0 ? (submittedGroups / totalGroups) * 100 : 0;

  const handleRunAlgorithm = async () => {
    setRunning(true);
    try {
      const result = await runMatchingAlgorithm();
      if (result.success) {
        toast.success(result.message);
        if (result.assignments) {
          // Map to the expected format
          const mapped: AssignmentRow[] = result.assignments.map((a, i) => ({
            id: i + 1,
            group_id: a.group_id,
            project_id: a.project_id,
            rank_given: a.rank_given,
            score: a.score,
            run_at: new Date().toISOString(),
            profiles: {
              group_name: a.group_name,
              member_1:
                groups.find((g) => g.id === a.group_id)?.member_1 ?? "",
              member_2:
                groups.find((g) => g.id === a.group_id)?.member_2 ?? "",
              member_3:
                groups.find((g) => g.id === a.group_id)?.member_3 ?? null,
            },
            projects: {
              title: a.project_title,
              professor: a.professor,
            },
          }));
          setAssignments(mapped);
          setTotalScore(result.totalScore ?? 0);
        }
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erreur lors de l'exécution de l'algorithme.");
    } finally {
      setRunning(false);
    }
  };

  const handleExportCSV = () => {
    if (assignments.length === 0) {
      toast.error("Aucune affectation à exporter.");
      return;
    }

    const headers = [
      "Binôme",
      "Membre 1",
      "Membre 2",
      "Membre 3",
      "Projet",
      "Professeur",
      "Choix",
      "Score",
    ];

    const rows = assignments.map((a) => [
      a.profiles.group_name,
      a.profiles.member_1,
      a.profiles.member_2,
      a.profiles.member_3 ?? "",
      `"${a.projects.title.replace(/"/g, '""')}"`,

      a.projects.professor,
      a.rank_given ? `Choix ${a.rank_given}` : "Non classé",
      a.score.toString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `affectations-ged-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier CSV téléchargé !");
  };

  const rankLabel = (rank: number | null) => {
    if (!rank) return <Badge variant="destructive">Non classé</Badge>;
    const colors: Record<number, string> = {
      1: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      2: "bg-gray-400/20 text-gray-300 border-gray-400/30",
      3: "bg-amber-600/20 text-amber-500 border-amber-600/30",
      4: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      5: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return (
      <Badge variant="outline" className={colors[rank] ?? ""}>
        Choix #{rank}
      </Badge>
    );
  };

  // Build per-group submission status
  const prefByGroup = new Map<string, number>();
  for (const p of preferences) {
    prefByGroup.set(p.group_id, (prefByGroup.get(p.group_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panneau d&apos;administration</h1>
        <p className="text-muted-foreground text-sm">
          Gérez les soumissions et lancez l&apos;algorithme d&apos;affectation.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Soumissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submittedGroups}/{totalGroups}
            </div>
            <Progress value={submissionPct} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(submissionPct)}% des binômes ont soumis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Score total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalScore}/{totalGroups * 10}
            </div>
            <Progress
              value={
                totalGroups > 0
                  ? (totalScore / (totalGroups * 10)) * 100
                  : 0
              }
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Score de satisfaction globale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Affectations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {assignments.length > 0
                ? `Dernier lancement : ${new Date(assignments[0]?.run_at).toLocaleDateString("fr-FR")}`
                : "Algorithme non exécuté"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleRunAlgorithm}
          disabled={running}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {running ? "Exécution en cours..." : "Lancer l'algorithme hongrois"}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={assignments.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Submission Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statut des soumissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Binôme</TableHead>
                <TableHead>Membres</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const count = prefByGroup.get(group.id) ?? 0;
                return (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      {group.group_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.member_1} & {group.member_2}{group.member_3 ? ` & ${group.member_3}` : ""}
                    </TableCell>
                    <TableCell>
                      {count >= 5 ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-400 border-green-500/30"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Soumis ({count}/5)
                        </Badge>
                      ) : count > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Partiel ({count}/5)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-400 border-red-500/30"
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Results Table */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résultats de l&apos;affectation</CardTitle>
            <CardDescription>
              Affectation optimale par algorithme hongrois — Score total :{" "}
              <strong>{totalScore}</strong> / {totalGroups * 10}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Binôme</TableHead>
                  <TableHead>Projet assigné</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Choix</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.profiles.group_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.profiles.member_1} & {a.profiles.member_2}{a.profiles.member_3 ? ` & ${a.profiles.member_3}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm line-clamp-2">
                        {a.projects.title}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.projects.professor}
                    </TableCell>
                    <TableCell>{rankLabel(a.rank_given)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {a.score}pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
