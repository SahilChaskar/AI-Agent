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
                                updateMessage(convId, agentId, (prev) => {
                                    const newText = (prev.text || "") + parsed.delta;

                                    // Debug log for raw delta
                                    console.log("[DEBUG] Incoming delta chunk:", parsed.delta);

                                    // Check if this chunk includes Source Documentation and possibly a year
                                    let yearMatch = newText.match(/\b(19|20)\d{2}\b/);
                                    const year = yearMatch ? yearMatch[0] : null;

                                    // If no year in text, fallback to prompt
                                    if (!year) {
                                        const fallbackMatch = prompt.match(/\b(19|20)\d{2}\b/);
                                        if (fallbackMatch) {
                                            console.log("[DEBUG] No year in delta text, using fallback from prompt:", fallbackMatch[0]);
                                        }
                                    } else {
                                        console.log("[DEBUG] Year extracted from delta text:", year);
                                    }

                                    // If year exists and not already in citations, add it
                                    const existingLinks = prev.citations?.map(c => c.link) || [];
                                    if (year && !existingLinks.includes(`/data/letters/${year}.pdf`)) {
                                        const link = `/data/letters/${year}.pdf`;
                                        console.log("[DEBUG] Adding citation link:", link);
                                        return {
                                            ...prev,
                                            text: newText,
                                            citations: [...(prev.citations || []), { title: `Shareholder Letter ${year}`, link }]
                                        };
                                    }

                                    return { text: newText };
                                });
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

                                    const link = year ? `/data/letters/${year}.pdf` : '/data/letters/';
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
