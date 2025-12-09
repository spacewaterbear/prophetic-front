"use client";

import { Suspense, memo } from "react";
import Image from "next/image";
import { Markdown } from "@/components/Markdown";
import { CopyButton } from "@/components/share/CopyButton";

interface Message {
  id: number;
  content: string;
  sender: "user" | "ai";
  created_at: string;
}

// Reusable AI Avatar component
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

// Message component for shared conversations (read-only)
const SharedMessageItem = memo(({ message }: { message: Message }) => {
  return (
    <div
      className={`flex gap-4 items-start ${message.sender === "user" ? "justify-end" : "justify-start"}`}
    >
      {message.sender === "ai" && <AIAvatar />}
      <div className="group relative">
        <div
          className={`max-w-2xl pl-6 pr-12 py-4 rounded-2xl ${message.sender === "user"
            ? "text-gray-900"
            : "dark:bg-gray-800"
            }`}
          style={message.sender === "ai" ? { backgroundColor: 'rgb(247, 240, 232)' } : { backgroundColor: 'rgb(230, 220, 210)' }}
        >
          {message.sender === "user" ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
              <Markdown content={message.content} className="text-sm" />
            </Suspense>
          )}
        </div>
        <CopyButton
          content={message.content}
          className={`absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${message.sender === "user"
            ? "text-white hover:bg-white/20"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
        />
      </div>
      {message.sender === "user" && (
        <div className="w-10 h-10 mt-1 rounded-full bg-custom-brand flex items-center justify-center text-white font-medium flex-shrink-0 leading-none text-lg">
          U
        </div>
      )}
    </div>
  );
});

SharedMessageItem.displayName = "SharedMessageItem";

interface SharedMessageListProps {
  messages: Message[];
}

export function SharedMessageList({ messages }: SharedMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No messages in this conversation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <SharedMessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
