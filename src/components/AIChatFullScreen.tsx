import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, ArrowLeft } from "lucide-react";
import diyaAiLogo from "@/assets/diya-ai-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import { functionUrl } from "@/lib/backendMode";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = functionUrl("ai-counselor");
const DC_HEADING = "### ✅ Apply directly on DekhoCampus";

interface AIChatFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  leadData?: { name: string; course: string; state: string; city: string };
  onRequestLeadForm?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  "Top 5 engineering colleges in India",
  "Best colleges for MBA",
  "Career options after 12th Science",
  "Which entrance exams should I prepare for?",
  "How to get scholarships?",
];

/* ─── Helpers: resolve any AI link to an internal SPA path when possible ─── */
const INTERNAL_PREFIXES = ["/colleges/", "/courses/", "/exams/", "/articles/", "/scholarships/", "/careers/"];

function toInternalPath(href: string | undefined): string | null {
  if (!href) return null;
  try {
    // Absolute URL? Convert to path if same-origin or one of our known hosts.
    if (/^https?:\/\//i.test(href)) {
      const u = new URL(href);
      const sameOrigin = u.origin === window.location.origin;
      const isOurDomain = /(^|\.)dekhocampus\.com$/i.test(u.hostname) || /\.lovable\.app$/i.test(u.hostname);
      if (sameOrigin || isOurDomain) {
        const path = u.pathname + u.search + u.hash;
        if (INTERNAL_PREFIXES.some((p) => path.startsWith(p))) return path;
      }
      return null;
    }
    // Already a relative path
    if (href.startsWith("/")) {
      if (INTERNAL_PREFIXES.some((p) => href.startsWith(p))) return href;
    }
  } catch { /* ignore */ }
  return null;
}

function makeLinkRenderer(
  navigate: (p: string) => void,
  onClose: () => void,
  variant: "base" | "highlight",
) {
  return ({ href, children }: any) => {
    const internal = toInternalPath(href);
    const text = typeof children === "string" ? children : "";
    const isApply = text.includes("Apply");

    const className =
      variant === "highlight"
        ? isApply
          ? "dc-apply-btn"
          : "dc-highlight-link"
        : "text-primary underline underline-offset-2 font-medium";

    if (internal) {
      return (
        <a
          href={internal}
          className={className}
          onClick={(e) => {
            // Plain left-click → SPA navigate (instant, no full reload)
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onClose();
            // defer slightly so close animation doesn't fight router
            setTimeout(() => navigate(internal), 0);
          }}
        >
          {children}
        </a>
      );
    }

    // External link
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  };
}

export function ChatMarkdown({
  content,
  navigate,
  onClose,
}: {
  content: string;
  navigate: (p: string) => void;
  onClose: () => void;
}) {
  const baseLink = makeLinkRenderer(navigate, onClose, "base");
  const highlightLink = makeLinkRenderer(navigate, onClose, "highlight");

  const idx = content.indexOf(DC_HEADING);
  if (idx === -1) {
    return (
      <div className="prose prose-sm max-w-none text-foreground">
        <ReactMarkdown components={{ a: baseLink }}>{content}</ReactMarkdown>
      </div>
    );
  }

  const before = content.slice(0, idx);
  let afterHeading = content.slice(idx + DC_HEADING.length);
  if (afterHeading.startsWith("\n")) afterHeading = afterHeading.slice(1);

  const nextHeadingMatch = afterHeading.match(/\n#{1,3}\s/);
  const dcSection = nextHeadingMatch ? afterHeading.slice(0, nextHeadingMatch.index) : afterHeading;
  const rest = nextHeadingMatch ? afterHeading.slice(nextHeadingMatch.index + 1) : "";

  return (
    <>
      {before && (
        <div className="prose prose-sm max-w-none text-foreground">
          <ReactMarkdown components={{ a: baseLink }}>{before}</ReactMarkdown>
        </div>
      )}
      <div className="dc-highlight-card">
        <div className="dc-highlight-header">
          <span className="dc-highlight-badge">DekhoCampus</span>
          <span className="dc-highlight-title">Apply directly on DekhoCampus</span>
        </div>
        <div className="dc-highlight-body">
          <ReactMarkdown
            components={{
              a: highlightLink,
              p: ({ children }: any) => <p className="m-0 mb-2 text-[0.82rem] leading-relaxed">{children}</p>,
              ul: ({ children }: any) => <ul className="list-disc pl-[1.1rem] m-0">{children}</ul>,
              li: ({ children }: any) => <li className="mb-1 text-[0.82rem] leading-relaxed">{children}</li>,
            }}
          >
            {dcSection}
          </ReactMarkdown>
        </div>
      </div>
      {rest && (
        <div className="prose prose-sm max-w-none text-foreground">
          <ReactMarkdown components={{ a: baseLink }}>{rest}</ReactMarkdown>
        </div>
      )}
    </>
  );
}

export function AIChatFullScreen({ isOpen, onClose, initialMessage, leadData, onRequestLeadForm }: AIChatFullScreenProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasCollectedLead, setHasCollectedLead] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInit = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Initialize: greet and prefill input (do NOT auto-send)
  useEffect(() => {
    if (isOpen && !hasInit.current) {
      hasInit.current = true;
      
      if (leadData?.name) {
        setHasCollectedLead(true);
        const greeting = `Hi **${leadData.name}**! 👋\n\nI'm ready to help you find the perfect college. Ask me anything!`;
        setMessages([{ role: "assistant", content: greeting }]);
      } else {
        setMessages([{ role: "assistant", content: "Hi! 👋 I'm your AI education counselor. Ask me anything about colleges, courses, or exams!" }]);
      }
      // Prefill search bar with initial message - user decides when to send
      if (initialMessage) {
        setInput(initialMessage);
      }
    }
  }, [isOpen, leadData, initialMessage]);

  // When lead data arrives after form
  useEffect(() => {
    if (leadData?.name && isOpen && hasInit.current && !hasCollectedLead) {
      setHasCollectedLead(true);
      const infoMsg = `Great! Here's what I know about you:\n\n👤 **Name:** ${leadData.name}\n📚 **Course Interest:** ${leadData.course || "Not specified"}\n📍 **Location:** ${leadData.city ? `${leadData.city}, ${leadData.state}` : leadData.state || "India"}\n\nI'll use this to give you personalized recommendations! Pick a question below or ask me anything:`;
      setMessages(prev => [...prev, { role: "assistant", content: infoMsg }]);
      
      if (pendingQuery) {
        setTimeout(() => streamChat(pendingQuery), 500);
        setPendingQuery(null);
      }
    }
  }, [leadData, isOpen, hasCollectedLead]);

  useEffect(() => {
    if (!isOpen) hasInit.current = false;
  }, [isOpen]);

  const streamChat = useCallback(async (userMessage: string) => {
    const userMsg: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput("");

    const contextPrefix = leadData
      ? `[Student: ${leadData.name}, Course: ${leadData.course || "Not specified"}, State: ${leadData.state || "Not specified"}, City: ${leadData.city || "Not specified"}] `
      : "";

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: contextPrefix + userMessage },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) toast.error("Too many requests. Please wait.");
        else toast.error("Failed to get response.");
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, leadData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();

    // If lead not collected, show lead form first
    if (!hasCollectedLead && onRequestLeadForm) {
      setMessages(prev => [...prev, { role: "user", content: userInput }]);
      setInput("");
      setPendingQuery(userInput);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Great question! 🎯 To give you **personalized recommendations**, I need a few quick details.\n\nPlease fill the form that just appeared - it takes less than 30 seconds! 📝"
      }]);
      onRequestLeadForm();
      return;
    }

    streamChat(userInput);
  };

  const handleNewChat = () => {
    setMessages([]);
    hasInit.current = false;
    setHasCollectedLead(false);
    // Re-open lead form for new chat
    if (onRequestLeadForm) {
      onRequestLeadForm();
    }
    setMessages([{ role: "assistant", content: "Hi! 👋 Please fill in your details to get started! 📝" }]);
  };

  const suggestedQueries = leadData?.name
    ? [
        `Top 5 colleges for ${leadData.course || "B.Tech"} in ${leadData.state || "India"}`,
        `Best colleges in ${leadData.city || leadData.state || "India"}`,
        "Career options and salary packages",
        "Which entrance exams should I prepare for?",
        "How to get scholarships?",
      ]
    : DEFAULT_SUGGESTIONS;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img src={diyaAiLogo} alt="Diya AI" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h1 className="font-bold text-foreground text-sm">Diya AI</h1>
                  <p className="text-xs text-muted-foreground">Your education guide</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewChat} className="rounded-xl text-xs">
                New Chat
              </Button>
            </header>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-accent" : "bg-secondary"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-accent-foreground" /> : <img src={diyaAiLogo} alt="Diya" className="w-5 h-5 object-contain" />}
                    </div>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${msg.role === "user" ? "user-bubble rounded-br-md" : "ai-bubble rounded-bl-md"}`}>
                      {msg.role === "assistant" ? (
                        <>
                          <ChatMarkdown content={msg.content || "..."} navigate={navigate} onClose={onClose} />
                          {msg.content && msg.content.trim().length > 20 && (
                            <AIDisclaimer
                              source="ai_counselor"
                              compact
                              content={msg.content}
                              excerpt={msg.content.replace(/[#*`>_\-]/g, " ").slice(0, 200)}
                              context={{ message_index: i }}
                            />
                          )}
                        </>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                      <img src={diyaAiLogo} alt="Diya" className="w-5 h-5 object-contain" />
                    </div>
                    <div className="ai-bubble px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}

                {/* Suggested queries */}
                {!isLoading && hasCollectedLead && messages.length <= 3 && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQueries.map((q) => (
                        <button
                          key={q}
                          onClick={() => streamChat(q)}
                          className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-full text-foreground border border-border transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 flex gap-3">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about education..."
                  className="flex-1 rounded-xl text-sm py-5"
                  disabled={isLoading}
                />
                <Button type="submit" className="rounded-xl bg-primary px-5" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
