import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';

// Server-side guard for all admin pages (except /admin/login, which is outside this route group).
// Redirects unauthenticated users to /admin/login.
export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get('admin_session')?.value || '';
  if (!verifySessionToken(token)) {
    redirect('/admin/login');
  }
  return <>{children}</>;
}
