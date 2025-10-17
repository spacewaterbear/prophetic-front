# Database Schema Usage Guide

This guide provides examples for common operations with the enhanced chat schema.

## Table of Contents
- [Creating Conversations](#creating-conversations)
- [Sending Messages](#sending-messages)
- [Auto-generating Conversation Titles](#auto-generating-conversation-titles)
- [Sharing Conversations](#sharing-conversations)
- [Tracking Message Usage](#tracking-message-usage)
- [Querying Conversations](#querying-conversations)

## Creating Conversations

```typescript
// Create a new conversation
const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    user_id: user.id,
    title: null // Will be auto-generated from first message
  })
  .select()
  .single();
```

## Sending Messages

```typescript
// Insert a user message
const { data: userMessage, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: "What are the best investment strategies for 2025?",
    sender: 'user'
  })
  .select()
  .single();

// Insert AI response
const { data: aiMessage, error } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: "Based on current market trends...",
    sender: 'ai',
    metadata: {
      model: 'gpt-4',
      temperature: 0.7
    }
  })
  .select()
  .single();

// Note: The conversation.updated_at will automatically update via trigger
```

## Auto-generating Conversation Titles

```typescript
// After first AI response, generate a title
async function generateConversationTitle(conversationId: number, firstUserMessage: string) {
  // Use your AI service to generate a short title
  const title = await generateTitleFromAI(firstUserMessage); // e.g., "Investment Strategies 2025"

  // Update the conversation
  await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);
}

// Example implementation
async function generateTitleFromAI(message: string): Promise<string> {
  // Call your AI service with a prompt like:
  // "Generate a short 3-5 word title for this conversation: {message}"
  // Return something like "Investment Strategies 2025"
}
```

## Sharing Conversations

### Creating a Share Link

```typescript
import { nanoid } from 'nanoid'; // or use crypto.randomUUID()

async function createShareLink(conversationId: number, userId: string) {
  const shareToken = nanoid(21); // Generates a unique URL-safe token

  const { data: share, error } = await supabase
    .from('conversation_shares')
    .insert({
      conversation_id: conversationId,
      share_token: shareToken,
      created_by: userId,
      expires_at: null // Never expires; set a date for expiration
    })
    .select()
    .single();

  // Return shareable URL
  return `https://yourapp.com/share/${shareToken}`;
}
```

### Creating Expiring Share Links

```typescript
async function createExpiringShareLink(conversationId: number, userId: string, daysValid: number = 7) {
  const shareToken = nanoid(21);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysValid);

  const { data: share, error } = await supabase
    .from('conversation_shares')
    .insert({
      conversation_id: conversationId,
      share_token: shareToken,
      created_by: userId,
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  return `https://yourapp.com/share/${shareToken}`;
}
```

### Accessing a Shared Conversation

```typescript
async function getSharedConversation(shareToken: string) {
  // Get the share record
  const { data: share, error: shareError } = await supabase
    .from('conversation_shares')
    .select('conversation_id, expires_at')
    .eq('share_token', shareToken)
    .single();

  if (shareError || !share) {
    throw new Error('Share link not found');
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('Share link has expired');
  }

  // Fetch conversation with messages (RLS policies will allow this)
  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (
        id,
        content,
        sender,
        created_at
      )
    `)
    .eq('id', share.conversation_id)
    .single();

  return conversation;
}
```

### Revoking a Share Link

```typescript
async function revokeShareLink(shareId: number, userId: string) {
  const { error } = await supabase
    .from('conversation_shares')
    .delete()
    .eq('id', shareId)
    .eq('created_by', userId); // RLS ensures user owns this share
}
```

## Tracking Message Usage

```typescript
// After receiving AI response, track usage
async function trackMessageUsage(
  messageId: number,
  usage: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
) {
  // Calculate estimated cost (example rates, adjust for your provider)
  const rates = {
    'gpt-4': { prompt: 0.00003, completion: 0.00006 }, // per token
    'gpt-3.5-turbo': { prompt: 0.000001, completion: 0.000002 }
  };

  const rate = rates[usage.model] || rates['gpt-3.5-turbo'];
  const estimatedCost =
    (usage.promptTokens * rate.prompt) +
    (usage.completionTokens * rate.completion);

  await supabase
    .from('message_usage')
    .insert({
      message_id: messageId,
      model_name: usage.model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      estimated_cost: estimatedCost
    });
}

// Example: After getting AI response
const aiResponse = await callOpenAI(userMessage);

const { data: aiMessage } = await supabase
  .from('messages')
  .insert({
    conversation_id: conversationId,
    content: aiResponse.content,
    sender: 'ai'
  })
  .select()
  .single();

// Track usage
await trackMessageUsage(aiMessage.id, {
  model: 'gpt-4',
  promptTokens: aiResponse.usage.prompt_tokens,
  completionTokens: aiResponse.usage.completion_tokens,
  totalTokens: aiResponse.usage.total_tokens
});
```

### Getting Usage Statistics

```typescript
// Get total usage for a user
async function getUserUsageStats(userId: string) {
  const { data, error } = await supabase
    .from('message_usage')
    .select(`
      *,
      messages!inner (
        conversation_id,
        conversations!inner (
          user_id
        )
      )
    `)
    .eq('messages.conversations.user_id', userId);

  // Calculate totals
  const stats = {
    totalTokens: data.reduce((sum, row) => sum + (row.total_tokens || 0), 0),
    totalCost: data.reduce((sum, row) => sum + parseFloat(row.estimated_cost || 0), 0),
    messageCount: data.length,
    byModel: data.reduce((acc, row) => {
      const model = row.model_name || 'unknown';
      acc[model] = (acc[model] || 0) + (row.total_tokens || 0);
      return acc;
    }, {})
  };

  return stats;
}
```

## Querying Conversations

### Get User's Conversations (Most Recent First)

```typescript
async function getUserConversations(userId: string, limit: number = 20) {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      messages (
        id,
        content,
        sender,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return conversations;
}
```

### Get Single Conversation with Messages

```typescript
async function getConversationWithMessages(conversationId: number) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      messages (
        id,
        content,
        sender,
        metadata,
        created_at
      )
    `)
    .eq('id', conversationId)
    .single();

  // Sort messages by creation time
  if (conversation?.messages) {
    conversation.messages.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return conversation;
}
```

### Subscribe to Real-time Messages

```typescript
function subscribeToConversation(conversationId: number, onMessage: (message: any) => void) {
  const subscription = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

// Usage in React
useEffect(() => {
  const unsubscribe = subscribeToConversation(conversationId, (message) => {
    setMessages(prev => [...prev, message]);
  });

  return unsubscribe;
}, [conversationId]);
```

### Search Conversations

```typescript
async function searchConversations(userId: string, searchTerm: string) {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      messages (
        id,
        content,
        sender
      )
    `)
    .eq('user_id', userId)
    .or(`title.ilike.%${searchTerm}%,messages.content.ilike.%${searchTerm}%`)
    .order('updated_at', { ascending: false });

  return conversations;
}
```

## Complete Example: Sending a Message with Full Flow

```typescript
async function sendMessage(conversationId: number, content: string, userId: string) {
  // 1. Insert user message
  const { data: userMessage } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content,
      sender: 'user'
    })
    .select()
    .single();

  // 2. Get AI response (example with OpenAI)
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content }]
    })
  }).then(r => r.json());

  // 3. Insert AI message
  const { data: aiMessage } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: aiResponse.choices[0].message.content,
      sender: 'ai',
      metadata: {
        model: 'gpt-4',
        finish_reason: aiResponse.choices[0].finish_reason
      }
    })
    .select()
    .single();

  // 4. Track usage
  await supabase
    .from('message_usage')
    .insert({
      message_id: aiMessage.id,
      model_name: 'gpt-4',
      prompt_tokens: aiResponse.usage.prompt_tokens,
      completion_tokens: aiResponse.usage.completion_tokens,
      total_tokens: aiResponse.usage.total_tokens,
      estimated_cost: calculateCost(aiResponse.usage)
    });

  // 5. Auto-generate title if this is the first message
  const { data: conversation } = await supabase
    .from('conversations')
    .select('title, messages(count)')
    .eq('id', conversationId)
    .single();

  if (!conversation.title && conversation.messages.length <= 2) {
    const title = await generateTitleFromAI(content);
    await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);
  }

  return { userMessage, aiMessage };
}

function calculateCost(usage: any): number {
  const rates = { prompt: 0.00003, completion: 0.00006 };
  return (usage.prompt_tokens * rates.prompt) +
         (usage.completion_tokens * rates.completion);
}
```

## Notes

- **RLS Policies**: All queries automatically respect Row Level Security. Users can only access their own data or shared conversations.
- **Realtime**: Messages are broadcast in real-time, so multiple clients can see updates instantly.
- **Triggers**: The `conversation.updated_at` field updates automatically when messages are added.
- **Indexes**: All queries are optimized with appropriate indexes on foreign keys and common query patterns.
- **Hard Deletes**: Deleting a conversation will CASCADE delete all messages, shares, and usage records.
