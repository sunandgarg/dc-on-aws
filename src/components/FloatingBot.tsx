import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import dcLogo from "@/assets/dc-logo.png";
import aiBotLogo from "@/assets/ai-bot-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { ChatMarkdown } from "@/components/AIChatFullScreen";
import { toast } from "sonner";
import { AILeadForm } from "@/components/AILeadForm";
import { functionUrl } from "@/lib/backendMode";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const CHAT_URL = functionUrl("ai-counselor");
const LEAD_URL = functionUrl("save-lead");

const DEFAULT_SUGGESTIONS = [
  "Top 5 engineering colleges in India",
  "Best colleges for MBA",
  "Career options after 12th Science",
  "Which entrance exams should I prepare for?",
  "How to get scholarships?",
];

export function FloatingBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadData, setLeadData] = useState<{ name: string; course: string; state: string; city: string } | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  const addBotMessage = (content: string) => {
    setMessages(prev => [...prev, { role: "assistant", content }]);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      // Always show lead form first
      setTimeout(() => {
        setShowLeadForm(true);
      }, 300);
    }
  };

  const handleLeadSubmit = (data: { name: string; course: string; state: string; city: string }) => {
    setLeadData(data);
    setShowLeadForm(false);
    
    const greeting = `Hi **${data.name}**! 👋\n\nHere's what I know about you:\n- **Course Interest:** ${data.course || "Not specified"}\n- **Location:** ${data.city ? `${data.city}, ${data.state}` : data.state || "India"}\n\nI'm ready to help you find the perfect college! Pick a question below or ask me anything! 🎓`;
    setMessages([{ role: "assistant", content: greeting }]);

    // If there was a pending query, process it
    if (pendingQuery) {
      setTimeout(() => streamAIResponse(pendingQuery, data), 500);
      setPendingQuery(null);
    }
  };

  const streamAIResponse = async (query: string, lead?: typeof leadData) => {
    setIsLoading(true);
    let assistantContent = "";
    const ld = lead || leadData;

    const contextMsg = ld?.name
      ? `[Student: ${ld.name}, Course: ${ld.course || "Not specified"}, State: ${ld.state || "Not specified"}, City: ${ld.city || "Not specified"}] ${query}`
      : query;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: contextMsg },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) toast.error("Too many requests. Please wait a moment.");
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } catch (error) {
      console.error("Bot error:", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userInput }]);
    setInput("");

    // If lead not collected, show lead form first
    if (!leadData) {
      setPendingQuery(userInput);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Great question! 🎯 To give you **personalized recommendations**, I need a few quick details.\n\nPlease fill the form - it takes less than 30 seconds! 📝"
      }]);
      setShowLeadForm(true);
      return;
    }

    streamAIResponse(userInput);
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
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={handleOpen}
            className="fixed bottom-20 lg:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-white shadow-glow flex items-center justify-center hover:scale-110 transition-transform active:scale-95 border-2 border-foreground/10"
            aria-label="Talk to AI Counselor"
          >
            <img src={aiBotLogo} alt="AI" className="w-10 h-10 object-contain" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-[10px] text-accent-foreground font-bold flex items-center justify-center animate-bounce-gentle">
              AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Lead form modal */}
      <AILeadForm
        isOpen={showLeadForm}
        onClose={() => { setShowLeadForm(false); if (!leadData && messages.length === 0) setIsOpen(false); }}
        onSubmit={handleLeadSubmit}
      />

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && !showLeadForm && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-[380px] md:max-w-[calc(100vw-2rem)] h-[85vh] md:h-[520px] md:max-h-[calc(100vh-4rem)] md:rounded-2xl rounded-t-2xl border border-border bg-card shadow-elevated flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                  <img src={dcLogo} alt="DekhoCampus AI" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">DekhoCampus AI</h3>
                  <p className="text-xs opacity-80">24/7 Career Counselor</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full w-8 h-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-accent" : "bg-secondary"}`}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5 text-accent-foreground" /> : <Bot className="w-3.5 h-3.5 text-secondary-foreground" />}
                  </div>
                  <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.role === "user" ? "user-bubble rounded-br-md" : "ai-bubble rounded-bl-md"}`}>
                    {msg.role === "assistant" ? (
                      <ChatMarkdown content={msg.content || "..."} navigate={navigate} onClose={() => setIsOpen(false)} />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-secondary-foreground" />
                  </div>
                  <div className="ai-bubble px-3 py-2 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}

              {/* Suggested queries */}
              {!isLoading && leadData && messages.length <= 3 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQueries.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setMessages(prev => [...prev, { role: "user", content: q }]);
                          streamAIResponse(q);
                        }}
                        className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-full text-foreground border border-border transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything about education..."
                  className="flex-1 rounded-xl text-sm h-10"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="bg-primary rounded-xl h-10 w-10" disabled={isLoading || !input.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
