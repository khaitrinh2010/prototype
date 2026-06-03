"use client";

import { formatDistanceToNow } from "~/lib/utils";

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    updatedAt: Date;
    versions: { id: string; versionNumber: number; prompt: string }[];
  };
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDuplicating: boolean;
  isDeleting: boolean;
}

const PREVIEW_COLORS = [
  "from-violet-100 to-purple-200",
  "from-blue-100 to-cyan-200",
  "from-emerald-100 to-teal-200",
  "from-orange-100 to-amber-200",
  "from-pink-100 to-rose-200",
  "from-indigo-100 to-blue-200",
];

function getColor(id: string) {
  const index = id.charCodeAt(0) % PREVIEW_COLORS.length;
  return PREVIEW_COLORS[index]!;
}

export function SessionCard({
  session,
  onOpen,
  onDuplicate,
  onDelete,
  isDuplicating,
  isDeleting,
}: SessionCardProps) {
  return (
    <div
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className={`relative h-36 rounded-t-xl bg-gradient-to-br ${getColor(session.id)} overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-1.5 opacity-40">
            <div className="h-2 w-24 rounded-full bg-current" />
            <div className="h-2 w-16 rounded-full bg-current" />
            <div className="h-2 w-20 rounded-full bg-current" />
          </div>
        </div>
        <span className="absolute right-2 top-2 rounded-md bg-white/80 px-1.5 py-0.5 text-xs font-medium text-gray-600 backdrop-blur-sm">
          {session.versions.length}v
        </span>

        {/* Hover actions */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 bg-black/10 opacity-0 transition group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onDuplicate}
            disabled={isDuplicating}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            Duplicate
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium text-gray-900">{session.title}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {formatDistanceToNow(new Date(session.updatedAt))}
        </p>
      </div>
    </div>
  );
}
