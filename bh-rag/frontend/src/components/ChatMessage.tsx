import React from "react";
import type { ChatMessageType } from "../hooks/useChatStreaming";

function Spinner() {
    return (
        <span className="spinner" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.4 31.4">
                    <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" from="0 25 25" to="360 25 25" />
                </circle>
            </svg>
        </span>
    );
}

export default function ChatMessage({ message }: { message: ChatMessageType }) {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <div className="chat-message user">
                <div className="bubble user-bubble" title={message.text}>
                    {message.text}
                </div>
            </div>
        );
    }

    const directText = message.text;
    const supporting = message.supportingEvidence;
    const context = message.contextualAnalysis;
    const cites = message.citations;

    return (
        <div className="chat-message agent">
            <div className="bubble agent-bubble">
                {directText && (
                    <div className="section">
                        <div className="section-title">Direct Answer</div>
                        <div className="section-body">
                            {directText}
                            {message.isPartial && (
                                <div className="loading-indicator">
                                    <Spinner />
                                    <span className="loading-text">Generating...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {Array.isArray(supporting) && supporting.length > 0 && (
                    <div className="section">
                        <div className="section-title">Supporting Evidence</div>
                        <ul className="section-list">
                            {supporting.map((ev, i) => <li key={i}>{ev}</li>)}
                        </ul>
                    </div>
                )}

                {Array.isArray(context) && context.length > 0 && (
                    <div className="section">
                        <div className="section-title">Contextual Analysis</div>
                        <ul className="section-list">
                            {context.map((ca, i) => <li key={i}>{ca}</li>)}
                        </ul>
                    </div>
                )}

                {Array.isArray(cites) && cites.length > 0 && (
                    <div className="section">
                        <div className="section-title">Source Documentation</div>
                        <ul className="citation-list">
                            {cites.map((src: any, i: number) => {
                                if (!src) return <li key={i}>Unknown source</li>;
                                const title = src.title || src.id || src.name || "Document";
                                const url = src.url || src.link;
                                const page = src.page ? ` (p. ${src.page})` : "";
                                return (
                                    <li key={i} className="citation-item">
                                        {url ? (
                                            <a className="citation-link" href={url} target="_blank" rel="noreferrer" title={src.link === '/data/letter/' ? "Exact year not found, showing all letters" : `Open ${title}`}>
                                                {title}{page}
                                                <span style={{ marginLeft: "6px", display: "inline-flex", alignItems: "center" }}>
                                                    📄
                                                </span>
                                            </a>
                                        ) : (
                                            <span className="citation-text">{title}{page}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
