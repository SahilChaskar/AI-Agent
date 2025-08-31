// ChatWindow.tsx
import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import Sidebar from "./Sidebar";
import useChatStreaming from "../hooks/useChatStreaming";

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="layout">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        setActiveId={(id) => setActiveId(id)}
        startNewChat={startNewChat}
      />

      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">Berkshire RAG Chat</div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
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
          <button className="chat-send" type="submit" disabled={isStreaming || !input.trim()}>
            {isStreaming ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
