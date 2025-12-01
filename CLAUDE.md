# LandlordAI - Development Guide

## Project Overview
A SaaS application for small landlords (1-10 units) that uses AI to generate state-compliant legal documents, notices, and communications. Solves the pain point of expensive property management software and manual paperwork by automating document generation with proper legal language.

## Target Market
- Small landlords owning 1-10 rental units
- Currently using spreadsheets, texts, and Word templates
- Priced out of enterprise solutions ($50-200/month)
- Need state-specific compliance (starting with Texas)

## Business Model
- **Free Tier**: 3 documents/month
- **Basic ($19/month)**: Unlimited documents, all templates
- **Pro ($39/month)**: Multi-property support, saved tenant profiles, document history

## Tech Stack
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Claude API (Anthropic)
- **Payments**: Stripe
- **Deployment**: Vercel
- **Icons**: react-icons

## Core Features (MVP)

### Phase 1: Document Generation (Launch)
1. **Late Rent Notice** - Texas-compliant 3-day notice to pay or vacate
2. **Lease Renewal Letter** - Professional renewal offer with terms
3. **Maintenance Response** - Acknowledge request, set expectations
4. **Move-In/Move-Out Checklist** - Condition documentation
5. **Security Deposit Return Letter** - Itemized deductions (Texas-specific timing)

### Phase 2: Property Management
- Property profiles (address, unit details, lease terms)
- Tenant profiles (contact info, lease dates, rent amount)
- Document history per tenant

### Phase 3: Advanced Features
- Multi-state support (expand beyond Texas)
- Lease analyzer ("Is this repair my responsibility?")
- Rent tracking reminders
- E-signature integration

## File Structure

```
landlord-ai/
├── app/
│   ├── page.tsx                    # Landing page / marketing
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   ├── signup/page.tsx         # Signup page
│   │   └── callback/route.ts       # Supabase auth callback
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout with nav
│   │   ├── dashboard/page.tsx      # Main dashboard
│   │   ├── documents/
│   │   │   ├── page.tsx            # Document list
│   │   │   ├── new/page.tsx        # Create new document
│   │   │   └── [id]/page.tsx       # View/edit document
│   │   ├── properties/
│   │   │   ├── page.tsx            # Property list
│   │   │   └── [id]/page.tsx       # Property details
│   │   ├── tenants/
│   │   │   ├── page.tsx            # Tenant list
│   │   │   └── [id]/page.tsx       # Tenant details
│   │   └── settings/page.tsx       # Account settings
│   └── api/
│       ├── generate/route.ts       # AI document generation
│       ├── documents/route.ts      # CRUD for documents
│       ├── stripe/
│       │   ├── checkout/route.ts   # Create checkout session
│       │   └── webhook/route.ts    # Handle Stripe webhooks
│       └── health/route.ts         # Health check endpoint
├── components/
│   ├── ui/                         # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── forms/
│   │   ├── LateRentNoticeForm.tsx
│   │   ├── LeaseRenewalForm.tsx
│   │   ├── MaintenanceResponseForm.tsx
│   │   ├── MoveInOutChecklistForm.tsx
│   │   └── DepositReturnForm.tsx
│   ├── DocumentPreview.tsx         # Preview generated document
│   ├── DocumentList.tsx            # List of saved documents
│   ├── PropertyCard.tsx            # Property summary card
│   ├── TenantCard.tsx              # Tenant summary card
│   ├── Navigation.tsx              # Main navigation
│   ├── Sidebar.tsx                 # Dashboard sidebar
│   └── Footer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── middleware.ts           # Auth middleware
│   ├── stripe.ts                   # Stripe configuration
│   ├── claude.ts                   # Claude API wrapper
│   ├── prompts/
│   │   ├── late-rent-notice.ts     # Texas late rent prompt
│   │   ├── lease-renewal.ts        # Lease renewal prompt
│   │   ├── maintenance.ts          # Maintenance response prompt
│   │   ├── move-in-out.ts          # Checklist prompt
│   │   └── deposit-return.ts       # Security deposit prompt
│   └── utils.ts                    # Utility functions
├── types/
│   ├── database.ts                 # Supabase generated types
│   ├── documents.ts                # Document types
│   └── forms.ts                    # Form input types
├── public/
│   ├── logo.svg
│   └── favicon.ico
├── supabase/
│   └── migrations/                 # Database migrations
│       └── 001_initial_schema.sql
├── .env.local.example              # Environment variables template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── CLAUDE.md
```

## Database Schema (Supabase)

```sql
-- Users (handled by Supabase Auth, extended with profiles)

create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text,
  subscription_tier text default 'free', -- 'free', 'basic', 'pro'
  stripe_customer_id text,
  documents_this_month integer default 0,
  billing_cycle_start timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Properties
create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'TX',
  zip text not null,
  unit_count integer default 1,
  property_type text, -- 'single_family', 'duplex', 'apartment', 'condo'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tenants
create table tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  lease_start date,
  lease_end date,
  rent_amount decimal(10,2),
  security_deposit decimal(10,2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Generated Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  document_type text not null, -- 'late_rent', 'lease_renewal', 'maintenance', etc.
  title text not null,
  content text not null, -- Generated document content (markdown or HTML)
  form_data jsonb, -- Original form inputs for regeneration
  state text default 'TX', -- Which state's laws were used
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table properties enable row level security;
alter table tenants enable row level security;
alter table documents enable row level security;

-- Policies (users can only access their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can CRUD own properties" on properties for all using (auth.uid() = user_id);
create policy "Users can CRUD own tenants" on tenants for all using (auth.uid() = user_id);
create policy "Users can CRUD own documents" on documents for all using (auth.uid() = user_id);
```

## Environment Variables

```env
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude API
ANTHROPIC_API_KEY=your_anthropic_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## API Routes

### POST /api/generate
Generates a document using Claude AI.

**Request Body:**
```typescript
{
  documentType: 'late_rent' | 'lease_renewal' | 'maintenance' | 'move_in_out' | 'deposit_return',
  state: 'TX', // Currently only Texas
  formData: {
    // Varies by document type - see form schemas
  }
}
```

**Response:**
```typescript
{
  success: boolean,
  document: {
    id: string,
    content: string, // Generated document in markdown
    title: string
  },
  error?: string
}
```

## Texas Legal Requirements (Critical)

### Late Rent Notice (3-Day Notice to Vacate)
- Texas Property Code § 24.005
- Must give tenant at least 3 days to pay or vacate
- Notice must be in writing
- Must be delivered in person, by mail, or posted on door
- Must specify amount owed and deadline

### Security Deposit Return
- Texas Property Code § 92.103
- Landlord has 30 days after move-out to return deposit
- Must provide itemized list of deductions
- Normal wear and tear cannot be deducted
- If not returned in 30 days, landlord may owe 3x deposit + $100

### Lease Renewal
- No specific Texas requirement for advance notice
- Best practice: 60-90 days before lease end
- Must clearly state new terms, rent amount, lease period

## AI Prompt Strategy

Each document type has a dedicated prompt in `/lib/prompts/`. Prompts should:

1. **Set context**: "You are a legal document generator for Texas landlords..."
2. **Specify compliance**: Reference specific Texas Property Code sections
3. **Define format**: Clear structure with proper legal headers
4. **Include variables**: Inject form data (names, dates, amounts)
5. **Add disclaimers**: "This is a template. Consult an attorney for legal advice."

Example prompt structure:
```typescript
export const lateRentNoticePrompt = (data: LateRentFormData) => `
You are generating a Texas-compliant 3-Day Notice to Pay or Vacate.

Texas Property Code § 24.005 requires:
- Minimum 3 days notice
- Written notice
- Specify amount owed

Generate a formal notice with the following information:
- Tenant Name: ${data.tenantName}
- Property Address: ${data.propertyAddress}
- Amount Owed: $${data.amountOwed}
- Due Date: ${data.dueDate}
- Late Fees: $${data.lateFees}

Format as a professional legal document with:
1. Header with "THREE-DAY NOTICE TO PAY RENT OR VACATE"
2. Property address
3. Amount owed breakdown
4. Deadline (3 days from notice date)
5. Payment instructions
6. Consequences of non-payment
7. Landlord signature line
8. Certificate of service section

Include standard legal disclaimer at bottom.
`;
```

## Component Patterns


### Form Components
Each document type has a corresponding form component that:
- Collects required inputs with validation
- Pre-fills from saved property/tenant data when available
- Shows real-time preview of generated document
- Handles API submission and error states

```typescript
// Example: components/forms/LateRentNoticeForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DocumentPreview } from '@/components/DocumentPreview';

interface LateRentFormData {
  tenantName: string;
  propertyAddress: string;
  amountOwed: number;
  dueDate: string;
  lateFees: number;
}

export function LateRentNoticeForm() {
  const [formData, setFormData] = useState<LateRentFormData>({...});
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'late_rent',
        state: 'TX',
        formData
      })
    });
    const data = await res.json();
    setPreview(data.document.content);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <div>{/* Form inputs */}</div>
      <DocumentPreview content={preview} loading={loading} />
    </div>
  );
}
```

### Document Preview Component
Renders generated markdown as formatted HTML with print/download options.

```typescript
// components/DocumentPreview.tsx
interface DocumentPreviewProps {
  content: string | null;
  loading: boolean;
}

export function DocumentPreview({ content, loading }: DocumentPreviewProps) {
  if (loading) return <LoadingSpinner />;
  if (!content) return <EmptyState message="Fill out the form to generate a document" />;
  
  return (
    <div className="bg-white p-8 shadow-lg rounded-lg">
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: marked(content) }} />
      <div className="mt-4 flex gap-2">
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="secondary" onClick={handleDownload}>Download PDF</Button>
      </div>
    </div>
  );
}
```

## Authentication Flow

Using Supabase Auth with email/password and magic links:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
};
```

## Stripe Integration

### Subscription Tiers
```typescript
// lib/stripe.ts
export const PLANS = {
  basic: {
    name: 'Basic',
    price: 1900, // $19.00 in cents
    priceId: 'price_xxx', // From Stripe Dashboard
    features: ['Unlimited documents', 'All templates', 'Email support']
  },
  pro: {
    name: 'Pro', 
    price: 3900, // $39.00 in cents
    priceId: 'price_yyy',
    features: ['Everything in Basic', 'Multi-property', 'Tenant profiles', 'Document history']
  }
};
```

### Webhook Handler
```typescript
// app/api/stripe/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  
  switch (event.type) {
    case 'checkout.session.completed':
      // Update user's subscription_tier in Supabase
      break;
    case 'customer.subscription.deleted':
      // Downgrade to free tier
      break;
  }
  
  return NextResponse.json({ received: true });
}
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Generate Supabase types (after schema changes)
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```

## Deployment Checklist

### Vercel
1. Connect GitHub repository
2. Add environment variables
3. Deploy

### Supabase
1. Create project
2. Run migrations in SQL editor
3. Enable Row Level Security
4. Set up auth redirect URLs

### Stripe
1. Create products and prices in Dashboard
2. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Add webhook signing secret to env vars

## Testing Strategy


### Manual Testing (MVP)
- Test each document type generation
- Verify Texas legal compliance language
- Test subscription flow end-to-end
- Test on mobile devices

### Future: Automated Testing
- Unit tests for prompt generation
- Integration tests for API routes
- E2E tests with Playwright (like your portfolio)

## Known Issues / Notes

- Always verify generated legal documents against current Texas Property Code
- AI-generated content should include disclaimer about consulting an attorney
- Free tier document count resets monthly (track billing_cycle_start)
- Supabase RLS policies must be tested thoroughly

## Design Guidelines

### Color Palette (Suggestion)
- Primary: Blue (#3b82f6) - Trust, professionalism
- Secondary: Slate (#64748b) - Neutral, readable
- Accent: Green (#10b981) - Success, money
- Warning: Amber (#f59e0b) - Alerts, due dates
- Error: Red (#ef4444) - Overdue, problems

### Typography
- Headings: Inter or similar sans-serif
- Body: System font stack for readability
- Documents: Georgia or serif for legal documents (print-friendly)

### UI Principles
- Clean, professional look (landlords are busy)
- Mobile-responsive (often checking on properties)
- Quick actions prominent (generate document in < 3 clicks)
- Clear document status (draft, saved, sent)

## Roadmap

### v1.0 (MVP) - 4-6 weeks
- [ ] Landing page with value proposition
- [ ] Auth (signup, login, forgot password)
- [ ] 5 Texas document templates
- [ ] Document generation with Claude
- [ ] Basic dashboard
- [ ] Stripe subscription

### v1.1 - 2-3 weeks after launch
- [ ] Property management
- [ ] Tenant profiles
- [ ] Document history
- [ ] PDF download

### v1.2 - Based on user feedback
- [ ] Additional states (start with neighboring: OK, LA, NM, AR)
- [ ] Lease analyzer feature
- [ ] Email delivery of documents
- [ ] Mobile app (React Native)

## Competitive Analysis

| Feature | LandlordAI | Buildium | AppFolio | Avail |
|---------|-----------|----------|----------|-------|
| Price | $19-39/mo | $55+/mo | $280+/mo | Free-$7/unit |
| AI Documents | ✅ | ❌ | ❌ | ❌ |
| State Compliance | ✅ | ✅ | ✅ | Limited |
| Small Landlord Focus | ✅ | ❌ | ❌ | ✅ |
| Tenant Portal | ❌ (v2) | ✅ | ✅ | ✅ |
| Payment Processing | ❌ (v2) | ✅ | ✅ | ✅ |

**Differentiation**: AI-powered document generation with state-specific legal compliance at a price point small landlords can afford.

## Resources

### Texas Property Code
- [Texas Property Code Chapter 24 - Forcible Entry](https://statutes.capitol.texas.gov/Docs/PR/htm/PR.24.htm)
- [Texas Property Code Chapter 92 - Residential Tenancies](https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm)

### Tech Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Anthropic Claude API](https://docs.anthropic.com/)

### Similar Products (Research)
- [Buildium](https://www.buildium.com/)
- [AppFolio](https://www.appfolio.com/)
- [Avail](https://www.avail.co/)
- [Innago](https://innago.com/)
- [RocketLawyer](https://www.rocketlawyer.com/) (document focus)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd landlord-ai
npm install

# 2. Set up environment
cp .env.local.example .env.local
# Fill in Supabase, Stripe, and Anthropic keys

# 3. Set up database
# Run migrations in Supabase SQL editor

# 4. Start development
npm run dev
```

---

**Project**: LandlordAI
**Author**: David Anderson
**Created**: November 2025
**Stack**: Next.js + Supabase + Claude + Stripe
- don't start servers, just let me know when I need to kill and restart my server