// import { useCallback, useRef, useState } from "react";
// import { nanoid } from "nanoid";

// export type ChatMessageType = {
//     id: string;
//     role: "user" | "agent";
//     text: string;
//     isPartial?: boolean;
//     citations?: any[]; // flexible shape
//     sourceDocuments?: any[];
// };

// type SendPayload = {
//     prompt: string;
//     // optionally include memory or other params
//     memory?: { role: string; text: string }[];
// };

// const CHAT_ENDPOINT = "http://localhost:3000/askNew";

// export default function useChatStreaming() {
//     const [messages, setMessages] = useState<ChatMessageType[]>([]);
//     const controllerRef = useRef<AbortController | null>(null);
//     const streamingRef = useRef(false);

//     function handleChunk(parsed: any, agentId: string) {
//         if (parsed == null) return;

//         // text tokens
//         if (typeof parsed.delta === "string") {
//             updateLast(agentId, (prev) => ({ text: (prev.text || "") + parsed.delta }));
//         }
//         if (typeof parsed.text === "string") {
//             updateLast(agentId, (prev) => ({ text: (prev.text || "") + parsed.text }));
//         }
//         if (typeof parsed.answer === "string") {
//             updateLast(agentId, (prev) => ({ text: (prev.text || "") + parsed.answer }));
//         }

//         // citations / docs (optional)
//         if (Array.isArray(parsed.citations)) {
//             updateLast(agentId, (prev) => ({
//                 citations: [...(prev.citations || []), ...parsed.citations],
//             }));
//         }
//         const docs = parsed.docs || parsed.sourceDocuments;
//         if (Array.isArray(docs)) {
//             updateLast(agentId, (prev) => ({
//                 sourceDocuments: [...(prev.sourceDocuments || []), ...docs],
//             }));
//         }

//         if (parsed.finished === true) {
//             updateLast(agentId, { isPartial: false });
//         }
//     }

//     const pushMessage = (m: ChatMessageType) =>
//         setMessages((s) => [...s, m]);

//     const updateLast = (
//         id: string,
//         patch: Partial<ChatMessageType> | ((m: ChatMessageType) => Partial<ChatMessageType>)
//     ) =>
//         setMessages((s) =>
//             s.map((m) => {
//                 if (m.id !== id) return m;
//                 if (typeof patch === "function") {
//                     return { ...m, ...patch(m) }; // merge the partial returned
//                 }
//                 return { ...m, ...patch };
//             })
//         );

//     const sendMessage = useCallback(async (prompt: string) => {
//         // append user message
//         const userMsg: ChatMessageType = {
//             id: nanoid(),
//             role: "user",
//             text: prompt,
//         };
//         pushMessage(userMsg);

//         // add placeholder agent message that will be filled progressively
//         const agentId = nanoid();
//         const agentMsg: ChatMessageType = {
//             id: agentId,
//             role: "agent",
//             text: "",
//             isPartial: true,
//             citations: [],
//             sourceDocuments: [],
//         };
//         pushMessage(agentMsg);

//         // prepare memory to send (last n messages)
//         const memory = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));

//         // start streaming
//         controllerRef.current?.abort();
//         const controller = new AbortController();
//         controllerRef.current = controller;
//         streamingRef.current = true;

//         try {
//             const payload: SendPayload = { prompt, memory };
//             const res = await fetch(CHAT_ENDPOINT, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(payload),
//                 signal: controller.signal,
//             });

//             if (!res.ok) {
//                 const txt = await res.text();
//                 updateLast(agentId, { text: `Error: ${res.status} ${res.statusText} - ${txt}`, isPartial: false });
//                 streamingRef.current = false;
//                 return;
//             }

//             const contentType = res.headers.get("content-type") || "";

//             // SSE stream
//             if (contentType.includes("text/event-stream")) {
//                 const reader = res.body!.getReader();
//                 const decoder = new TextDecoder();
//                 let buf = "";
//                 while (true) {
//                     const { done, value } = await reader.read();
//                     if (done) break;
//                     buf += decoder.decode(value, { stream: true });
//                     // SSE parsing: split on double newlines
//                     const parts = buf.split("\n\n");
//                     buf = parts.pop() || "";
//                     for (const part of parts) {
//                         // each event line starts with 'data:'
//                         const lines = part.split("\n");
//                         for (const line of lines) {
//                             if (line.startsWith("data:")) {
//                                 const data = line.slice(5).trim();
//                                 if (data === "[DONE]") {
//                                     updateLast(agentId, { isPartial: false });
//                                     streamingRef.current = false;
//                                     return;
//                                 }
//                                 // try parse json else treat as text
//                                 try {
//                                     const parsed = JSON.parse(data);
//                                     handleChunk(parsed, agentId);
//                                 } catch {
//                                     // raw text append
//                                     updateLast(agentId, (prev: any) => ({ text: (prev.text || "") + data }));
//                                 }
//                             }
//                         }
//                     }
//                 }
//             } else {
//                 // assume newline-delimited JSON or raw text chunks
//                 const reader = res.body!.getReader();
//                 const decoder = new TextDecoder();
//                 let done = false;
//                 let buffer = "";

//                 while (!done) {
//                     const r = await reader.read();
//                     done = !!r.done;
//                     const chunk = r.value ? decoder.decode(r.value, { stream: !done }) : "";
//                     buffer += chunk;

//                     // try to parse NDJSON: split by newline and parse lines that are full JSON
//                     const lines = buffer.split("\n");
//                     buffer = lines.pop() || "";

//                     for (const line of lines) {
//                         const trimmed = line.trim();
//                         if (!trimmed) continue;
//                         try {
//                             const parsed = JSON.parse(trimmed);
//                             handleChunk(parsed, agentId);
//                         } catch {
//                             // not JSON, treat as plain text append
//                             updateLast(agentId, (prev: any) => ({ text: (prev.text || "") + trimmed }));
//                         }
//                     }

//                     // if plain text streaming (no newline JSON), also append chunk directly
//                     if (!contentType.includes("application/json") && !chunk.includes("\n")) {
//                         updateLast(agentId, (prev: any) => ({ text: (prev.text || "") + chunk }));
//                     }
//                 }

//                 // handle any remaining buffer
//                 if (buffer.trim()) {
//                     try {
//                         const parsed = JSON.parse(buffer);
//                         handleChunk(parsed, agentId);
//                     } catch {
//                         updateLast(agentId, (prev: any) => ({ text: (prev.text || "") + buffer }));
//                     }
//                 }

//                 updateLast(agentId, { isPartial: false });
//                 streamingRef.current = false;
//             }
//         } catch (err: any) {
//             if (err.name === "AbortError") {
//                 updateLast(agentId, (prev: any) => ({ ...prev, isPartial: false }));
//                 streamingRef.current = false;
//             } else {
//                 updateLast(agentId, { text: `Stream error: ${err.message}`, isPartial: false });
//                 streamingRef.current = false;
//             }
//         }
//     }, [messages]);

//     const cancel = () => {
//         controllerRef.current?.abort();
//         streamingRef.current = false;
//     };

//     return {
//         messages,
//         sendMessage,
//         isStreaming: streamingRef.current,
//         cancel,
//     };
// }

// /** helper: handle structured chunks from your backend
//  * Expected chunk shapes supported:
//  *  { delta: "text", citations?: [], docs?: [], finished?: boolean }
//  *  { text: "some text", citations: [...], sourceDocuments: [...] }
//  */
import { useCallback, useRef, useState, useEffect } from "react";
import { nanoid } from "nanoid";

export type ChatMessageType = {
    id: string;
    role: "user" | "agent";
    text: string;
    isPartial?: boolean;
    citations: any[]; // [{ title?, link?, page? }]
    sourceDocuments?: any[];
    supportingEvidence: string[];
    contextualAnalysis: string[];
};

export type Conversation = {
    id: string;
    title: string;
    messages: ChatMessageType[];
};

const STORAGE_KEY = "app-conversations";
const ACTIVE_KEY = "app-active-id";
const CHAT_ENDPOINT = "http://localhost:3000/askNew";
const MEMORY_WINDOW = 6;

export default function useChatStreaming() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveIdState] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const setActiveId = (id: string | null) => {
        setActiveIdState(id);
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
    };

    // Load persisted state
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const savedActive = localStorage.getItem(ACTIVE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Conversation[];
                setConversations(parsed);
                if (savedActive && parsed.some((c) => c.id === savedActive)) {
                    setActiveIdState(savedActive);
                } else if (parsed.length > 0) {
                    setActiveIdState(parsed[parsed.length - 1].id);
                }
            }
            setHasLoaded(true);
        } catch (e) {
            console.warn("Could not load saved conversations:", e);
            setHasLoaded(true);
        }
    }, []);

    // Save to localStorage only after load
    useEffect(() => {
        if (!hasLoaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
            if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
        } catch (err) {
            console.warn("Could not save conversations:", err);
        }
    }, [conversations, activeId, hasLoaded]);

    const activeConv = conversations.find((c) => c.id === activeId) ?? null;

    const startNewChat = () => {
        const id = nanoid();
        const newConv: Conversation = { id, title: "New Chat", messages: [] };
        setConversations((prev) => [...prev, newConv]);
        setActiveId(id);
        return id;
    };

    const updateMessage = (
        convId: string,
        msgId: string,
        patch: Partial<ChatMessageType> | ((m: ChatMessageType) => Partial<ChatMessageType>)
    ) => {
        setConversations((prev) =>
            prev.map((c) =>
                c.id === convId
                    ? {
                        ...c,
                        messages: c.messages.map((m) =>
                            m.id !== msgId ? m : { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
                        ),
                    }
                    : c
            )
        );
    };

    const sendMessage = useCallback(
        async (prompt: string) => {
            if (isStreaming) return;

            let convId = activeId;
            if (!convId) convId = startNewChat();

            const userMsg: ChatMessageType = {
                id: nanoid(),
                role: "user",
                text: prompt,
                citations: [],
                supportingEvidence: [],
                contextualAnalysis: [],
            };

            setConversations((prev) =>
                prev.map((c) =>
                    c.id === convId
                        ? {
                            ...c,
                            messages: [...c.messages, userMsg],
                            title: c.title === "New Chat" ? prompt.slice(0, 50) : c.title,
                        }
                        : c
                )
            );

            const agentId = nanoid();
            const agentMsg: ChatMessageType = {
                id: agentId,
                role: "agent",
                text: "",
                isPartial: true,
                citations: [],
                supportingEvidence: [],
                contextualAnalysis: [],
            };
            setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, agentMsg] } : c)));

            const conv = conversations.find((c) => c.id === convId);
            const memory =
                conv?.messages
                    .slice(-MEMORY_WINDOW)
                    .map((m) => ({ role: m.role, text: m.text })) || [];

            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            setIsStreaming(true);

            try {
                const res = await fetch(CHAT_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt, memory }),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const txt = await res.text();
                    updateMessage(convId, agentId, { text: `Error ${res.status}: ${txt}`, isPartial: false });
                    setIsStreaming(false);
                    return;
                }

                const reader = res.body!.getReader();
                const decoder = new TextDecoder();
                let buf = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });

                    const parts = buf.split("\n\n");
                    buf = parts.pop() || "";

                    for (const part of parts) {
                        const line = part.split("\n").find((l) => l.startsWith("data:"));
                        if (!line) continue;
                        const data = line.slice(5).trim();

                        if (data === "[DONE]") {
                            updateMessage(convId, agentId, { isPartial: false });
                            setIsStreaming(false);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);

                            if (typeof parsed.delta === "string") {
                                updateMessage(convId, agentId, (prev) => ({ text: (prev.text || "") + parsed.delta }));
                            }
                            if (typeof parsed.directAnswer === "string") {
                                updateMessage(convId, agentId, (prev) => ({ text: (prev.text || "") + parsed.directAnswer }));
                            }
                            if (parsed.supportingEvidence) {
                                const ev = Array.isArray(parsed.supportingEvidence)
                                    ? parsed.supportingEvidence
                                    : [parsed.supportingEvidence];
                                updateMessage(convId, agentId, (prev) => ({
                                    supportingEvidence: [...(prev.supportingEvidence || []), ...ev],
                                }));
                            }
                            if (parsed.contextualAnalysis) {
                                const ca = Array.isArray(parsed.contextualAnalysis)
                                    ? parsed.contextualAnalysis
                                    : [parsed.contextualAnalysis];
                                updateMessage(convId, agentId, (prev) => ({
                                    contextualAnalysis: [...(prev.contextualAnalysis || []), ...ca],
                                }));
                            }
                            if (parsed.sourceDocumentation) {
                                const docs = Array.isArray(parsed.sourceDocumentation)
                                    ? parsed.sourceDocumentation
                                    : [parsed.sourceDocumentation];

                                console.log("[DEBUG] Raw sourceDocumentation:", docs);
                                console.log("[DEBUG] Current user prompt:", prompt);

                                const enhancedDocs = docs.map((doc: string | { title?: string; link?: string;[key: string]: any }, index: number) => {
                                    const extractYear = (text: string): string | null => {
                                        const match = text.match(/\b(19|20)\d{2}\b/);
                                        return match ? match[0] : null;
                                    };

                                    let year: string | null = null;

                                    if (typeof doc === "string") {
                                        year = extractYear(doc);
                                        console.log(`[DEBUG] Doc ${index}: String detected -> "${doc}", Extracted year:`, year);
                                    } else if (typeof doc === "object") {
                                        year = extractYear(doc.title || "");
                                        console.log(`[DEBUG] Doc ${index}: Object detected ->`, doc, "Extracted year:", year);
                                    }

                                    // Fallback: check user question (prompt)
                                    if (!year) {
                                        year = extractYear(prompt);
                                        console.log(`[DEBUG] Doc ${index}: No year in doc, fallback from prompt ->`, year);
                                    }

                                    const link = year ? `/data/letter/${year}.pdf` : '/data/letter/';
                                    console.log(`[DEBUG] Final link for Doc ${index}:`, link);

                                    if (typeof doc === "string") {
                                        return { title: doc, link };
                                    } else {
                                        return { ...doc, link };
                                    }
                                });

                                console.log("[DEBUG] Enhanced Docs with links:", enhancedDocs);

                                updateMessage(convId, agentId, (prev) => ({
                                    citations: [...(prev.citations || []), ...enhancedDocs],
                                }));
                            }

                        } catch {
                            updateMessage(convId, agentId, (prev) => ({ text: (prev.text || "") + data }));
                        }
                    }
                }

                if (buf.trim()) {
                    try {
                        const parsed = JSON.parse(buf);
                        if (parsed.delta) {
                            updateMessage(convId, agentId, (prev) => ({ text: (prev.text || "") + parsed.delta }));
                        }
                    } catch {
                        updateMessage(convId, agentId, (prev) => ({ text: (prev.text || "") + buf }));
                    }
                }

                updateMessage(convId, agentId, { isPartial: false });
            } catch (err: any) {
                updateMessage(convId, agentId, { text: `Stream error: ${err?.message || String(err)}`, isPartial: false });
            } finally {
                setIsStreaming(false);
            }
        },
        [activeId, conversations, isStreaming]
    );

    return {
        conversations,
        activeConv,
        activeId,
        setActiveId,
        startNewChat,
        sendMessage,
        isStreaming,
        messages: activeConv?.messages || [],
        cancel: () => {
            controllerRef.current?.abort();
            setIsStreaming(false);
        },
    };
}
