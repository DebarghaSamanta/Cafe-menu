import { useRef, useState } from "react";
import { sendChatMessage } from "../services/api";
import MenuItemCard from "./MenuItemCard";

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ChatWidget({ tableToken, onAddToCart, onCustomize }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        'Hi! Tell me what you\'re in the mood for — e.g. "spicy pasta under ₹250" — and I\'ll find a few options.',
      items: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const sessionIdRef = useRef(generateSessionId());

  async function handleSend(event) {
    event.preventDefault();

    const text = input.trim();
    if (!text || isSending) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, items: [] },
    ]);
    setInput("");
    setIsSending(true);
    setError("");

    try {
      const data = await sendChatMessage(
        tableToken,
        sessionIdRef.current,
        text
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          items: data.recommended_items || [],
        },
      ]);
    } catch (err) {
      setError(
        err.message || "Unable to reach the recommendation assistant."
      );
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chat-fab"
        onClick={() => setIsOpen(true)}
      >
        Ask for a recommendation
      </button>
    );
  }

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <h3>Cafe Guide</h3>
        <button
          type="button"
          className="modal-close"
          onClick={() => setIsOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message chat-message-${msg.role}`}
          >
            <p>{msg.content}</p>

            {msg.items.length > 0 && (
              <div className="chat-recommendations">
                {msg.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={onAddToCart}
                    onCustomize={onCustomize}
                    cartQuantity={0}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {isSending && <p className="chat-typing">Thinking...</p>}
        {error && <p className="chat-error">{error}</p>}
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. spicy pasta under ₹250"
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWidget;