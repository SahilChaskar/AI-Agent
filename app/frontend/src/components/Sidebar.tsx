import React from "react";
import type { Conversation } from "../hooks/useChatStreaming";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string) => void;
  startNewChat: () => void;
};

export default function Sidebar({ conversations, activeId, setActiveId, startNewChat }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="title">Chats</div>
        <button className="icon-btn new-chat-btn" onClick={startNewChat}>New</button>
      </div>

      <div className="sidebar-chats">
        {conversations.length === 0 && <div className="empty">No chats yet</div>}
        {conversations.map((c) => {
          const firstAgentMsg = c.messages.find((m) => m.role === "agent");
          return (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`chat-item ${activeId === c.id ? "active" : ""}`}
              title={c.title}
            >
              <div className="chat-item-title">{c.title || "New Chat"}</div>
              <div className="chat-item-sub">
                {firstAgentMsg ? firstAgentMsg.text.slice(0, 40) + "..." : "No response yet"}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
