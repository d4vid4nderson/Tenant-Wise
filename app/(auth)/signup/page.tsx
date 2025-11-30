import { redirect } from 'next/navigation';

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  // Redirect to the combined auth page
  // The plan param will be handled there
  redirect('/login');
}
