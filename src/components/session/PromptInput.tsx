"use client";

import { useState, useRef } from "react";

interface PromptInputProps {
  onSend: (prompt: string) => void;
  disabled: boolean;
  initialValue?: string;
}

export function PromptInput({ onSend, disabled, initialValue = "" }: PromptInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  if (disabled) {
    return (
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
          </div>
          <span className="text-sm font-semibold text-indigo-600">Building your UI…</span>
        </div>
        <p className="mt-1.5 text-xs text-indigo-400">Claude is generating your prototype</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 transition focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-sm">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Describe a UI or a change…"
        rows={2}
        className="w-full resize-none bg-transparent px-1 py-1 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none"
      />
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-xs font-medium text-gray-400">↵ Enter to send</span>
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="rounded-xl bg-gray-900 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </div>
  );
}
