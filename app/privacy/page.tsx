import Link from "next/link";
import { DocumentSparkles } from "@/components/icons/DocumentSparkles";
import { MenuButton, PageWrapper } from "@/components/MenuButton";

export const metadata = {
  title: "Privacy Policy | Tenant Wise",
  description: "Privacy Policy for Tenant Wise - How we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-muted">
        <MenuButton />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-border p-8 md:p-12">
          <h1 className="text-3xl font-bold mb-2">PRIVACY POLICY</h1>
          <p className="text-muted-foreground mb-8">
            Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate max-w-none">
            <Section title="1. INTRODUCTION AND SCOPE">
              <p>
                This Privacy Policy (&quot;Policy&quot;) is entered into by and between Tenant Wise (&quot;Company,&quot;
                &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) and you, the user (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;). This Policy
                governs the collection, use, storage, disclosure, and protection of personal information
                obtained through our web-based application and related services (collectively, the &quot;Services&quot;).
              </p>
              <p>
                This Policy is designed to comply with applicable federal and state privacy laws, including
                but not limited to the Texas Data Privacy and Security Act (TDPSA), Texas Business and
                Commerce Code Chapter 521 (Texas Identity Theft Enforcement and Protection Act), and other
                applicable Texas state laws governing the protection of personal information.
              </p>
              <p>
                BY ACCESSING OR USING THE SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
                AGREE TO BE BOUND BY THIS PRIVACY POLICY. IF YOU DO NOT AGREE TO THIS POLICY, YOU MUST
                DISCONTINUE USE OF THE SERVICES IMMEDIATELY.
              </p>
            </Section>

            <Section title="2. DEFINITIONS">
              <p>For purposes of this Policy, the following definitions shall apply:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>&quot;Personal Information&quot;</strong> means any information that identifies, relates to,
                  describes, is reasonably capable of being associated with, or could reasonably be linked,
                  directly or indirectly, with a particular individual or household, as defined under Texas
                  Business and Commerce Code § 521.002.
                </li>
                <li>
                  <strong>&quot;Sensitive Personal Information&quot;</strong> means Personal Information that includes
                  data revealing racial or ethnic origin, religious beliefs, mental or physical health
                  diagnosis, sexual orientation, citizenship or immigration status, genetic or biometric
                  data, precise geolocation data, or personal information collected from a known child.
                </li>
                <li>
                  <strong>&quot;Processing&quot;</strong> means any operation performed on Personal Information, including
                  collection, use, storage, disclosure, analysis, deletion, or modification.
                </li>
                <li>
                  <strong>&quot;Third-Party Service Provider&quot;</strong> means any entity that processes Personal
                  Information on behalf of the Company pursuant to a written contract.
                </li>
              </ul>
            </Section>

            <Section title="3. CATEGORIES OF PERSONAL INFORMATION COLLECTED">
              <p>
                The Company collects the following categories of Personal Information in connection with
                the provision of Services:
              </p>

              <h4 className="font-semibold mt-4 mb-2">3.1 Account and Identity Information</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full legal name</li>
                <li>Email address</li>
                <li>Password credentials (stored in encrypted format)</li>
                <li>Account preferences and user settings</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">3.2 Property and Tenant Information</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Real property addresses and descriptions</li>
                <li>Tenant personally identifiable information (names, contact information)</li>
                <li>Lease terms, including rental amounts, security deposits, and lease duration</li>
                <li>Document content and form data submitted for document generation</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">3.3 Financial and Billing Information</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Billing name and address</li>
                <li>Payment card information (processed and stored exclusively by Stripe, Inc.)</li>
                <li>Transaction history and subscription records</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">3.4 Technical and Usage Information</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Internet Protocol (IP) address</li>
                <li>Browser type, version, and language preferences</li>
                <li>Device identifiers and operating system information</li>
                <li>Access timestamps and pages visited</li>
                <li>Referring URLs and navigation patterns</li>
              </ul>
            </Section>

            <Section title="4. PURPOSES FOR PROCESSING PERSONAL INFORMATION">
              <p>
                The Company processes Personal Information solely for the following lawful purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Service Provision:</strong> To provide, maintain, and improve the Services,
                  including the generation of legal documents tailored to User specifications.
                </li>
                <li>
                  <strong>Account Management:</strong> To create and manage User accounts, authenticate
                  Users, and maintain account security.
                </li>
                <li>
                  <strong>Payment Processing:</strong> To process subscription payments, manage billing
                  cycles, and maintain transaction records.
                </li>
                <li>
                  <strong>Communication:</strong> To send transactional communications, service updates,
                  security alerts, and respond to User inquiries.
                </li>
                <li>
                  <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, legal
                  processes, and enforceable governmental requests.
                </li>
                <li>
                  <strong>Service Improvement:</strong> To analyze usage patterns, diagnose technical
                  issues, and develop new features and functionality.
                </li>
                <li>
                  <strong>Fraud Prevention:</strong> To detect, prevent, and address fraud, security
                  breaches, and other potentially prohibited or illegal activities.
                </li>
              </ul>
            </Section>

            <Section title="5. ARTIFICIAL INTELLIGENCE DOCUMENT GENERATION">
              <p>
                The Services utilize artificial intelligence technology provided by Anthropic, PBC
                (&quot;Anthropic&quot;) to generate legal documents. With respect to AI-powered document generation,
                the following terms apply:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  User-submitted form data is transmitted to Anthropic&apos;s API servers for the sole purpose
                  of generating the requested document.
                </li>
                <li>
                  The Company does not authorize or permit the use of User data for training, improving,
                  or developing AI models.
                </li>
                <li>
                  Generated documents are stored within User accounts and remain the property of the User.
                </li>
                <li>
                  Users acknowledge that AI-generated documents are provided as templates only and do not
                  constitute legal advice. Users are advised to consult with a licensed Texas attorney
                  before relying on any generated documents.
                </li>
              </ul>
            </Section>

            <Section title="6. DISCLOSURE TO THIRD PARTIES">
              <p>
                The Company may disclose Personal Information to the following categories of Third-Party
                Service Providers, subject to written contractual obligations requiring confidentiality
                and data protection:
              </p>

              <h4 className="font-semibold mt-4 mb-2">6.1 Supabase, Inc.</h4>
              <p className="mb-2">
                Supabase provides authentication, database, and hosting services. User data is stored on
                Supabase infrastructure with encryption at rest and in transit. Supabase&apos;s privacy practices
                are governed by their Privacy Policy available at{" "}
                <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://supabase.com/privacy
                </a>.
              </p>

              <h4 className="font-semibold mt-4 mb-2">6.2 Stripe, Inc.</h4>
              <p className="mb-2">
                Stripe provides payment processing services. Payment card information is collected and
                processed directly by Stripe and is not stored on Company servers. Stripe is PCI-DSS
                Level 1 certified. Stripe&apos;s privacy practices are governed by their Privacy Policy
                available at{" "}
                <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://stripe.com/privacy
                </a>.
              </p>

              <h4 className="font-semibold mt-4 mb-2">6.3 Anthropic, PBC</h4>
              <p className="mb-2">
                Anthropic provides AI document generation capabilities through its Claude API. Data
                transmitted for document generation is processed in accordance with Anthropic&apos;s
                Privacy Policy available at{" "}
                <a href="https://www.anthropic.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://www.anthropic.com/privacy
                </a>.
              </p>

              <h4 className="font-semibold mt-4 mb-2">6.4 Legal Disclosures</h4>
              <p>
                The Company may disclose Personal Information when required by law, including but not
                limited to: (a) compliance with a subpoena, court order, or other legal process;
                (b) response to a lawful request by public authorities; (c) protection of the rights,
                property, or safety of the Company, Users, or others; or (d) enforcement of our Terms
                of Service.
              </p>
            </Section>

            <Section title="7. DATA SECURITY MEASURES">
              <p>
                In accordance with Texas Business and Commerce Code § 521.052, the Company implements
                and maintains reasonable security procedures and practices appropriate to the nature of
                the Personal Information collected, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Encryption:</strong> All data transmitted between Users and the Services is
                  encrypted using Transport Layer Security (TLS) 1.2 or higher. Data at rest is encrypted
                  using AES-256 encryption.
                </li>
                <li>
                  <strong>Authentication:</strong> User passwords are cryptographically hashed using
                  industry-standard algorithms. Multi-factor authentication options are available.
                </li>
                <li>
                  <strong>Access Controls:</strong> Row-level security policies restrict database access
                  to ensure Users can only access their own data.
                </li>
                <li>
                  <strong>Monitoring:</strong> Systems are monitored for unauthorized access attempts
                  and security anomalies.
                </li>
                <li>
                  <strong>Incident Response:</strong> The Company maintains incident response procedures
                  to address potential security breaches in compliance with Texas Business and Commerce
                  Code § 521.053.
                </li>
              </ul>
              <p className="mt-4">
                Notwithstanding the foregoing, no method of electronic transmission or storage is
                completely secure, and the Company cannot guarantee absolute security of Personal
                Information.
              </p>
            </Section>

            <Section title="8. DATA BREACH NOTIFICATION">
              <p>
                In the event of a breach of system security resulting in the unauthorized acquisition
                of Personal Information, the Company shall provide notification to affected Texas
                residents in accordance with Texas Business and Commerce Code § 521.053, which requires:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Notification without unreasonable delay, and in no event later than 60 days after discovery of the breach</li>
                <li>Written notification sent to the last known address of the affected individual</li>
                <li>Notification to the Texas Attorney General if more than 250 Texas residents are affected</li>
              </ul>
            </Section>

            <Section title="9. DATA RETENTION">
              <p>
                The Company retains Personal Information for the period necessary to fulfill the purposes
                outlined in this Policy, unless a longer retention period is required or permitted by law.
                Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Active Accounts:</strong> Personal Information is retained for the duration of
                  the User&apos;s active account.
                </li>
                <li>
                  <strong>Closed Accounts:</strong> Upon account termination, Personal Information is
                  retained for a period of thirty (30) days to allow for account recovery, after which
                  data is deleted or anonymized.
                </li>
                <li>
                  <strong>Legal Obligations:</strong> Certain data may be retained for longer periods as
                  required by applicable law, including tax, accounting, and legal hold requirements.
                </li>
                <li>
                  <strong>Transaction Records:</strong> Financial transaction records are retained for
                  seven (7) years in accordance with IRS requirements.
                </li>
              </ul>
            </Section>

            <Section title="10. USER RIGHTS UNDER TEXAS LAW">
              <p>
                Subject to applicable law and certain exceptions, Texas residents have the following
                rights with respect to their Personal Information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Right to Access:</strong> You have the right to confirm whether the Company
                  is processing your Personal Information and to access such Personal Information.
                </li>
                <li>
                  <strong>Right to Correction:</strong> You have the right to request correction of
                  inaccurate Personal Information, taking into account the nature of the data and
                  purposes of processing.
                </li>
                <li>
                  <strong>Right to Deletion:</strong> You have the right to request deletion of
                  Personal Information provided by or obtained about you.
                </li>
                <li>
                  <strong>Right to Data Portability:</strong> You have the right to obtain a copy of
                  your Personal Information in a portable and readily usable format.
                </li>
                <li>
                  <strong>Right to Opt-Out:</strong> You have the right to opt out of the sale of
                  Personal Information or targeted advertising. Note: The Company does not sell
                  Personal Information or engage in targeted advertising.
                </li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please submit a verifiable request to the contact
                information provided in Section 15. The Company will respond to verified requests
                within forty-five (45) days.
              </p>
            </Section>

            <Section title="11. COOKIES AND TRACKING TECHNOLOGIES">
              <p>
                The Services utilize strictly necessary cookies required for the operation of the
                platform, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Session authentication cookies</li>
                <li>Security and fraud prevention cookies</li>
                <li>User preference cookies</li>
              </ul>
              <p className="mt-4">
                The Company does not use cookies for advertising, cross-site tracking, or sale of
                Personal Information to third parties.
              </p>
            </Section>

            <Section title="12. CHILDREN&apos;S PRIVACY">
              <p>
                The Services are not directed to individuals under the age of eighteen (18) years.
                The Company does not knowingly collect Personal Information from children under 18.
                If the Company becomes aware that Personal Information has been collected from a child
                under 18 without verification of parental consent, the Company will take steps to
                delete such information promptly. If you believe the Company has collected information
                from a child under 18, please contact us immediately.
              </p>
            </Section>

            <Section title="13. MODIFICATIONS TO THIS POLICY">
              <p>
                The Company reserves the right to modify this Privacy Policy at any time. Material
                changes to this Policy will be communicated by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Posting the revised Policy on this page with an updated effective date</li>
                <li>Sending notice to the email address associated with your account</li>
                <li>Displaying a prominent notice within the Services</li>
              </ul>
              <p className="mt-4">
                Your continued use of the Services following the posting of changes constitutes
                acceptance of such changes. We encourage you to review this Policy periodically.
              </p>
            </Section>

            <Section title="14. GOVERNING LAW">
              <p>
                This Privacy Policy shall be governed by and construed in accordance with the laws
                of the State of Texas, without regard to its conflict of law provisions. Any dispute
                arising out of or relating to this Policy shall be subject to the exclusive jurisdiction
                of the state and federal courts located in Texas.
              </p>
            </Section>

            <Section title="15. CONTACT INFORMATION">
              <p>
                For questions, concerns, or requests regarding this Privacy Policy or the Company&apos;s
                data practices, please contact:
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold">Tenant Wise</p>
                <p>Attn: Privacy Officer</p>
                <p className="mt-2">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:privacy@tenantwise.ai" className="text-blue-600 hover:underline">
                    privacy@tenantwise.ai
                  </a>
                </p>
                <p>
                  <strong>Website:</strong>{" "}
                  <Link href="/" className="text-blue-600 hover:underline">
                    www.tenantwise.ai
                  </Link>
                </p>
              </div>
              <p className="mt-4">
                The Company will acknowledge receipt of your inquiry within five (5) business days and
                provide a substantive response within forty-five (45) days.
              </p>
            </Section>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground italic">
                This Privacy Policy is provided for informational purposes and constitutes a binding
                agreement between you and Tenant Wise. This document does not constitute legal advice.
                If you have questions about your legal rights or obligations, please consult with a
                licensed attorney in your jurisdiction.
              </p>
            </div>
          </div>
        </div>
      </div>

      </div>
    </PageWrapper>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      <div className="text-muted-foreground space-y-3">{children}</div>
    </section>
  );
}
