import React, { useEffect, useMemo, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import Sidebar from "./Sidebar";
import useChatStreaming from "../hooks/useChatStreaming";
import PdfViewerModal from "./PdfViewerModal";

export default function ChatWindow() {
  const {
    conversations,
    activeId,
    setActiveId,
    startNewChat,
    messages,
    sendMessage,
    isStreaming,
  } = useChatStreaming();

  const [input, setInput] = useState("");
  const [showMemory, setShowMemory] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [lastAnimatedId, setLastAnimatedId] = useState<string | null>(null); //  Tracks which message animates now
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  //  When a new agent message starts (isPartial true), mark it for animation
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "agent" && lastMsg.isPartial) {
      if (lastAnimatedId !== lastMsg.id) {
        setLastAnimatedId(lastMsg.id); // Start animating new message
      }
    }
    //  When the current animated message finishes streaming, stop animating
    if (lastMsg && lastMsg.id === lastAnimatedId && !lastMsg.isPartial) {
      setTimeout(() => setLastAnimatedId(null), 500); // Small delay for smooth finish
    }
  }, [messages, lastAnimatedId]);

  // Compute memory preview (last N messages)
  const memoryWindow = 6;
  const memoryMessages = messages.slice(-memoryWindow);

  return (
    <div className="layout">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        setActiveId={(id) => setActiveId(id)}
        startNewChat={startNewChat}
      />

      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          Berkshire RAG Chat
          <button
            className="memory-toggle"
            onClick={() => setShowMemory((prev) => !prev)}
          >
            {showMemory ? "Hide Memory" : "Show Memory"}
          </button>
        </div>

        {/* Memory Panel */}
        {showMemory && (
          <div className="memory-panel">
            <div className="memory-title">
              Memory (last {memoryWindow} messages):
            </div>
            <ul>
              {memoryMessages.map((m) => (
                <li key={m.id} className={m.role}>
                  <strong>{m.role}:</strong> {m.text.slice(0, 50)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              onCitationClick={setSelectedPdf}
              isLast={m.id === lastAnimatedId} //  Only animate the currently streaming message
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chat-textbox"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isStreaming}
          />
          <button
            className="chat-send"
            type="submit"
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>

      {/* PDF Modal */}
      <PdfViewerModal
        isOpen={!!selectedPdf}
        pdfUrl={selectedPdf}
        onClose={() => setSelectedPdf(null)}
      />
    </div>
  );
}
