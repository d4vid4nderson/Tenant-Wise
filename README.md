# Tenant Wise

Tenant Wise is a SaaS application for small Texas landlords (1-10 units) that uses AI to generate Texas-compliant legal documents, notices, and communications.

## 🎯 Problem Solved

Small landlords are stuck between:
- Expensive property management software ($50-200/month)
- Manual paperwork with templates that may not be legally compliant

Tenant Wise provides AI-generated, state-compliant documents at an affordable price point ($19-39/month).

## ⭐ Key Features

- **AI Document Generation**: Late rent notices, lease renewals, maintenance responses, move-in/out checklists, security deposit returns
- **Texas-Compliant**: Documents follow Texas Property Code requirements
- **Legal AI Assistant**: Chat with an AI trained on Texas landlord-tenant law (paid plans)
- **Property & Tenant Management**: Save profiles for quick document generation
- **Affordable Pricing**: Free tier available, paid plans starting at $19/month

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Claude API (Anthropic)
- **Payments**: Stripe
- **Deployment**: Vercel

## 📁 Project Structure

```
landlord-ai/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, signup)
│   ├── (dashboard)/        # Protected dashboard pages
│   ├── api/                # API routes
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   └── forms/              # Document form components
├── lib/                    # Utilities and services
│   ├── supabase/           # Supabase client configs
│   ├── prompts/            # AI prompt templates
│   └── claude.ts           # Claude API wrapper
├── supabase/               # Database migrations
├── diagrams/               # Architecture diagrams
└── types/                  # TypeScript types
```

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/d4vid4nderson/Tenant-Wise.git
   cd Tenant-Wise
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.local.example .env.local
   # Fill in your API keys
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Copy your project URL and anon key to `.env.local`

4. **Start development**
   ```bash
   npm run dev
   ```

## 📄 Document Types

| Document | Texas Code | Description |
|----------|-----------|-------------|
| Late Rent Notice | § 24.005 | 3-day notice to pay or vacate |
| Lease Renewal | - | Professional renewal letter |
| Security Deposit Return | § 92.103 | Itemized deductions (30-day rule) |
| Maintenance Response | - | Repair acknowledgment |
| Move-In/Out Checklist | - | Property condition documentation |

## 💰 Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 docs/month |
| Basic | $19/mo | Unlimited docs |
| Pro | $39/mo | + Multi-property, tenant profiles |

## 🔐 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 Architecture

See `diagrams/architecture.mmd` for the full system architecture.

## 📚 Documentation

For detailed development guidelines, see `CLAUDE.md`.

## 📝 License

MIT

---

Built with ❤️ for Texas landlords
