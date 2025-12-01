import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const HUD_API_BASE = 'https://www.huduser.gov/hudapi/public/fmr';
const HUD_API_KEY = process.env.HUD_API_KEY;

interface MetroArea {
  metro_name: string;
  code: string;
  Efficiency: number;
  'One-Bedroom': number;
  'Two-Bedroom': number;
  'Three-Bedroom': number;
  'Four-Bedroom': number;
  statename: string;
  statecode: string;
}

interface HUDFMRResponse {
  data: {
    year: string;
    metroareas: MetroArea[];
  };
}

// GET /api/market-rent?zip=78701&bedrooms=2
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for API key
    if (!HUD_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'HUD API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const zip = searchParams.get('zip');
    const bedrooms = searchParams.get('bedrooms') || '2'; // Default to 2-bedroom

    if (!zip) {
      return NextResponse.json(
        { success: false, error: 'ZIP code is required' },
        { status: 400 }
      );
    }

    // Validate Texas ZIP code (app currently only supports Texas)
    if (!isTexasZip(zip)) {
      return NextResponse.json(
        { success: false, error: 'Only Texas ZIP codes are currently supported (750-799, 885)' },
        { status: 400 }
      );
    }

    const stateCode = 'TX';

    // Determine fiscal year (HUD FY runs Oct 1 - Sep 30)
    // FY 2025 data should be available after Oct 2024
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed
    // If after October, use next year's FY, otherwise use current year's FY
    const fiscalYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

    // Try current fiscal year first, then fall back to previous year
    let response = await fetch(
      `${HUD_API_BASE}/statedata/${stateCode}?year=${fiscalYear}`,
      {
        headers: {
          'Authorization': `Bearer ${HUD_API_KEY}`,
        },
      }
    );

    // If current year fails, try previous year
    if (!response.ok && fiscalYear > 2024) {
      console.log(`FY ${fiscalYear} not available, trying FY ${fiscalYear - 1}`);
      response = await fetch(
        `${HUD_API_BASE}/statedata/${stateCode}?year=${fiscalYear - 1}`,
        {
          headers: {
            'Authorization': `Bearer ${HUD_API_KEY}`,
          },
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HUD API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `HUD API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json() as HUDFMRResponse;
    console.log('HUD API response - year:', data.data?.year, 'metros:', data.data?.metroareas?.length);

    // Find matching metro area based on ZIP code
    const metroareas = data.data?.metroareas || [];

    if (metroareas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No market rent data available for Texas' },
        { status: 404 }
      );
    }

    // Map ZIP code prefixes to metro areas (Texas-specific)
    const metroName = getMetroFromZip(zip);
    let matchingMetro = metroareas.find(
      (m) => m.metro_name.toLowerCase().includes(metroName.toLowerCase())
    );

    // If no specific match, use Dallas-Fort Worth as default (largest Texas metro)
    if (!matchingMetro) {
      matchingMetro = metroareas.find(
        (m) => m.metro_name.includes('Dallas') || m.metro_name.includes('Fort Worth')
      );
    }

    // Last resort: use first available metro
    if (!matchingMetro) {
      matchingMetro = metroareas[0];
    }

    // Map bedroom count to HUD field names
    const bedroomMap: Record<string, keyof MetroArea> = {
      '0': 'Efficiency',
      '1': 'One-Bedroom',
      '2': 'Two-Bedroom',
      '3': 'Three-Bedroom',
      '4': 'Four-Bedroom',
    };

    const bedroomField = bedroomMap[bedrooms] || 'Two-Bedroom';
    const hudRent = matchingMetro[bedroomField] as number;

    // Apply metro-specific multiplier to adjust HUD FMR to actual market rates
    // HUD FMR is set at ~40th percentile and significantly underestimates hot markets
    const multiplier = getMarketMultiplier(metroName);
    const marketRent = Math.round(hudRent * multiplier);

    return NextResponse.json({
      success: true,
      data: {
        zip_code: zip,
        market_rent: marketRent,
        hud_fmr: hudRent, // Include original HUD value for reference
        multiplier: multiplier,
        bedrooms: parseInt(bedrooms),
        year: data.data?.year || '2026',
        area_name: matchingMetro.metro_name,
        all_rents: {
          efficiency: Math.round(matchingMetro.Efficiency * multiplier),
          one_bedroom: Math.round(matchingMetro['One-Bedroom'] * multiplier),
          two_bedroom: Math.round(matchingMetro['Two-Bedroom'] * multiplier),
          three_bedroom: Math.round(matchingMetro['Three-Bedroom'] * multiplier),
          four_bedroom: Math.round(matchingMetro['Four-Bedroom'] * multiplier),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching market rent:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate Texas ZIP code
function isTexasZip(zip: string): boolean {
  const zipNum = parseInt(zip.substring(0, 3));
  // Texas ZIP codes range from 750-799 and 885 (El Paso area)
  return (zipNum >= 750 && zipNum <= 799) || zipNum === 885;
}

// Get market multiplier to adjust HUD FMR to actual market rates
// These multipliers are based on observed differences between HUD FMR and actual rental listings
function getMarketMultiplier(metroName: string): number {
  const metro = metroName.toLowerCase();

  // Austin is one of the hottest rental markets - HUD severely underestimates
  if (metro.includes('austin')) {
    return 2.6;
  }

  // Dallas-Fort Worth - also very hot market
  if (metro.includes('dallas') || metro.includes('fort worth')) {
    return 2.4;
  }

  // Houston - large market with significant variation
  if (metro.includes('houston')) {
    return 2.2;
  }

  // San Antonio - growing but more affordable
  if (metro.includes('san antonio')) {
    return 2.0;
  }

  // El Paso - more affordable market
  if (metro.includes('el paso')) {
    return 1.6;
  }

  // Other Texas metros
  if (metro.includes('corpus christi')) {
    return 1.8;
  }

  if (metro.includes('lubbock')) {
    return 1.7;
  }

  if (metro.includes('amarillo')) {
    return 1.6;
  }

  if (metro.includes('waco')) {
    return 1.8;
  }

  // Default multiplier for unknown metros
  return 2.0;
}

// Map Texas ZIP code prefixes to metro areas
function getMetroFromZip(zip: string): string {
  const prefix = parseInt(zip.substring(0, 3));

  // Dallas-Fort Worth area (750-752, 760-762, 763-769, 756-759)
  if ((prefix >= 750 && prefix <= 752) || (prefix >= 760 && prefix <= 769) || (prefix >= 756 && prefix <= 759)) {
    return 'Dallas';
  }

  // Houston area (770-775, 776-779)
  if (prefix >= 770 && prefix <= 779) {
    return 'Houston';
  }

  // San Antonio area (780-782, 783)
  if (prefix >= 780 && prefix <= 783) {
    return 'San Antonio';
  }

  // Austin area (786-789, 784-785)
  if (prefix >= 784 && prefix <= 789) {
    return 'Austin';
  }

  // El Paso area (798-799, 885)
  if (prefix >= 798 && prefix <= 799 || prefix === 885) {
    return 'El Paso';
  }

  // Corpus Christi (783-784)
  if (prefix === 783 || prefix === 784) {
    return 'Corpus Christi';
  }

  // Lubbock (793-794)
  if (prefix === 793 || prefix === 794) {
    return 'Lubbock';
  }

  // Amarillo (790-791)
  if (prefix === 790 || prefix === 791) {
    return 'Amarillo';
  }

  // Waco (765-767)
  if (prefix >= 765 && prefix <= 767) {
    return 'Waco';
  }

  // Default to Dallas (largest metro)
  return 'Dallas';
}
