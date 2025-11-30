// Use direct REST API calls to avoid SDK build-time initialization issues
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaudeAPI(
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number = 2048,
  model: string = 'claude-sonnet-4-20250514'
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
      model,
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

export async function generateDocument(systemPrompt: string, userPrompt: string): Promise<string> {
  const message = await callClaudeAPI(
    [{ role: 'user', content: userPrompt }],
    systemPrompt
  );

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || !textBlock.text) {
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
