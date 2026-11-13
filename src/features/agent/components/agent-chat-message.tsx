import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  skill?: string;
  contexts?: Array<{ id: string; label: string; source: string }>;
}

const feedbackOptions = [
  { label: "More detail", instruction: "Explain the missing steps and provide a concrete example." },
  { label: "Check accuracy", instruction: "Recheck the claims against the project sources and correct any mistakes." },
  { label: "Simplify", instruction: "Rewrite the explanation in simpler, shorter language." },
];

export function AgentChatMessage({ item, onFeedback }: { item: ChatMessage; onFeedback: (prompt: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const isAssistant = item.role === "assistant";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  const requestRevision = (instruction: string) => {
    const excerpt = item.text.replace(/\s+/g, " ").slice(0, 140);
    onFeedback(`About your answer beginning "${excerpt}${item.text.length > 140 ? "…" : ""}": ${instruction}`);
    setFeedbackOpen(false);
  };

  return (
    <article className={`agent-message ${item.role}`}>
      <div className="agent-message-heading">
        <span className="agent-message-avatar" aria-hidden="true">
          {item.role === "user" ? "Y" : item.role === "tool" ? "T" : "Q"}
        </span>
        <strong>{item.role === "user" ? "You" : item.role === "tool" ? "HyperTest runner" : "Q-Rex"}</strong>
      </div>
      {(item.skill || item.contexts?.length) && (
        <div className="agent-message-contexts">
          {item.skill && <span className="agent-message-skill">/{item.skill}</span>}
          {item.contexts?.map((context) => (
            <span key={context.id} title={context.source}>
              {context.label}
            </span>
          ))}
        </div>
      )}
      <div className={isAssistant ? "agent-message-body agent-message-markdown" : "agent-message-body"}>
        {isAssistant ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ alt }) => <span>{alt || "Image"}</span> }}>
            {item.text}
          </ReactMarkdown>
        ) : (
          <p>{item.text}</p>
        )}
      </div>
      {isAssistant && item.text.trim() && (
        <div className="agent-message-actions">
          <button type="button" onClick={() => void copy()} aria-label="Copy Q-Rex response">
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" aria-expanded={feedbackOpen} onClick={() => setFeedbackOpen((current) => !current)}>
            Improve response
          </button>
          {copyError && <span role="status">Copy failed. Select the text to copy it.</span>}
        </div>
      )}
      {isAssistant && feedbackOpen && (
        <div className="agent-message-feedback">
          <strong>What would help?</strong>
          <p>Choose a follow-up. You can edit it before sending.</p>
          <div>
            {feedbackOptions.map((option) => (
              <button key={option.label} type="button" onClick={() => requestRevision(option.instruction)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
