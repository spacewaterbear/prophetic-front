import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create client with postgres schema access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { persistSession: false }
    });

    console.log("Checking if migration is needed...");

    // Try to query the model column
    const { error: checkError } = await supabase
      .from("conversations")
      .select("model")
      .limit(1);

    // If no error, column exists
    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: "✅ Migration not needed - 'model' column already exists!",
      });
    }

    // If column doesn't exist, we need to run the migration
    console.log("Column doesn't exist, attempting to add it...");

    // Use the SQL query endpoint directly
    const migrationResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE public.conversations
          ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'anthropic/claude-3.5-sonnet';

          CREATE INDEX IF NOT EXISTS idx_conversations_model
          ON public.conversations(model);
        `
      }),
    });

    return NextResponse.json({
      needsManualMigration: true,
      message: "⚠️  Automatic migration not possible. Please run this SQL in Supabase Studio:",
      instructions: [
        "1. Go to https://supabase.com/dashboard/project/nqwovhetvhmtjigonohq/sql",
        "2. Create a new query",
        "3. Paste and run the SQL below:"
      ],
      sql: `ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'anthropic/claude-3.5-sonnet';

COMMENT ON COLUMN public.conversations.model IS 'The AI model selected for this conversation (OpenRouter model ID)';

CREATE INDEX IF NOT EXISTS idx_conversations_model ON public.conversations(model);`,
    });
  } catch (error: unknown) {
    console.error("Migration check error:", error);
    return NextResponse.json({
      error: "Error checking migration status",
      details: error instanceof Error ? error.message : String(error),
      instruction: "Please run the migration SQL manually in Supabase Studio",
      sql: `ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'anthropic/claude-3.5-sonnet';

CREATE INDEX IF NOT EXISTS idx_conversations_model ON public.conversations(model);`,
    }, { status: 500 });
  }
}
