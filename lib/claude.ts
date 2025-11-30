// Dynamic import to avoid build-time initialization
let _anthropic: any = null;

async function getAnthropicClient() {
  if (!_anthropic) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _anthropic;
}

export async function generateDocument(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = await getAnthropicClient();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  // Extract text from the response
  const textBlock = message.content.find((block: { type: string }) => block.type === 'text') as { type: string; text: string } | undefined;
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

export const DOCUMENT_SYSTEM_PROMPT = `You are a legal document generator specializing in Texas landlord-tenant law. 
Your role is to generate professional, legally-compliant documents for small landlords.

Guidelines:
- Always follow Texas Property Code requirements
- Use clear, professional language
- Include all legally required elements
- Format documents for easy printing
- Add appropriate headers and sections
- Include signature lines where needed
- Add a disclaimer that this is a template and users should consult an attorney for legal advice

Output format:
- Use markdown formatting
- Use ## for section headers
- Use **bold** for important terms
- Include clear spacing between sections`;
