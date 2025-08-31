import ChatWindow from "./components/ChatWindow";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Berkshire RAG Chat</h1>
          <p className="text-sm text-slate-600">Ask questions about Berkshire Hathaway letters</p>
        </header>

        <main>
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}
