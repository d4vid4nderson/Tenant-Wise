'use client';

import Link from 'next/link';
import { FaHome, FaHeart, FaHandshake, FaLightbulb } from 'react-icons/fa';
import { MenuButton, PageWrapper } from '@/components/MenuButton';

export default function AboutPage() {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <MenuButton />

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
          We Built This for Landlords Like You
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Not property management corporations. Not real estate empires.
          Just regular people trying to manage a rental property or two without losing their minds (or their savings).
        </p>
      </section>

      {/* The Story Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">The Honest Truth</h2>

          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p className="text-lg leading-relaxed">
              Here's the thing: most property management software is built for companies managing hundreds of units.
              They charge accordingly. $50, $100, sometimes $200+ per month. For someone with a duplex or a
              few rental homes, that math just doesn't work.
            </p>

            <p className="text-lg leading-relaxed">
              We've been there. Googling "Texas late rent notice template" at 11pm. Wondering if that
              security deposit letter we wrote is actually legal. Paying a lawyer $200 just to review
              a document we weren't sure about.
            </p>

            <p className="text-lg leading-relaxed">
              So we built TenantWise. Not to become the next big proptech unicorn. Not to "disrupt the industry."
              Just to make something that actually helps small landlords handle the paperwork without
              breaking the bank.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">What We Believe</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FaHome className="text-blue-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Small Landlords Matter</h3>
            <p className="text-slate-600">
              You're not a corporation. You might be a teacher who inherited a property, a couple
              renting out their first home, or someone building modest wealth for retirement.
              You deserve tools that fit your reality.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FaHandshake className="text-green-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Fair for Everyone</h3>
            <p className="text-slate-600">
              Good landlord-tenant relationships start with clear communication. Our documents are
              professional and legally compliant, but also respectful. We're not here to help
              anyone take advantage of anyone else.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <FaLightbulb className="text-amber-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Simple Over Fancy</h3>
            <p className="text-slate-600">
              You don't need 47 features you'll never use. You need to generate a late rent notice
              at 10pm on a Sunday without watching a 30-minute tutorial first. We keep it simple
              because simple actually works.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
              <FaHeart className="text-rose-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Honest Pricing</h3>
            <p className="text-slate-600">
              We're not trying to buy a yacht. We charge what we need to keep the lights on, pay for
              the AI that generates your documents, and maybe grab a coffee. That's it. No hidden fees,
              no "contact sales for pricing."
            </p>
          </div>
        </div>
      </section>

      {/* Costs Transparency Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-800 rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-2xl font-bold mb-6">Where Your Money Actually Goes</h2>

          <p className="text-slate-300 mb-8 text-lg">
            We believe in transparency. Here's what it actually costs to run TenantWise:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shrink-0"></div>
              <div>
                <h4 className="font-semibold mb-1">AI Document Generation</h4>
                <p className="text-slate-400 text-sm">
                  Every document you generate costs us money in AI processing. It's not free, but it's worth it for accurate, state-compliant documents.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 shrink-0"></div>
              <div>
                <h4 className="font-semibold mb-1">Secure Storage</h4>
                <p className="text-slate-400 text-sm">
                  Your documents and data are stored securely. Good security and reliable hosting isn't cheap, but your data deserves it.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 shrink-0"></div>
              <div>
                <h4 className="font-semibold mb-1">Payment Processing</h4>
                <p className="text-slate-400 text-sm">
                  Credit cards and bank transfers have fees. We absorb most of these so you don't have to think about it.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-2 h-2 bg-rose-400 rounded-full mt-2 shrink-0"></div>
              <div>
                <h4 className="font-semibold mb-1">Development & Support</h4>
                <p className="text-slate-400 text-sm">
                  Real humans building new features, fixing bugs, and answering your questions. We're a small team, but we're here.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700">
            <p className="text-slate-300 italic">
              "We price TenantWise at what it costs to run plus a modest margin to keep improving it.
              We're not venture-backed, we're not chasing a billion-dollar exit, and we're not going
              to suddenly 5x our prices because a board told us to."
            </p>
          </div>
        </div>
      </section>

      {/* Texas Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">🤠</span>
            <h2 className="text-2xl font-bold text-slate-800">Made in Texas, for Texas Landlords</h2>
          </div>
          <p className="text-slate-600 text-lg leading-relaxed mb-4">
            We're not a Silicon Valley startup trying to "scale" across 50 states. We're Texans who
            understand Texas landlord challenges, and Texas tenants.
          </p>
          <p className="text-slate-600 text-lg leading-relaxed">
            Every document we generate is built specifically around the Texas Property Code. We know the
            3-day notice requirements, the 30-day deposit return rules, and all the quirks that make
            Texas landlording unique. When Texas law changes, we update our templates because we're
            paying attention to the same things you are so you can rest assured your documents are
            compliant with the latest Texas laws and legislation.
          </p>
        </div>
      </section>

      {/* Who This Is For Section */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">TenantWise is For You If...</h2>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <ul className="space-y-4">
            {[
              "You own 1-10 rental units and manage them yourself",
              "You've used Word templates and Google searches to create legal documents",
              "You've been quoted $100+/month for software that does way more than you need",
              "You want to do things right by your tenants AND protect yourself legally",
              "You'd rather spend time on your actual life than on landlord paperwork",
              "You appreciate tools that respect your intelligence and your wallet",
            ].map((item, index) => (
              <li key={index} className="flex gap-3 items-start">
                <svg className="w-6 h-6 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-600 text-lg">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Ready to Make Landlording a Little Easier?
        </h2>
        <p className="text-slate-600 mb-8 text-lg">
          Start with our free plan. No credit card required. See if it works for you.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/signup"
            className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/#pricing"
            className="bg-white text-slate-700 px-8 py-3 rounded-lg font-semibold border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </section>

      </div>
    </PageWrapper>
  );
}
