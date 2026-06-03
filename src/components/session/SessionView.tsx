"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ChatPanel } from "./ChatPanel";
import { PreviewPanel } from "./PreviewPanel";
import { SessionsSidebar } from "./SessionsSidebar";
import { formatDistanceToNow } from "~/lib/utils";

interface SessionViewProps {
  sessionId: string;
}

export function SessionView({ sessionId }: SessionViewProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: project, isLoading } = api.session.getById.useQuery({ id: sessionId });
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<Record<string, string>>({});
  const [generationTimes, setGenerationTimes] = useState<Record<string, string>>({});
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const aiMessagesSeeded = useRef(false);
  const generationStartTime = useRef<number | null>(null);

  // Versions popover
  const [showVersions, setShowVersions] = useState(false);
  const versionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (versionsRef.current && !versionsRef.current.contains(e.target as Node))
        setShowVersions(false);
    }
    if (showVersions) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showVersions]);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const updateTitle = api.session.updateTitle.useMutation({
    onSuccess: () => {
      setEditingTitle(false);
      void utils.session.getById.invalidate({ id: sessionId });
      void utils.session.list.invalidate();
    },
  });

  const duplicateSession = api.session.duplicate.useMutation({
    onSuccess: (data) => router.push(`/session/${data.id}`),
  });

  const generateVersion = api.version.generate.useMutation({
    onSuccess: (data) => {
      void utils.session.getById.invalidate({ id: sessionId });
      setActiveVersionId(data.id);
      if (data.aiMessage) {
        setAiMessages((prev) => ({ ...prev, [data.id]: data.aiMessage! }));
      }
      if (generationStartTime.current !== null) {
        const elapsed = ((Date.now() - generationStartTime.current) / 1000).toFixed(1);
        setGenerationTimes((prev) => ({ ...prev, [data.id]: `${elapsed}s` }));
        generationStartTime.current = null;
      }
    },
  });

  // Seed aiMessages from DB on first load
  useEffect(() => {
    if (!project || aiMessagesSeeded.current) return;
    aiMessagesSeeded.current = true;
    const seeded: Record<string, string> = {};
    for (const v of project.versions) {
      if (v.aiMessage) seeded[v.id] = v.aiMessage;
    }
    if (Object.keys(seeded).length > 0) setAiMessages(seeded);
  }, [project]);

  useEffect(() => {
    const stored = sessionStorage.getItem("initialPrompt");
    if (stored) {
      sessionStorage.removeItem("initialPrompt");
      setInitialPrompt(stored);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-400">
        Session not found.
      </div>
    );
  }

  const activeVersion =
    project.versions.find((v) => v.id === activeVersionId) ??
    project.versions[project.versions.length - 1] ??
    null;

  function handleSendPrompt(prompt: string) {
    generationStartTime.current = Date.now();
    generateVersion.mutate({ sessionId, prompt, parentVersionId: activeVersion?.id });
  }

  function handleTitleBlur() {
    if (draftTitle.trim() && draftTitle !== project!.title) {
      updateTitle.mutate({ id: sessionId, title: draftTitle.trim() });
    } else {
      setEditingTitle(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* ── Full-width header ── */}
      <header className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-3 gap-1">
        <div className="flex items-center gap-1">
          {/* Sessions list toggle */}
          <button
            onClick={() => setShowSessionsList((v) => !v)}
            title="Browse sessions"
            className={`rounded-md p-1.5 transition ${showSessionsList ? "bg-gray-200 text-gray-800" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          {/* Chat panel toggle */}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Toggle chat panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </button>

          {/* Back */}
          <Link href="/dashboard" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="w-48 rounded-lg border border-gray-300 px-2 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-400"
            />
          ) : (
            <button
              onClick={() => { setDraftTitle(project.title); setEditingTitle(true); }}
              className="max-w-[220px] truncate px-1 text-sm font-bold text-gray-900 hover:text-gray-600"
            >
              {project.title}
            </button>
          )}

          {/* Versions popover */}
          <div ref={versionsRef} className="relative">
            <button
              onClick={() => setShowVersions((v) => !v)}
              title="Version history"
              className={`rounded-md p-1.5 transition ${showVersions ? "bg-gray-200 text-gray-800" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {showVersions && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-2xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Version history</p>
                </div>
                {project.versions.length === 0 ? (
                  <p className="px-4 py-3 text-sm font-medium text-gray-400">No versions yet</p>
                ) : (
                  <div className="flex flex-col py-1 max-h-72 overflow-y-auto">
                    {project.versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setActiveVersionId(v.id); setShowVersions(false); }}
                        className={`flex items-start gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 ${(activeVersionId ?? activeVersion?.id) === v.id ? "bg-gray-50" : ""}`}
                      >
                        <span className="mt-0.5 shrink-0 rounded-lg bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-bold text-gray-600">
                          v{v.versionNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-700">{v.prompt}</p>
                          <p className="mt-0.5 text-xs font-medium text-gray-400">{formatDistanceToNow(new Date(v.createdAt))}</p>
                        </div>
                        {(activeVersionId ?? activeVersion?.id) === v.id && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duplicate */}
          <button
            onClick={() => duplicateSession.mutate({ id: sessionId })}
            disabled={duplicateSession.isPending}
            title="Duplicate session"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          </button>
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {generateVersion.isPending && (
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
              <span className="text-xs font-bold text-indigo-600">Building…</span>
            </div>
          )}
          <button className="rounded-xl bg-gray-900 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-gray-700">
            Share
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions list sidebar */}
        {showSessionsList && (
          <SessionsSidebar
            currentSessionId={sessionId}
            onClose={() => setShowSessionsList(false)}
          />
        )}

        {/* Fixed 1/4.5 width chat panel */}
        <div
          style={{ width: sidebarCollapsed ? 0 : "calc(100% / 4.5)" }}
          className="shrink-0 overflow-hidden border-r border-gray-200 transition-all duration-200"
        >
          <ChatPanel
            versions={project.versions}
            activeVersionId={activeVersionId ?? activeVersion?.id ?? null}
            onSelectVersion={setActiveVersionId}
            onSendPrompt={handleSendPrompt}
            isGenerating={generateVersion.isPending}
            aiMessages={aiMessages}
            generationTimes={generationTimes}
            initialPrompt={initialPrompt}
          />
        </div>

        <PreviewPanel
          versions={project.versions}
          activeVersionId={activeVersionId ?? activeVersion?.id ?? null}
          isGenerating={generateVersion.isPending}
        />
      </div>
    </div>
  );
}
