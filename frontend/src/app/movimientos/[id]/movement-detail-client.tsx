'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { ApiEnvelope, Movement } from '@/lib/types';
import { MovementIcon } from '@/components/icons';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';
export default function MovementDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [movement, setMovement] = useState<Movement | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const retryLoad = useCallback(() => setRetry((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setError('');
    fetchApi<ApiEnvelope<Movement>>(`/api/movements/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((result) => result.data)
      .then((result) => {
        setMovement(result);
        setState('ready');
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const message = reason instanceof Error ? reason.message : 'No pudimos cargar el movimiento.';
        setError(message);
        setState(message.includes('No encontramos') ? 'empty' : 'error');
      });
    return () => controller.abort();
  }, [id, retry]);

  const kindLabel = movement?.type === 'subscription' ? 'Débito automático' : movement?.type === 'received' ? 'Pago recibido' : 'Pago enviado';
  const color = movement?.type === 'subscription' ? '#be35ff' : movement?.type === 'received' ? '#861b32' : '#f79443';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f8f9fb] px-5 pb-8 pt-6 shadow-xl">
      <Link href="/movimientos" className="w-fit text-sm font-medium text-[var(--granate)]">← Volver a movimientos</Link>
      <h1 className="mt-7 text-[20px] font-semibold text-[#39465e]">Detalle del movimiento</h1>
      {state === 'loading' && <p role="status" className="mt-5 rounded-2xl bg-white px-4 py-6 text-center text-sm text-[#737987]">Cargando movimiento…</p>}
      {(state === 'error' || state === 'empty') && (
        <div role="alert" className="mt-5 rounded-2xl bg-white px-4 py-6 text-center">
          <p className="text-sm text-[#a33042]">{error}</p>
          {state === 'error' && <button type="button" onClick={retryLoad} className="mt-4 rounded-lg bg-[var(--granate)] px-4 py-2 text-xs font-semibold text-white">Reintentar</button>}
        </div>
      )}
      {state === 'ready' && movement && (
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-[0_8px_22px_rgba(30,38,58,.055)]">
          <div className="grid h-12 w-12 place-items-center rounded-2xl text-xl font-bold" style={{ background: movement.type === 'subscription' ? '#f4e3ff' : movement.type === 'received' ? '#ead5d9' : '#ffead6', color }} aria-hidden="true">
            <MovementIcon type={movement.type} />
          </div>
          <p className="mt-5 text-sm text-[#8790a0]">{kindLabel}</p>
          <h2 className="mt-1 text-xl font-semibold text-[#39465e]">{movement.counterparty}</h2>
          <p className="mt-2 text-sm text-[#737987]">{movement.description}</p>
          <p className="mt-6 border-t border-[#edf0f3] pt-5 text-2xl font-semibold text-[#182033]">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: movement.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(movement.amount))}</p>
          <dl className="mt-6 grid gap-4 border-t border-[#edf0f3] pt-5 text-xs">
            <div className="flex justify-between gap-4"><dt className="text-[#8790a0]">Fecha</dt><dd className="text-right text-[#39465e]">{new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(movement.occurredAt))}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#8790a0]">Identificador</dt><dd className="max-w-[220px] break-all text-right text-[#39465e]">{movement.id}</dd></div>
          </dl>
        </section>
      )}
    </main>
  );
}
