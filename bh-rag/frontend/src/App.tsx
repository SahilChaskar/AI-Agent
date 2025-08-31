import React from "react";
import ChatWindow from "./components/ChatWindow";
import Sidebar from "./components/Sidebar";
import useChatStreaming from "./hooks/useChatStreaming";

export default function App() {
  const chat = useChatStreaming();

  return (
    <div className="h-screen w-screen flex bg-slate-50">
      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}
