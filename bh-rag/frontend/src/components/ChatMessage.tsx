import type { ChatMessageType } from "../hooks/useChatStreaming";

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] p-3 rounded-lg ${message.role === "user" ? "bg-sky-600 text-white" : "bg-white border"}`}>
        <div className="whitespace-pre-wrap">{message.text}</div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 text-xs text-slate-500 space-y-1">
            <div className="font-medium">Citations</div>
            {message.citations.map((c, i) => (
              <Citation key={i} c={c} />
            ))}
          </div>
        )}

        {message.sourceDocuments && message.sourceDocuments.length > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            <div className="font-medium">Source Documents</div>
            <ul className="list-disc ml-4">
              {message.sourceDocuments.map((s, idx) => (
                <li key={idx}>
                  <a className="underline" href={s.url ?? "#"} target="_blank" rel="noreferrer">
                    {s.title ?? s.id ?? "Document"}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Citation({ c }: { c: any }) {
  // expected shape: { text, from, page, id } but flexible
  return (
    <div>
      <div className="text-xs">{c.text ?? c.quote ?? "—"}</div>
      <div className="text-[11px] text-slate-400">{c.from ? `${c.from}${c.page ? `, p.${c.page}` : ""}` : c.id}</div>
    </div>
  );
}
