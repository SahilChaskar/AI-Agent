import React, { useState, useRef } from "react";
import ChatMessage from "./ChatMessage";
import useChatStreaming from "../hooks/useChatStreaming";
import type { ChatMessageType } from "../hooks/useChatStreaming";

export default function ChatWindow() {
  const { messages, sendMessage, isStreaming, cancel } = useChatStreaming();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <form onSubmit={submit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Buffett's views, acquisitions, strategy..."
            className="flex-1 px-3 py-2 rounded border focus:outline-none focus:ring"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-60"
          >
            Send
          </button>
          {isStreaming && (
            <button
              type="button"
              onClick={cancel}
              className="px-3 py-2 rounded border ml-2"
            >
              Stop
            </button>
          )}
        </form>
      </div>

      <div className="p-4 h-[60vh] overflow-y-auto space-y-4" id="messages">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      <div className="p-4 border-t bg-slate-50">
        <MemoryPanel messages={messages} />
      </div>
    </div>
  );
}

function MemoryPanel({ messages }: { messages: ChatMessageType[] }) {
  const lastFew = messages.slice(-6);
  return (
    <div>
      <div className="text-xs text-slate-600 mb-2">Conversation memory (last 6 messages)</div>
      <div className="flex gap-2">
        {lastFew.map((m) => (
          <div key={m.id} className="px-2 py-1 rounded bg-white border text-xs">
            <div className="font-medium">{m.role === "user" ? "You" : "Agent"}</div>
            <div className="truncate max-w-xs">{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
