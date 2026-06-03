"use client";

import { PreviewIframe } from "./PreviewIframe";

interface Version {
  id: string;
  versionNumber: number;
  htmlContent: string;
}

interface PreviewPanelProps {
  versions: Version[];
  activeVersionId: string | null;
  isGenerating: boolean;
}

export function PreviewPanel({ versions, activeVersionId, isGenerating }: PreviewPanelProps) {
  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? null;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100">
      {versions.length === 0 && !isGenerating ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">Your prototype will appear here</p>
            <p className="mt-1 text-xs text-gray-400">Type a prompt on the left to get started</p>
          </div>
        </div>
      ) : isGenerating && !activeVersion ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            <p className="text-sm text-gray-500">Building your UI…</p>
          </div>
        </div>
      ) : activeVersion ? (
        <PreviewIframe html={activeVersion.htmlContent} />
      ) : null}

      {/* Generating overlay — shows over existing preview while regenerating */}
      {isGenerating && activeVersion && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-md">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <span className="text-xs text-gray-600">Updating…</span>
        </div>
      )}
    </div>
  );
}
