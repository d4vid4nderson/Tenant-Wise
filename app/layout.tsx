import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Tenant Wise - Smart Document Generation for Small Landlords",
  description: "Generate Texas-compliant legal documents, notices, and letters for your rental properties. Save time and stay compliant.",
  keywords: ["landlord", "property management", "Texas", "legal documents", "rent notice", "lease renewal"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
