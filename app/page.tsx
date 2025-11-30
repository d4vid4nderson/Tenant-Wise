import Link from "next/link";
import { FiHome, FiShield, FiDollarSign, FiClock, FiCheck, FiFileText } from "react-icons/fi";
import { DocumentSparkles } from "@/components/icons/DocumentSparkles";
import { MenuButton, PageWrapper } from "@/components/MenuButton";
import { SampleDocument } from "@/components/SampleDocument";

export default function HomePage() {
  return (
    <PageWrapper>
      <div className="min-h-screen">
        <MenuButton />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Legal Documents for Texas Landlords
            <br />
            <span style={{ background: 'linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Generated in Seconds</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Stop wrestling with templates. Our AI generates state-compliant notices,
            letters, and documents tailored to your specific situation.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#0089eb] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#0070c0] transition-colors shadow-lg shadow-blue-500/25"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="border border-slate-300 px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-50 transition-colors"
            >
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">3 free documents per month. No credit card required.</p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Stay Compliant
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FiShield className="w-8 h-8" />}
              title="Texas-Compliant"
              description="Every document follows Texas Property Code requirements. We handle the legal language so you don't have to."
              color="cyan"
            />
            <FeatureCard
              icon={<FiClock className="w-8 h-8" />}
              title="Ready in Seconds"
              description="Fill out a simple form, get a professional document. No more searching for templates or hiring lawyers."
              color="blue"
            />
            <FeatureCard
              icon={<FiDollarSign className="w-8 h-8" />}
              title="Affordable"
              description="Starting at $19/month for unlimited documents. A fraction of what property management software costs."
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* Document Types Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Documents We Generate
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DocumentCard title="Late Rent Notice" description="3-day notice to pay or vacate, compliant with Texas Property Code § 24.005" color="cyan" />
            <DocumentCard title="Lease Renewal Letter" description="Professional renewal offers with clear terms and conditions" color="blue" />
            <DocumentCard title="Maintenance Response" description="Acknowledge repair requests and set proper expectations" color="purple" />
            <DocumentCard title="Move-In/Out Checklist" description="Document property condition to protect your deposit" color="cyan" />
            <DocumentCard title="Security Deposit Return" description="Itemized deductions following 30-day Texas requirements" color="blue" />
            <DocumentCard title="More Coming Soon" description="We're adding new document types based on landlord feedback" color="purple" />
          </div>
        </div>
      </section>

      {/* Sample Document Section */}
      <section className="bg-muted py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            See What We Generate
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Our AI creates professional, Texas-compliant documents in seconds.
            Here&apos;s a real example of a late rent notice.
          </p>
          <SampleDocument />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-end">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              features={[
                { main: "3 documents/month", subItems: ["Late rent notice", "Move in/out checklist", "Maintenance response"] },
                "Generic downloadable PDFs"
              ]}
              cta="Get Started"
              ctaLink="/signup"
              tier="free"
            />
            <PricingCard
              name="Basic"
              price="$19"
              period="/month"
              features={["Unlimited documents", "All document types", "Custom branding", "Priority support"]}
              cta="Start Free Trial"
              ctaLink="/signup?plan=basic"
              tier="basic"
              featured
            />
            <PricingCard
              name="Pro"
              price="$39"
              period="/month"
              features={["Everything in Basic", "Multi-property support", "Tenant profiles", "Saved templates"]}
              cta="Start Free Trial"
              ctaLink="/signup?plan=pro"
              tier="pro"
            />
          </div>

          {/* Legal Review Tier */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-xl p-8 shadow-xl overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-lg">
                    <FiShield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Legal Review Add-On</h3>
                    <p className="text-slate-300">
                      Connect with our legal team to have your documents reviewed and guaranteed by licensed attorneys in the state of Texas.
                    </p>
                  </div>
                </div>
                <Link
                  href="/contact?service=legal-review"
                  className="shrink-0 inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      </div>
    </PageWrapper>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: 'cyan' | 'blue' | 'purple' }) {
  const styles = {
    cyan: {
      border: "border-cyan-200",
      iconBg: "bg-cyan-100",
      iconText: "text-cyan-600",
    },
    blue: {
      border: "border-blue-200",
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
    },
    purple: {
      border: "border-purple-200",
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
    },
  };

  const s = styles[color];

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-2 ${s.border}`}>
      <div className={`inline-flex p-3 rounded-lg mb-4 ${s.iconBg} ${s.iconText}`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function DocumentCard({ title, description, color = "blue" }: { title: string; description: string; color?: 'cyan' | 'blue' | 'purple' }) {
  const styles = {
    cyan: "hover:border-cyan-400 hover:shadow-cyan-100 text-cyan-500",
    blue: "hover:border-blue-400 hover:shadow-blue-100 text-blue-500",
    purple: "hover:border-purple-400 hover:shadow-purple-100 text-purple-500",
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-border ${styles[color]} hover:shadow-md transition-all`}>
      <FiFileText className={`w-6 h-6 mb-3 ${styles[color].split(' ').pop()}`} />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

type Feature = string | { main: string; subItems: string[] };

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  ctaLink,
  tier,
  featured = false,
}: {
  name: string;
  price: string;
  period: string;
  features: Feature[];
  cta: string;
  ctaLink: string;
  tier: 'free' | 'basic' | 'pro';
  featured?: boolean;
}) {
  const tierStyles = {
    free: {
      card: "bg-white border-2 border-cyan-400",
      text: "text-cyan-700",
      period: "text-cyan-500",
      check: "text-cyan-500",
      feature: "text-cyan-700",
      button: "bg-cyan-500 text-white hover:bg-cyan-600",
    },
    basic: {
      card: "bg-blue-500",
      text: "text-white",
      period: "text-blue-100",
      check: "text-blue-100",
      feature: "text-white",
      button: "bg-white text-blue-600 hover:bg-blue-50",
    },
    pro: {
      card: "bg-indigo-500",
      text: "text-white",
      period: "text-indigo-200",
      check: "text-indigo-200",
      feature: "text-white",
      button: "bg-white text-indigo-600 hover:bg-indigo-50",
    },
  };

  const styles = tierStyles[tier];

  return (
    <div className={`relative rounded-xl ${styles.card} ${styles.text} flex flex-col ${featured ? 'p-8 shadow-2xl scale-105 z-10' : 'p-6 shadow-lg'}`}>
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wide">
            Most Popular
          </span>
        </div>
      )}
      <h3 className={`font-semibold mb-2 ${featured ? 'text-2xl' : 'text-xl'}`}>{name}</h3>
      <p className={`font-bold mb-1 ${featured ? 'text-4xl' : 'text-3xl'}`}>
        {price}
        <span className={`text-sm font-normal ${styles.period}`}>{period}</span>
      </p>
      <ul className="my-6 space-y-2 flex-1">
        {features.map((feature, i) => (
          <li key={i}>
            {typeof feature === 'string' ? (
              <div className="flex items-center gap-2">
                <FiCheck className={`w-4 h-4 ${styles.check}`} />
                <span className={styles.feature}>{feature}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <FiCheck className={`w-4 h-4 ${styles.check}`} />
                  <span className={styles.feature}>{feature.main}</span>
                </div>
                <ul className="ml-6 mt-1 space-y-1">
                  {feature.subItems.map((sub, j) => (
                    <li key={j} className={`text-sm ${styles.feature} flex items-center gap-2`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Link
        href={ctaLink}
        className={`block text-center rounded-lg font-medium transition-colors ${styles.button} mt-auto ${featured ? 'py-3 px-6 text-lg' : 'py-2 px-4'}`}
      >
        {cta}
      </Link>
    </div>
  );
}
