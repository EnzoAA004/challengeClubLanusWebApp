import MovementDetail from './movement-detail-client';
import { requirePageSession } from '@/lib/page-auth';

export default async function MovementDetailPage() {
  await requirePageSession();
  return <MovementDetail />;
}
