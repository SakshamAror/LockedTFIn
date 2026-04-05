import { useState, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { runChatTask } from "@/lib/browserUseChat";
import { getSettings } from "@/components/SettingsPanel";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const { apiKey } = getSettings();
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { id: ++idRef.current, role: "assistant", content: "Please set your API key in Settings first." },
      ]);
      return;
    }

    const userMsg: Message = { id: ++idRef.current, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const response = await runChatTask(text, abortRef.current.signal);
      setMessages((prev) => [
        ...prev,
        { id: ++idRef.current, role: "assistant", content: response },
      ]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { id: ++idRef.current, role: "assistant", content: "Cancelled." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: ++idRef.current, role: "assistant", content: err.message || "Something went wrong." },
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="glass rounded-xl w-96 h-[540px] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground font-display">Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-8">
                Ask me anything — I'll run it as a task via Browser Use.
              </p>
            )}
            <div className="space-y-2.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-xs leading-relaxed max-w-[90%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "ml-auto bg-primary/20 text-foreground"
                      : "mr-auto bg-muted/50 text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running task…
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-border/30 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a task…"
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {loading ? (
              <Button size="icon" variant="ghost" onClick={handleCancel} className="h-7 w-7 shrink-0 text-destructive">
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="icon" variant="ghost" onClick={handleSend} disabled={!input.trim()} className="h-7 w-7 shrink-0 text-primary">
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-105 transition-transform glow-primary"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
