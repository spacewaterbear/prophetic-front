"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, Menu, Plus, MessageSquare, LogOut, Check } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { ModelSelector } from "@/components/ModelSelector";

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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.5-sonnet");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load conversations on mount
  useEffect(() => {
    if (session?.user) {
      loadConversations();
    }
  }, [session]);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
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

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Chat",
          model: selectedModel
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(data.conversation.id);
        setMessages([]);
        setStreamingMessage("");
        await loadConversations();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const examplePrompts = [
    "Analyze luxury watch market trends",
    "Compare sneaker vs. art investments",
    "Show me high-ROI opportunities",
    "Explain Score Orchestra™ methodology"
  ];

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
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "New Chat",
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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-black text-white flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-800">
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
                <button
                  key={conversation.id}
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
                  {currentConversationId === conversation.id && (
                    <Check className="h-4 w-4 ml-auto flex-shrink-0 text-blue-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
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
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
                <h2 className="text-4xl font-light mb-4">Secure the advantage in nine luxury segments</h2>
                <p className="text-gray-600">Powered by Score Orchestra™ and TTT Token technology</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examplePrompts.map((prompt, i) => (
                  <Card
                    key={i}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-gray-200 bg-white"
                    onClick={() => handleSend(prompt)}
                  >
                    <p className="text-sm text-gray-700">{prompt}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "ai" && (
                  <div className="w-10 h-10 mt-1 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image
                      src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
                      alt="Prophetic Orchestra"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div
                  className={`max-w-2xl px-6 py-4 rounded-2xl ${
                    message.sender === "user"
                      ? "bg-custom-brand text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  {message.sender === "user" ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <Markdown content={message.content} className="text-sm" />
                  )}
                </div>
                {message.sender === "user" && (
                  <div className="w-10 h-10 mt-1 rounded-full bg-custom-brand flex items-center justify-center text-white font-medium flex-shrink-0 leading-none text-lg">
                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex gap-4 items-start justify-start">
                <div className="w-10 h-10 mt-1 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Image
                    src="https://nqwovhetvhmtjigonohq.supabase.co/storage/v1/object/public/front/logo/flavicon.png"
                    alt="Prophetic Orchestra"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="max-w-2xl px-6 py-4 rounded-2xl bg-white border border-gray-200">
                  <Markdown content={streamingMessage} className="text-sm" />
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
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
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
            <p className="text-xs text-gray-500 mt-3 text-center">
              Prophetic Orchestra 7.5 can make mistakes. Verify investment advice with certified advisors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
