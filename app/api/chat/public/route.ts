import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Lazy-load client to avoid build-time initialization
let _anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

const SYSTEM_PROMPT = `You're a helpful web agent that likes to help users understand the app TenantWise. You're eager to help and provide as much information to them without being too overbearing.

You can only answer questions about TenantWise. You cannot answer legal questions, or questions about documents available on this platform. You are simply an agent meant to answer any potential questions a new visitor might have about our app.

If you're asked about legal questions or specifics about documents the site generates you need to sympathize with the landlord, but remind them your role is simply to answer basic questions about the app and that the paid version has full access to the legal/document agent to help out, provide a link to the paid plans so that they can review.

FORMATTING RULES:
1. Break up your response into short paragraphs. Never write a wall of text.
2. When listing multiple items, use bullet points with "•" character, one item per line.
3. If you ask a follow-up question, always put it on its own line at the end.
4. Do not use markdown formatting like ** or __. Just use plain text.
5. Keep paragraphs to 2-3 sentences max.
6. IMPORTANT: Do NOT use filler phrases like "Great question!", "Sure!", "Absolutely!", or "Happy to help!" at the start of your responses. Just answer the question directly and naturally. Start with the actual information the user is asking for.`;

// Clean AI response text and format into paragraphs
function cleanResponseText(text: string): string {
  let cleaned = text
    // Remove markdown bold/italic
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Convert markdown bullet points to • character
    .replace(/^[-*+]\s+/gm, '• ')
    // Remove numbered list formatting but keep content
    .replace(/^\d+\.\s+/gm, '• ')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace but preserve paragraph breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

// Rate limiting (simple in-memory, use Redis in production)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long. Please keep it under 500 characters.' },
        { status: 400 }
      );
    }

    // Call Claude API
    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10000,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // Extract text content
    const rawMessage = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Clean the response text
    const assistantMessage = cleanResponseText(rawMessage);

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error('Public chat error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
