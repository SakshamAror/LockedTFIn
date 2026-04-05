import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Loader2, Square, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { runChatTask, stopSession } from "@/lib/browserUseChat";
import { getSettings } from "@/components/SettingsPanel";

function renderMarkdown(text: string): string {
  // Escape HTML first
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted/50 px-1 py-0.5 rounded text-xs">$1</code>');
  return html;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ChatBubbleProps {
  onOpenChange?: (open: boolean) => void;
}

const SUGGESTIONS = [
  "Write me a professional email to my professor about missing class",
  "Find my next 1 hour long event",
  "Do I have a lab this week?",
  "Summarize my unread emails",
  "What meetings do I have tomorrow?",
  "Draft a follow-up email for my internship application",
  "When is my next free afternoon this week?",
  "Email my study group about meeting tonight",
  "Do I have any deadlines this weekend?",
  "Schedule a 30-min coffee chat tomorrow",
  "Find emails from my TA",
  "What's on my calendar today?",
];

function SuggestionCarousel({ onSelect, disabled }: { onSelect: (s: string) => void; disabled?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  // Auto-scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let speed = 0.5; // px per frame

    const step = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += speed;
        // Loop: when we've scrolled past the first set, jump back
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Duplicate suggestions for seamless loop
  const items = [...SUGGESTIONS, ...SUGGESTIONS];

  return (
    <div
      className="relative max-w-2xl mx-auto"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />

      {/* Scrollable suggestions */}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto px-8 py-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
        <style>{`.suggestion-scroll::-webkit-scrollbar { display: none; }`}</style>
        {items.map((s, i) => (
          <button
            key={`${s}-${i}`}
            onClick={() => onSelect(s)}
            disabled={disabled}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}

export function ChatBubble({ onOpenChange }: ChatBubbleProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleOpen = useCallback((value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  }, [onOpenChange]);

  const handleClose = useCallback(async () => {
    abortRef.current?.abort();
    setLoading(false);
    await stopSession();
    toggleOpen(false);
  }, [toggleOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

    if (!open) toggleOpen(true);

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
  }, [input, loading, open, toggleOpen]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  // Full-screen chat view
  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-fade-in">
        {/* Header */}
        <header className="glass-subtle flex items-center gap-3 px-6 py-4 border-b border-border/30 shrink-0">
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-foreground font-display">Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Running task…" : "Session active — send commands anytime"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleClose} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Close Session
          </Button>
        </header>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center mt-24">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground font-display mb-2">Your Email & Calendar Assistant</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                  I can help you manage your <span className="text-foreground font-medium">Gmail</span> and <span className="text-foreground font-medium">Google Calendar</span> — send emails, check your inbox, create events, update meetings, and more.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} min-w-0`}
              >
                <div
                  className={`text-sm leading-relaxed max-w-[75%] rounded-xl px-4 py-3 whitespace-pre-wrap break-words overflow-hidden ${
                    msg.role === "user"
                      ? "bg-primary/20 text-foreground"
                      : "glass text-foreground"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Running task…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestion carousel - always visible */}
        <div className="shrink-0 py-2 px-6 border-t border-border/20">
          <SuggestionCarousel onSelect={(s) => setInput(s)} disabled={loading} />
        </div>

        {/* Input bar */}
        <div className="glass-subtle border-t border-border/30 px-6 py-4 shrink-0">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a command…"
              disabled={loading}
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2"
            />
            {loading ? (
              <Button size="icon" variant="outline" onClick={handleCancel} className="h-9 w-9 shrink-0 text-destructive border-destructive/30">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="h-9 w-9 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Floating button
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        onClick={() => toggleOpen(true)}
        className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-105 transition-transform glow-primary"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
