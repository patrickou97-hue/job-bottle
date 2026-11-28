"use client";

import { ArrowUp, LoaderCircle } from "lucide-react";
import type { RefObject } from "react";
import "./assistant-composer.css";

export function AssistantComposer({ value, onChange, onSend, busy, label, placeholder, maxLength, inputRef, sendLabel = "发送消息" }: {
  value: string; onChange: (text: string) => void; onSend: () => void; busy: boolean; label: string;
  placeholder: string; maxLength: number; inputRef?: RefObject<HTMLTextAreaElement | null>; sendLabel?: string;
}) {
  return <form className="assistant-composer" onSubmit={event => { event.preventDefault(); if (!busy && value.trim()) onSend(); }}>
    <textarea ref={inputRef} aria-label={label} placeholder={placeholder} rows={2} maxLength={maxLength} value={value}
      onChange={event => onChange(event.target.value)} onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
          event.preventDefault();
          if (!busy && value.trim()) onSend();
        }
      }} />
    <button type="submit" disabled={busy || !value.trim()} aria-label={sendLabel}>
      {busy ? <LoaderCircle className="motion-safe:animate-spin" size={18} /> : <ArrowUp size={18} />}
    </button>
  </form>;
}
