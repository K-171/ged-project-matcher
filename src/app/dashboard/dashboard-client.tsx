"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Trophy,
  List,
  Search,
  User,
  GripVertical,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SortableProjectCard } from "@/components/sortable-project-card";
import { savePreferences } from "@/actions/save-preferences";
import { MAX_RANKS, RANK_SCORES, type Project } from "@/lib/types";

interface DashboardClientProps {
  profile: {
    group_name: string;
    member_1: string;
    member_2: string;
    member_3: string | null;
    is_admin: boolean;
  };
  projects: Project[];
  savedPreferences: { project_id: number; rank: number }[];
}

export function DashboardClient({
  profile,
  projects,
  savedPreferences,
}: DashboardClientProps) {
  // Initialize ranked list from saved preferences
  const initialRanked = savedPreferences
    .sort((a, b) => a.rank - b.rank)
    .map((p) => projects.find((proj) => proj.id === p.project_id)!)
    .filter(Boolean);

  const [rankedProjects, setRankedProjects] =
    useState<Project[]>(initialRanked);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(savedPreferences.length > 0);

  const rankedIds = useMemo(
    () => new Set(rankedProjects.map((p) => p.id)),
    [rankedProjects]
  );

  const availableProjects = useMemo(
    () =>
      projects.filter((p) => {
        if (rankedIds.has(p.id)) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.professor.toLowerCase().includes(q) ||
          p.id.toString() === q
        );
      }),
    [projects, rankedIds, searchQuery]
  );

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) ?? null,
    [projects, activeId]
  );

  const totalScore = useMemo(
    () =>
      rankedProjects.reduce(
        (sum, _, i) => sum + (RANK_SCORES[i + 1] ?? 0),
        0
      ),
    [rankedProjects]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeProjectItem = projects.find(
        (p) => p.id === (active.id as number)
      );
      if (!activeProjectItem) return;

      const isActiveInRanked = rankedIds.has(active.id as number);
      const isOverInRanked = rankedIds.has(over.id as number);

      // Moving from available to ranked
      if (!isActiveInRanked && (isOverInRanked || over.id === "ranked-zone")) {
        if (rankedProjects.length >= MAX_RANKS) return;
        setRankedProjects((prev) => {
          if (prev.find((p) => p.id === activeProjectItem.id)) return prev;
          const overIndex = prev.findIndex((p) => p.id === (over.id as number));
          if (overIndex >= 0) {
            const newArr = [...prev];
            newArr.splice(overIndex, 0, activeProjectItem);
            return newArr;
          }
          return [...prev, activeProjectItem];
        });
      }
    },
    [projects, rankedIds, rankedProjects.length]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const isActiveInRanked = rankedProjects.some(
        (p) => p.id === (active.id as number)
      );

      if (isActiveInRanked) {
        const isOverInRanked = rankedProjects.some(
          (p) => p.id === (over.id as number)
        );

        if (isOverInRanked) {
          // Reorder within ranked
          const oldIndex = rankedProjects.findIndex(
            (p) => p.id === (active.id as number)
          );
          const newIndex = rankedProjects.findIndex(
            (p) => p.id === (over.id as number)
          );
          if (oldIndex !== newIndex) {
            setRankedProjects((prev) => arrayMove(prev, oldIndex, newIndex));
          }
        }
      } else {
        // Add from available to ranked
        const activeProject = projects.find(
          (p) => p.id === (active.id as number)
        );
        if (
          activeProject &&
          rankedProjects.length < MAX_RANKS &&
          !rankedProjects.find((p) => p.id === activeProject.id)
        ) {
          setRankedProjects((prev) => [...prev, activeProject]);
        }
      }
    },
    [rankedProjects, projects]
  );

  const addToRanked = useCallback(
    (project: Project) => {
      if (rankedProjects.length >= MAX_RANKS) {
        toast.error(`Vous ne pouvez sélectionner que ${MAX_RANKS} projets.`);
        return;
      }
      if (rankedProjects.find((p) => p.id === project.id)) return;
      setRankedProjects((prev) => [...prev, project]);
    },
    [rankedProjects]
  );

  const removeFromRanked = useCallback((projectId: number) => {
    setRankedProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const clearAll = useCallback(() => {
    if (rankedProjects.length === 0) return;
    setRankedProjects([]);
    toast.success("Classement réinitialisé");
  }, [rankedProjects.length]);

  const handleSave = async () => {
    if (rankedProjects.length !== projects.length) {
      toast.error(`Vous devez classer les ${projects.length} projets.`);
      return;
    }

    setSaving(true);
    try {
      const result = await savePreferences(rankedProjects.map((p) => p.id));
      if (result.success) {
        toast.success(result.message);
        setHasSaved(true);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const [mobileTab, setMobileTab] = useState<"ranked" | "available">("available");

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bienvenue, {profile.group_name}</h1>
          <p className="text-muted-foreground text-sm">
            {profile.member_1} & {profile.member_2}{profile.member_3 ? ` & ${profile.member_3}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasSaved && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-400 border-green-500/30"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Soumis
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || rankedProjects.length !== projects.length}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* Mobile tab toggle */}
      <div className="flex gap-2 sm:hidden">
        <Button
          variant={mobileTab === "ranked" ? "default" : "outline"}
          onClick={() => setMobileTab("ranked")}
          className="flex-1"
        >
          <Trophy className="h-4 w-4 mr-1" />
          Classement ({rankedProjects.length})
        </Button>
        <Button
          variant={mobileTab === "available" ? "default" : "outline"}
          onClick={() => setMobileTab("available")}
          className="flex-1"
        >
          <List className="h-4 w-4 mr-1" />
          Disponibles ({availableProjects.length})
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Ranked Top 5 */}
          <Card className={`border-primary/20 ${mobileTab === "available" ? "hidden sm:block" : ""}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Votre classement</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {rankedProjects.length}/{projects.length}
                  </Badge>
                  {rankedProjects.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Tout effacer</span>
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                Classez tous les projets par ordre de préférence.
                Glissez-déposez ou cliquez pour ajouter, réordonnez par glisser-déposer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SortableContext
                items={rankedProjects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[320px]" id="ranked-zone">
                  {rankedProjects.length === 0 && (
                    <div className="flex items-center justify-center h-[300px] rounded-lg border-2 border-dashed border-muted-foreground/25">
                      <p className="text-sm text-muted-foreground text-center px-8">
                        Glissez vos projets préférés ici
                        <br />
                        ou cliquez sur un projet pour l&apos;ajouter
                      </p>
                    </div>
                  )}
                  {rankedProjects.map((project, index) => (
                    <SortableProjectCard
                      key={project.id}
                      project={project}
                      rank={index + 1}
                      onRemove={() => removeFromRanked(project.id)}
                    />
                  ))}
                </div>
              </SortableContext>

              {rankedProjects.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Score potentiel maximum:
                    </span>
                    <span className="font-semibold text-primary">
                      {totalScore} points
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Available Projects */}
          <Card className={`${mobileTab === "ranked" ? "hidden sm:block" : ""}`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Projets disponibles</CardTitle>
              </div>
              <CardDescription>
                {availableProjects.length} projet(s) disponible(s) sur{" "}
                {projects.length}
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, professeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh] sm:h-[500px] pr-3">
                <SortableContext
                  items={availableProjects.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {availableProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => addToRanked(project)}
                        className="w-full text-left group flex items-center gap-3 rounded-lg border p-4 sm:p-3 transition-colors bg-card/50 hover:bg-card hover:border-primary/30"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground opacity-50" />
                        <Badge
                          variant="outline"
                          className="text-xs min-w-[2rem] justify-center"
                        >
                          {project.id}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-2">
                            {project.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {project.professor}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </SortableContext>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeProject ? (
            <SortableProjectCard project={activeProject} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Sticky save button for mobile */}
      <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
        <Button
          onClick={handleSave}
          disabled={saving || rankedProjects.length !== projects.length}
          className="w-full gap-2 shadow-lg"
        >
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde..." : `Sauvegarder (${rankedProjects.length}/${projects.length})`}
        </Button>
      </div>
    </div>
  );
}
