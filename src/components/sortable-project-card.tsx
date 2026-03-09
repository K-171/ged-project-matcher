"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RANK_SCORES, type Project } from "@/lib/types";

interface SortableProjectCardProps {
  project: Project;
  rank?: number;
  onRemove?: () => void;
  isOverlay?: boolean;
}

export function SortableProjectCard({
  project,
  rank,
  onRemove,
  isOverlay,
}: SortableProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rankColor = rank
    ? rank <= 3
      ? rank === 1
        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        : rank === 2
          ? "bg-gray-400/20 text-gray-300 border-gray-400/30"
          : "bg-amber-600/20 text-amber-500 border-amber-600/30"
      : rank <= 10
        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
        : ""
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-3 rounded-lg border p-3 transition-colors
        ${isDragging ? "opacity-50 border-dashed border-primary/50" : ""}
        ${isOverlay ? "shadow-2xl border-primary bg-card rotate-2" : ""}
        ${rank ? "bg-card hover:bg-accent/50" : "bg-card/50 hover:bg-card"}
      `}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none p-2 -m-2"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {rank && (
        <Badge
          variant="outline"
          className={`text-xs font-bold min-w-[2.5rem] justify-center ${rankColor}`}
        >
          #{rank}
        </Badge>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">
          {project.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {project.professor}
          </span>
        </div>
      </div>

      {rank && (
        <Badge variant="secondary" className="text-xs">
          {RANK_SCORES[rank]}pts
        </Badge>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 -m-1"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
