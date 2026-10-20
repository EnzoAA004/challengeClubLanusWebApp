import { Dashboard } from '@/components/dashboard';
import { requirePageSession } from '@/lib/page-auth';

export default async function HomePage() {
  await requirePageSession();
  return <Dashboard active="home" />;
}
