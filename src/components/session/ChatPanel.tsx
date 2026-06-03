"use client";

import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "~/lib/utils";
import { PromptInput } from "./PromptInput";

interface Version {
  id: string;
  versionNumber: number;
  prompt: string;
  createdAt: Date;
}

interface ChatPanelProps {
  versions: Version[];
  activeVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onSendPrompt: (prompt: string) => void;
  isGenerating: boolean;
  aiMessages: Record<string, string>;
  initialPrompt?: string;
}

export function ChatPanel({
  versions,
  activeVersionId,
  onSelectVersion,
  onSendPrompt,
  isGenerating,
  aiMessages,
  initialPrompt,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [versions.length, isGenerating]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white">
      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {versions.length === 0 && !isGenerating ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-2xl bg-gray-100 p-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-800">No prompts yet</p>
            <p className="mt-1 text-sm font-medium text-gray-400">Describe a UI below to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {versions.map((v) => (
              <div key={v.id} className="flex flex-col gap-2">
                {/* User prompt bubble */}
                <div className="flex justify-end">
                  <div
                    onClick={() => onSelectVersion(v.id)}
                    className={`cursor-pointer max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 transition ${
                      activeVersionId === v.id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    }`}
                  >
                    <p className="text-sm font-bold leading-relaxed">{v.prompt}</p>
                    <p className={`mt-1 text-xs font-medium ${activeVersionId === v.id ? "text-indigo-200" : "text-gray-400"}`}>
                      {formatDistanceToNow(new Date(v.createdAt))}
                    </p>
                  </div>
                </div>

                {/* AI response bubble */}
                {aiMessages[v.id] && (
                  <div className="ml-3 flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-3.5 py-2.5 shadow-sm">
                      <p className="text-sm font-medium leading-relaxed text-gray-700">{aiMessages[v.id]}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Generating indicator */}
            {isGenerating && (
              <div className="flex flex-col gap-2">
                {/* Pending user bubble skeleton */}
                <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="mb-2 h-3 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                </div>
                {/* AI thinking bubble */}
                <div className="ml-3 flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <PromptInput onSend={onSendPrompt} disabled={isGenerating} initialValue={initialPrompt} />
      </div>
    </aside>
  );
}
