"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { SessionCard } from "./SessionCard";

export function SessionGrid() {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: authSession } = useSession();

  const [prompt, setPrompt] = useState("");
  const [search, setSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resizable sidebar
  const SIDEBAR_MIN = 48;
  const SIDEBAR_MAX = 480;
  const SIDEBAR_DEFAULT = 256;
  const COLLAPSE_THRESHOLD = 120;
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = collapsed ? 0 : sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [collapsed, sidebarWidth]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (e.buttons === 0) {
        if (isDragging.current) {
          isDragging.current = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
        return;
      }
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const newWidth = dragStartWidth.current + delta;
      if (newWidth < COLLAPSE_THRESHOLD) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setSidebarWidth(Math.min(Math.max(newWidth, COLLAPSE_THRESHOLD), SIDEBAR_MAX));
      }
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const { data: sessions, isLoading } = api.session.list.useQuery();

  const createSession = api.session.create.useMutation({
    onSuccess: (data) => router.push(`/session/${data.id}`),
  });

  const deleteSession = api.session.delete.useMutation({
    onSuccess: () => utils.session.list.invalidate(),
  });

  const duplicateSession = api.session.duplicate.useMutation({
    onSuccess: (data) => {
      void utils.session.list.invalidate();
      router.push(`/session/${data.id}`);
    },
  });

  // Create session immediately, prompt will be sent once in the session page
  // We store the prompt in sessionStorage so the session page can pick it up
  function handleStart() {
    const trimmed = prompt.trim();
    if (!trimmed || createSession.isPending) return;
    sessionStorage.setItem("initialPrompt", trimmed);
    createSession.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  }

  const filtered = sessions?.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const userInitial = authSession?.user?.name?.[0]?.toUpperCase() ?? "U";
  const userImage = authSession?.user?.image;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Left sidebar ── */}
      <aside
        style={{ width: collapsed ? 0 : sidebarWidth }}
        className="relative flex shrink-0 flex-col border-r border-gray-200 bg-white overflow-hidden transition-none"
      >
        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-indigo-300 active:bg-indigo-400 transition-colors"
        />
        {/* Profile */}
        <div className="flex items-center gap-3 px-5 py-4">
          {userImage ? (
            <img src={userImage} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-white">
              {userInitial}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900">
            {authSession?.user?.name ?? "You"}
          </span>
          <svg className="ml-auto h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="text-sm text-gray-400">Search</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3">
          <div className="flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2.5">
            <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">Sessions</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-500 hover:bg-gray-50 cursor-pointer">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span className="text-sm font-medium">Captures</span>
          </div>
        </nav>

        {/* Recent */}
        {(sessions?.length ?? 0) > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto px-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recent</span>
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {sessions?.slice(0, 6).map((s, i) => {
              const icons = ["🔴", "🚀", "⚡", "🌊", "🎯", "💜"];
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/session/${s.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-gray-50"
                >
                  <span className="text-sm">{icons[i % icons.length]}</span>
                  <span className="truncate text-sm text-gray-700">{s.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom */}
        <div className="border-t border-gray-100 px-4 py-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col overflow-y-auto bg-gray-50">
        {/* Top bar */}
        <div className="flex h-11 items-center border-b border-gray-200 bg-white px-4 gap-2">
          {/* Sidebar toggle button */}
          <button
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                setSidebarWidth(SIDEBAR_DEFAULT);
              } else {
                setCollapsed(true);
              }
            }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title={collapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">Prototypes</span>
        </div>

        <div className="flex flex-1 flex-col px-8 py-8">
          {/* Hero */}
          <div className="mb-8 flex flex-col items-center py-8 text-center">
            {/* Icon */}
            <div className="mb-4">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="11" cy="11" r="5" fill="#6366f1" />
                <circle cx="25" cy="11" r="5" fill="#6366f1" />
                <circle cx="11" cy="25" r="5" fill="#6366f1" />
                <circle cx="25" cy="25" r="5" fill="#6366f1" />
              </svg>
            </div>

            <h1 className="mb-6 text-[2rem] font-extrabold tracking-tight text-gray-900">
              Build with your real product
            </h1>

            {/* Large chat box */}
            <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-sm">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start a session..."
                rows={3}
                className="w-full resize-none rounded-t-2xl px-4 pt-4 pb-2 text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              {/* Toolbar inside the box */}
              <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2.5">
                {/* Left icons */}
                <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>
                <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Base theme
                  <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-400">Plan</span>
                  <button
                    onClick={handleStart}
                    disabled={!prompt.trim() || createSession.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-700 disabled:opacity-30"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Start from the{" "}
              <span className="cursor-pointer text-indigo-500 hover:underline">extension</span>
              {", "}
              <span className="cursor-pointer text-indigo-500 hover:underline">captures</span>
              {", or a "}
              <span className="cursor-pointer text-indigo-500 hover:underline">public link</span>
            </p>
          </div>

          {/* Search + filter bar */}
          {(sessions?.length ?? 0) > 0 && (
            <div className="mb-5 flex items-center gap-3">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-48 rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-gray-300"
                />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
                Last edited
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
                Created by
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5" /></svg></button>
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg></button>
              </div>
            </div>
          )}

          {/* Session grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-xl border border-gray-200 bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 && search ? (
            <p className="text-center text-sm text-gray-400 py-12">No sessions match "{search}"</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={() => router.push(`/session/${s.id}`)}
                  onDuplicate={() => duplicateSession.mutate({ id: s.id })}
                  onDelete={() => deleteSession.mutate({ id: s.id })}
                  isDuplicating={duplicateSession.isPending}
                  isDeleting={deleteSession.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
