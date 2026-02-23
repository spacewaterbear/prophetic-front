"use client";

import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context";
import { SharedMessageList } from "@/components/share/SharedMessageList";

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
}

interface Props {
  conversation: Conversation;
  messages: Message[];
}

export function SharedConversationView({ conversation, messages }: Props) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="https://ext.same-assets.com/4250389560/3143870090.png"
                alt="Prophetic Orchestra"
                width={180}
                height={45}
                className="h-10 w-auto"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t("share.sharedConversation")}
            </div>
          </div>
          {conversation.title && (
            <h1 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
              {conversation.title}
            </h1>
          )}
        </header>

        {/* Messages */}
        <div className="px-6 py-8">
          <SharedMessageList messages={messages} />
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("share.poweredBy")}</p>
        </div>
      </div>
    </div>
  );
}

interface ExpiredProps {
  title?: string;
  message?: string;
}

export function SharedConversationExpired({ title, message }: ExpiredProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2 dark:text-white">
          {title ?? t("share.expiredTitle")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {message ?? t("share.expiredMessage")}
        </p>
      </div>
    </div>
  );
}
