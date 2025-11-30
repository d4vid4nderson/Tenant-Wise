import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FiHome, FiUsers, FiSettings, FiLogOut, FiFileText, FiMessageCircle, FiTool } from 'react-icons/fi';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Sidebar - Fixed position */}
      <aside className="fixed top-0 left-0 w-64 h-screen bg-white border-r border-border p-4 flex flex-col overflow-y-auto">
        {/* Logo */}
        <Link href="/dashboard" className="text-2xl font-bold px-4 py-3 mb-4" style={{ background: 'linear-gradient(120deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Tenant Wise
        </Link>

        <nav className="space-y-1 flex-1">
          <SidebarLink href="/dashboard" icon={<FiHome />}>Dashboard</SidebarLink>
          <SidebarLink href="/dashboard/documents" icon={<FiFileText />}>Documents</SidebarLink>
          <SidebarLink href="/dashboard/properties" icon={<FiHome />}>Properties</SidebarLink>
          <SidebarLink href="/dashboard/tenants" icon={<FiUsers />}>Tenants</SidebarLink>
          <SidebarLink href="/dashboard/contractors" icon={<FiTool />}>Contractors</SidebarLink>
          <SidebarLink href="/chat" icon={<FiMessageCircle />}>Legal Assistant</SidebarLink>
        </nav>

        {/* Bottom section */}
        <div className="pt-4 border-t border-border">
          {/* Settings & Sign Out */}
          <div className="space-y-1">
            <SidebarLink href="/dashboard/settings" icon={<FiSettings />}>Settings</SidebarLink>
            <Link
              href="/signout"
              className="flex items-center gap-3 px-4 py-2 w-full text-secondary hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <FiLogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </div>

          {/* Footer Links */}
          <div className="mt-4 pt-4 border-t border-border px-4 space-y-2">
            <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <p className="text-xs text-muted-foreground pt-2">
              © {new Date().getFullYear()} Tenant Wise
            </p>
            <p className="text-xs text-muted-foreground">
              Documents are templates only. Consult an attorney for legal advice.
            </p>
            <div className="pt-2 border-t border-border mt-2">
              <p className="text-xs text-muted-foreground">
                Made in Texas with <span className="text-red-500">❤</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Offset by sidebar width */}
      <main className="ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 text-secondary hover:text-foreground hover:bg-muted rounded-lg transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
