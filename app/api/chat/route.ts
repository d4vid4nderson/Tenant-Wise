import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Direct REST API call to avoid SDK build-time initialization issues
interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

async function callClaudeAPI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  maxTokens: number = 1024
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  return response.json();
}

const SYSTEM_PROMPT = `You are a knowledgeable legal assistant specializing in Texas landlord-tenant law. Your role is to help landlords understand their rights, responsibilities, and legal requirements under the Texas Property Code.

IMPORTANT GUIDELINES:
1. You are NOT a lawyer and cannot provide legal advice. Always recommend consulting with a licensed attorney for specific legal situations.
2. Reference specific Texas Property Code sections when applicable (e.g., § 92.103 for security deposits, § 24.005 for eviction notices).
3. Be accurate and cite sources when discussing Texas law.
4. If you're unsure about something, say so rather than guessing.
5. Focus on Texas-specific laws - if asked about other states, clarify that your expertise is Texas law.
6. Be helpful, professional, and empathetic - landlords often come with stressful situations.

KEY TEXAS PROPERTY CODE AREAS YOU KNOW WELL:
- Security Deposits (§ 92.101-92.109): 30-day return requirement, itemized deductions, penalties
- Eviction Process (Chapter 24): Notice requirements, forcible entry and detainer
- Lease Requirements (§ 92.001-92.024): Written lease terms, landlord obligations
- Repairs and Maintenance (§ 92.051-92.061): Landlord duty to repair, tenant remedies
- Smoke Detectors and Security (§ 92.251-92.264): Required safety devices
- Tenant's Right to Vacate (§ 92.016-92.017): Domestic violence, military deployment
- Late Fees (§ 92.019): Reasonable late fee requirements
- Lockouts and Utility Cutoffs (§ 92.008-92.009): Prohibited landlord actions

When answering:
- Start with a direct answer to the question
- Provide relevant Texas Property Code references as clickable links
- Explain practical implications
- Note any common exceptions or special circumstances
- End with a reminder to consult an attorney for specific legal advice if the matter is complex

FORMATTING REQUIREMENT FOR STATUTE REFERENCES:
When citing Texas Property Code sections, ALWAYS format them as markdown links using this pattern:
- For § 92.103: [Texas Property Code § 92.103](https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm#92.103)
- For § 24.005: [Texas Property Code § 24.005](https://statutes.capitol.texas.gov/Docs/PR/htm/PR.24.htm#24.005)
- For §§ 92.101-92.109 (ranges): [Texas Property Code §§ 92.101-92.109](https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm#92.101)

The URL pattern is: https://statutes.capitol.texas.gov/Docs/PR/htm/PR.{chapter}.htm#{section}
Where {chapter} is the chapter number (e.g., 92, 24) and {section} is the full section number (e.g., 92.103).

Remember: You're here to educate and inform, not to provide legal counsel for specific cases.`;

// Function to convert any unlinked statute references to clickable links
function linkifyStatuteReferences(text: string): string {
  let result = text;

  // Match "Texas Property Code § XX.XXX" or "Texas Property Code §§ XX.XXX-XX.XXX" (not already in a link)
  result = result.replace(
    /(?<!\[)Texas Property Code (§§?\s*(\d+)\.(\d+)(?:-\d+\.\d+)?)/gi,
    (match, section, chapter, sectionNum) => {
      const url = `https://statutes.capitol.texas.gov/Docs/PR/htm/PR.${chapter}.htm#${chapter}.${sectionNum}`;
      return `[Texas Property Code ${section}](${url})`;
    }
  );

  // Match standalone "§ XX.XXX" or "§§ XX.XXX-XX.XXX" (not already in a link)
  // Negative lookbehind for [ or / and negative lookahead for ] or )
  result = result.replace(
    /(?<!\[|\/|\()(§§?\s*(\d+)\.(\d+)(?:-\d+\.\d+)?)(?!\]|\))/g,
    (match, fullSection, chapter, sectionNum) => {
      const url = `https://statutes.capitol.texas.gov/Docs/PR/htm/PR.${chapter}.htm#${chapter}.${sectionNum}`;
      return `[${fullSection.trim()}](${url})`;
    }
  );

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to use the legal assistant' },
        { status: 401 }
      );
    }

    // Check subscription tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unable to verify subscription' },
        { status: 500 }
      );
    }

    // Only paid users can access the chat
    if (profile.subscription_tier === 'free') {
      return NextResponse.json(
        {
          error: 'Legal assistant is available for Basic and Pro subscribers',
          upgrade: true
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Format messages for Claude
    const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Call Claude API
    const response = await callClaudeAPI(formattedMessages, SYSTEM_PROMPT);

    // Extract text content from response
    const rawAssistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text || '')
      .join('\n');

    // Convert any unlinked statute references to clickable links
    const assistantMessage = linkifyStatuteReferences(rawAssistantMessage);

    // Optionally save to chat history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'user',
      content: messages[messages.length - 1].content,
    });

    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'assistant',
      content: assistantMessage,
    });

    return NextResponse.json({
      message: assistantMessage,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    );
  }
}

// GET - Retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: history, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat history
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
