import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function getSharedConversation(token: string) {
  const supabase = createAdminClient();

  // Fetch the share record
  const { data: share, error: shareError } = await supabase
    .from("conversation_shares")
    .select("conversation_id, expires_at")
    .eq("share_token", token)
    .maybeSingle();

  if (shareError || !share) {
    return null;
  }

  // Check if share has expired
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { expired: true };
  }

  // Fetch the conversation
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", share.conversation_id)
    .single();

  if (conversationError || !conversation) {
    return null;
  }

  // Fetch the messages
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", share.conversation_id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return null;
  }

  return { conversation, messages };
}

export default async function SharedConversationPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedConversation(token);

  if (!result) {
    notFound();
  }

  if ("expired" in result && result.expired) {
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
          <h1 className="text-2xl font-semibold mb-2 dark:text-white">Share Link Expired</h1>
          <p className="text-gray-600 dark:text-gray-400">
            This conversation share link has expired and is no longer accessible.
          </p>
        </div>
      </div>
    );
  }

  const { conversation, messages } = result as { conversation: Conversation; messages: Message[] };

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
              Shared conversation
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
          <p>Powered by Prophetic Orchestra</p>
        </div>
      </div>
    </div>
  );
}
