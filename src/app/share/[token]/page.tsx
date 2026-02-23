import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SharedConversationView, SharedConversationExpired } from "@/components/share/SharedConversationView";

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
    return <SharedConversationExpired />;
  }

  const { conversation, messages } = result as { conversation: Conversation; messages: Message[] };

  return <SharedConversationView conversation={conversation} messages={messages} />;
}
