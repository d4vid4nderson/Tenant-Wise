import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

interface PropertyDescriptionRequest {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  unit_count?: number;
  monthly_rent?: number;
  notes?: string;
  cover_image_url?: string;
  gallery_image_urls?: string[];
}

// Lazy-load client to avoid build-time initialization
let _anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return _anthropic;
}

const PROPERTY_DESCRIPTION_SYSTEM_PROMPT = `You are a professional real estate copywriter specializing in rental property listings.
Your role is to create compelling, informative property descriptions for landlords.

Guidelines:
- Write in a professional, engaging tone
- Highlight key features and amenities visible in the photos
- Be concise but descriptive
- Use proper HTML formatting for rich text display
- Do NOT use markdown - output HTML tags directly
- Include relevant details about the property type, size, and location
- If photos are provided, describe specific features you can see (kitchen, living areas, outdoor spaces, etc.)
- Make the description appealing to potential tenants
- Keep descriptions between 150-250 words

Output format:
- Use <p> tags for paragraphs
- Use <strong> for emphasis on key features
- Use <ul> and <li> for listing amenities if appropriate
- Do NOT include headers or titles - just the description content`;

// Helper to fetch image as base64
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Map content type to supported media types
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    return { base64, mediaType };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PropertyDescriptionRequest = await request.json();
    const {
      address_line1,
      address_line2,
      city,
      state,
      zip,
      property_type,
      bedrooms,
      bathrooms,
      sqft,
      unit_count,
      monthly_rent,
      notes,
      cover_image_url,
      gallery_image_urls,
    } = body;

    // Build the property details text
    const propertyTypeLabels: Record<string, string> = {
      single_family: 'Single Family Home',
      duplex: 'Duplex',
      apartment: 'Apartment',
      condo: 'Condominium',
      townhouse: 'Townhouse',
      other: 'Property',
    };

    const typeLabel = property_type ? propertyTypeLabels[property_type] || 'Property' : 'Property';

    let propertyDetails = `Generate a compelling property description for the following rental property:

Property Type: ${typeLabel}
Location: ${address_line1}${address_line2 ? `, ${address_line2}` : ''}, ${city}, ${state} ${zip}`;

    if (bedrooms) propertyDetails += `\nBedrooms: ${bedrooms}`;
    if (bathrooms) propertyDetails += `\nBathrooms: ${bathrooms}`;
    if (sqft) propertyDetails += `\nSquare Feet: ${sqft.toLocaleString()}`;
    if (unit_count && unit_count > 1) propertyDetails += `\nUnits: ${unit_count}`;
    if (monthly_rent) propertyDetails += `\nMonthly Rent: $${monthly_rent.toLocaleString()}`;
    if (notes) propertyDetails += `\n\nAdditional Notes from Owner: ${notes}`;

    propertyDetails += `\n\nWrite an engaging property description that would appeal to potential tenants. Focus on the property's features, location benefits, and any unique selling points. If photos are provided, describe specific features visible in them. Output HTML directly (not markdown).`;

    // Collect all image URLs
    const allImageUrls: string[] = [];
    if (cover_image_url) allImageUrls.push(cover_image_url);
    if (gallery_image_urls) allImageUrls.push(...gallery_image_urls);

    // Build the message content
    const messageContent: Anthropic.MessageParam['content'] = [];

    // Fetch and add images (limit to first 5 to avoid token limits)
    const imagesToProcess = allImageUrls.slice(0, 5);

    if (imagesToProcess.length > 0) {
      const imagePromises = imagesToProcess.map(url => fetchImageAsBase64(url));
      const imageResults = await Promise.all(imagePromises);

      for (const result of imageResults) {
        if (result) {
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: result.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: result.base64,
            },
          });
        }
      }
    }

    // Add the text prompt
    messageContent.push({
      type: 'text',
      text: propertyDetails,
    });

    // Generate description using Claude with vision
    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: PROPERTY_DESCRIPTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    // Extract text from the response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return NextResponse.json({
      success: true,
      description: textBlock.text,
    });
  } catch (error) {
    console.error('Error generating property description:', error);
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}
