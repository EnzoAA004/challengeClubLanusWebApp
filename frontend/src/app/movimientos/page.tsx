import { Dashboard } from '@/components/dashboard';
import { requirePageSession } from '@/lib/page-auth';

export default async function MovimientosPage() {
  await requirePageSession();
  return <Dashboard active="movimientos" />;
}
