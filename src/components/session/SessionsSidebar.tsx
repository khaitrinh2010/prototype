"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "~/lib/utils";

interface SessionsSidebarProps {
  currentSessionId: string;
  onClose: () => void;
}

export function SessionsSidebar({ currentSessionId, onClose }: SessionsSidebarProps) {
  const router = useRouter();
  const { data: sessions, isLoading } = api.session.list.useQuery();

  function navigate(id: string) {
    if (id === currentSessionId) { onClose(); return; }
    router.push(`/session/${id}`);
    onClose();
  }

  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-gray-100 px-4">
        <span className="text-sm font-bold text-gray-900">Sessions</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="flex flex-col gap-2 px-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : sessions?.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400">No sessions yet</p>
        ) : (
          <div className="flex flex-col gap-0.5 px-2">
            {sessions?.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(s.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-indigo-50 ring-1 ring-indigo-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <p className={`truncate text-sm font-semibold ${isActive ? "text-indigo-700" : "text-gray-800"}`}>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    {s.versions.length} version{s.versions.length !== 1 ? "s" : ""} · {formatDistanceToNow(new Date(s.updatedAt))}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Dashboard
        </button>
      </div>
    </div>
  );
}
