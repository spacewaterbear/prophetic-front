"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Menu, Plus, MessageSquare, LogOut, Check, X, Copy, Share2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, lazy, Suspense, memo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "@/components/ModelSelector";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareButton } from "@/components/ShareButton";
import { toast } from "sonner";

// Lazy load Markdown component to reduce initial bundle size
const Markdown = lazy(() => import("@/components/Markdown").then(mod => ({ default: mod.Markdown })));

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  created_at: string;
}

interface Conversation {
  id: number;
  title: string | null;
  model: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Reusable AI Avatar component to prevent duplicate image loads
const AIAvatar = memo(() => (
  <div className="w-10 h-10 mt-1 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
    <Image
      src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
      alt="Prophetic Orchestra"
      width={40}
      height={40}
      className="w-full h-full object-cover"
      priority
    />
  </div>
));

AIAvatar.displayName = "AIAvatar";

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ message, userName }: { message: Message; userName: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div
      className={`flex gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start"}`}
    >
      {message.sender === "ai" && <AIAvatar />}
      <div className="group relative">
        <div
          className={`max-w-2xl pl-6 pr-12 py-4 rounded-2xl ${
            message.sender === "user"
              ? "bg-custom-brand text-white"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          }`}
        >
          {message.sender === "user" ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
              <Markdown content={message.content} className="text-sm" />
            </Suspense>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className={`absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
            message.sender === "user"
              ? "text-white hover:bg-white/20"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          aria-label="Copy message"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {message.sender === "user" && (
        <div className="w-10 h-10 mt-1 rounded-full bg-custom-brand flex items-center justify-center text-white font-medium flex-shrink-0 leading-none text-lg">
          {userName}
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = "MessageItem";

// Example prompts - moved outside component to prevent recreation on every render
const examplePrompts = [
  "Propose me an investment portfolio for $150K",
  "What watches should I buy with a $50K investment?",
  "Which NFTs are worth buying with a $50K budget?",
  "Propose me an investment portfolio for $50K"
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default to closed on mobile, open on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // Tailwind's md breakpoint
    }
    return false; // Default to closed for SSR
  });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.7-sonnet");

  // Redirect to login if not authenticated or to registration-pending if unauthorized
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (status === "authenticated" && (session?.user as any)?.status === 'unauthorized') {
      router.push("/registration-pending");
    }
  }, [status, session, router]);

  // Load conversations on mount
  useEffect(() => {
    if (session?.user) {
      loadConversations();
    }
  }, [session]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error("Failed to load conversations:", response.status);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadConversation = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setCurrentConversationId(conversationId);
        // Update selected model from conversation
        if (data.conversation?.model) {
          setSelectedModel(data.conversation.model);
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const createNewConversation = () => {
    // Just clear the current chat state
    // The conversation will be created in the database when the first message is sent
    setCurrentConversationId(null);
    setMessages([]);
    setStreamingMessage("");
  };

  const deleteConversation = async (conversationId: number, e: React.MouseEvent) => {
    // Prevent the click from triggering the conversation load
    e.stopPropagation();

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove the conversation from the list
        setConversations(prev => prev.filter(c => c.id !== conversationId));

        // If we deleted the current conversation, clear the chat
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
          setStreamingMessage("");
        }
      } else {
        console.error("Failed to delete conversation:", response.status);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);

    // Update the current conversation's model if there is one
    if (currentConversationId) {
      try {
        await fetch(`/api/conversations/${currentConversationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: newModel }),
        });
      } catch (error) {
        console.error("Error updating conversation model:", error);
      }
    }
  };

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Image
              src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/logo_prophetic_v2.png"
              alt="Prophetic Orchestra"
              width={128}
              height={128}
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const handleSend = async (messageToSend?: string) => {
    const userInput = messageToSend || input;
    if (!userInput.trim() || isLoading) return;

    setInput("");
    setIsLoading(true);
    setStreamingMessage("");

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: Date.now(), // Temporary ID
      content: userInput,
      sender: "user",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        // Generate title from user's question (first 50 chars)
        const title = userInput.length > 50
          ? userInput.substring(0, 50) + "..."
          : userInput;

        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title,
            model: selectedModel
          }),
        });

        if (response.ok) {
          const data = await response.json();
          conversationId = data.conversation.id;
          setCurrentConversationId(conversationId);
          await loadConversations();
        }
      }

      if (!conversationId) {
        throw new Error("Failed to create conversation");
      }

      // Send message with streaming
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userInput }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let streamContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === "chunk") {
              streamContent += data.content;
              setStreamingMessage(streamContent);
            } else if (data.type === "done") {
              // Reload conversation to get all messages
              await loadConversation(conversationId);
              setStreamingMessage("");
            } else if (data.type === "error") {
              console.error("Stream error:", data.error);
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-900 dark:bg-black text-white flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-700 dark:border-gray-800">
          <Button
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg"
            onClick={createNewConversation}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-2">Recent Chats</div>
            {conversations.length === 0 ? (
              <div className="text-xs text-gray-500 px-3 py-2">No conversations yet</div>
            ) : (
              conversations.map((conversation) => (
                <div key={conversation.id} className="relative group">
                  <button
                    onClick={() => loadConversation(conversation.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                      currentConversationId === conversation.id
                        ? "bg-white/20 border border-white/30 shadow-sm"
                        : "hover:bg-white/10 border border-transparent"
                    }`}
                  >
                    <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
                      currentConversationId === conversation.id ? "text-blue-400" : ""
                    }`} />
                    <span className={`truncate ${
                      currentConversationId === conversation.id ? "font-medium" : ""
                    }`}>{conversation.title}</span>
                  </button>
                  <button
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                    aria-label="Delete conversation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 dark:border-gray-800 space-y-2">
          {session?.user && (
            <div className="px-3 py-2 rounded-lg bg-white/5 mb-2">
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm transition-colors flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Image
                src="https://ext.same-assets.com/4250389560/3143870090.png"
                alt="Prophetic Orchestra"
                width={180}
                height={45}
                className="h-10 w-auto"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              disabled={isLoading}
            />
            <ThemeToggle />
            <ShareButton
              conversationId={currentConversationId}
              disabled={isLoading}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 && !streamingMessage && (
            <div className="max-w-3xl mx-auto mb-12">
              <div className="text-center mb-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center overflow-hidden">
                  <Image
                    src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
                    alt="Prophetic Orchestra"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-4xl font-light mb-4 dark:text-white">Secure the advantage in nine luxury segments</h2>
                <p className="text-gray-600 dark:text-gray-400">Powered by Score Orchestra™ and TTT Token technology</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examplePrompts.map((prompt, i) => (
                  <Card
                    key={i}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    onClick={() => handleSend(prompt)}
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center">{prompt}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userName={session?.user?.name?.[0]?.toUpperCase() || "U"}
              />
            ))}

            {/* Typing indicator - shown when waiting for AI response */}
            {isLoading && !streamingMessage && (
              <div className="flex gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-2xl px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Streaming message - shown while AI is responding */}
            {streamingMessage && (
              <div className="flex gap-4 items-start justify-start">
                <AIAvatar />
                <div className="max-w-2xl px-6 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
                    <Markdown content={streamingMessage} className="text-sm" />
                  </Suspense>
                  <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-1 rounded-sm"></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-start">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about luxury investments, market trends, or portfolio optimization..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:truncate placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '200px' }}
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="bg-custom-brand hover:bg-custom-brand-hover text-white rounded-2xl h-[52px] px-6"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Prophetic Orchestra 7.5 can make mistakes. Verify investment advice with certified advisors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
