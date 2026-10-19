'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export type MovementType = 'subscription' | 'received' | 'sent';
export type Movement = {
  id: string;
  counterparty: string;
  description: string;
  amount: string;
  currency: string;
  type: MovementType;
  occurredAt: string;
};
type Account = { id: string; name: string; balance: string; currency: string };
type LoadState = 'loading' | 'error' | 'empty' | 'ready';
type HealthState = 'checking' | 'ok' | 'error';
type ApiResult<T> = { data: T };
type MovementListResult = { data: Movement[]; meta: { count: number } };

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Débito Aut.', value: 'subscription' },
  { label: 'Recibido', value: 'received' },
  { label: 'Enviado', value: 'sent' },
] as const;

function apiUrl(path: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  return `${baseUrl}${path}`;
}

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { signal, cache: 'no-store' });
  const result = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(result.message ?? 'No pudimos cargar la información.');
  return result;
}

function formatAmount(amount: string, currency: string): string {
  const number = Number(amount);
  if (!Number.isFinite(number)) return `${currency} ${amount}`;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(number);
}

function MovementCard({ movement }: { movement: Movement }) {
  const incoming = movement.type === 'received';
  const subscription = movement.type === 'subscription';
  const color = subscription ? '#be35ff' : incoming ? '#861b32' : '#f79443';
  return (
    <Link href={`/movimientos/${movement.id}`} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)]">
      <article className="flex min-h-[68px] items-center gap-3 rounded-xl bg-white px-3 shadow-[0_8px_22px_rgba(30,38,58,.055)]">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-base font-bold" style={{ background: subscription ? '#f4e3ff' : incoming ? '#ead5d9' : '#ffead6', color }} aria-hidden="true">
          {subscription ? '↕' : incoming ? '↓' : '↑'}
        </div>
        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-[#53627a]">{movement.counterparty}</p><p className="mt-0.5 truncate text-[9px] text-[#a7a8ae]">{movement.description}</p></div>
        <span className="text-[9px] font-medium" style={{ color }}>{formatAmount(movement.amount, movement.currency)}</span>
      </article>
    </Link>
  );
}

function StatusPill({ label, state }: { label: string; state: HealthState }) {
  const text = state === 'checking' ? 'Conectando' : state === 'ok' ? 'En línea' : 'Sin conexión';
  const color = state === 'ok' ? '#18794e' : state === 'error' ? '#a33042' : '#8c7181';
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[9px]" style={{ color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{label}: {text}</span>;
}

function LoadingMessage() {
  return <p role="status" className="rounded-xl bg-white px-4 py-5 text-center text-xs text-[#737987]">Cargando información…</p>;
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl bg-white px-4 py-5 text-center shadow-sm">
      <p className="text-xs text-[#a33042]">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-[var(--granate)] px-4 py-2 text-[11px] font-semibold text-white">Reintentar</button>
    </div>
  );
}

export function Dashboard({ active }: { active: 'home' | 'movimientos' }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all');
  const [apiState, setApiState] = useState<HealthState>('checking');
  const [dbState, setDbState] = useState<HealthState>('checking');
  const [account, setAccount] = useState<Account | null>(null);
  const [latest, setLatest] = useState<Movement[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retry, setRetry] = useState(0);

  const retryLoad = useCallback(() => setRetry((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const check = async (path: string, setter: (state: HealthState) => void) => {
      try {
        const response = await fetch(apiUrl(path), { signal: controller.signal, cache: 'no-store' });
        setter(response.ok ? 'ok' : 'error');
      } catch {
        if (!controller.signal.aborted) setter('error');
      }
    };
    void check('/api/health', setApiState);
    void check('/api/health/db', setDbState);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (active !== 'home') return;
    const controller = new AbortController();
    setLoadState('loading');
    setErrorMessage('');
    void Promise.all([
      fetchJson<ApiResult<Account>>('/api/accounts/demo', controller.signal),
      fetchJson<MovementListResult>('/api/accounts/demo/movements?limit=4', controller.signal),
    ]).then(([accountResult, movementResult]) => {
      setAccount(accountResult.data);
      setLatest(movementResult.data);
      setLoadState(movementResult.data.length ? 'ready' : 'empty');
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setErrorMessage(error instanceof Error ? error.message : 'No pudimos cargar tu cuenta.');
        setLoadState('error');
      }
    });
    return () => controller.abort();
  }, [active, retry]);

  useEffect(() => {
    if (active !== 'movimientos') return;
    const controller = new AbortController();
    setLoadState('loading');
    setErrorMessage('');
    const params = new URLSearchParams();
    const normalizedQuery = query.trim();
    if (normalizedQuery) params.set('search', normalizedQuery);
    if (filter !== 'all') params.set('type', filter);
    const suffix = params.size ? `?${params.toString()}` : '';

    void fetchJson<MovementListResult>(`/api/accounts/demo/movements${suffix}`, controller.signal)
      .then((result) => {
        setMovements(result.data);
        setLoadState(result.data.length ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : 'No pudimos cargar los movimientos.');
          setLoadState('error');
        }
      });
    return () => controller.abort();
  }, [active, filter, query, retry]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f8f9fb] shadow-xl">
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-5">
        {active === 'home' ? (
          <>
            <header className="flex items-center justify-between px-1 pb-4">
              <div><p className="text-[10px] text-[#63728c]">Hola</p><h1 className="text-[15px] font-semibold text-[#39465e]">{account?.name ?? 'Granate'}</h1></div>
              <div className="flex gap-4 text-[#172033]"><Link href="/movimientos" aria-label="Buscar movimientos" className="text-lg">⌕</Link><button aria-label="Notificaciones" className="text-base">♧</button></div>
            </header>
            <section className="relative overflow-hidden rounded-[20px] bg-[var(--granate)] px-4 py-3 text-white shadow-lg">
              <div className="absolute -right-3 top-5 h-24 w-8 rounded-full bg-[#f1a2a6]" />
              <div className="relative flex items-center justify-between text-[9px]"><span>Balance</span><span className="mr-2 flex"><i className="h-3.5 w-3.5 rounded-full bg-[#f04428]"/><i className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#ffb124]/90"/></span></div>
              <div className="relative mt-1 flex items-center gap-2 text-[14px]"><span className="rounded bg-gradient-to-br from-yellow-300 to-pink-500 px-1.5 py-1 text-[7px] font-bold">{account?.currency ?? 'USD'}</span><strong className="font-medium">{account ? Number(account.balance).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</strong></div>
              <p className="relative mt-3 text-[12px] tracking-[.12em]">**** &nbsp; **** &nbsp; **** &nbsp;1234</p>
              <div className="relative mt-3 flex items-end justify-between"><span className="text-[9px]">Soy Granate</span><span className="text-right text-[7px]">Exp. Date<br/><b className="text-[9px]">02/30</b></span></div>
            </section>
            <div className="mt-5 flex items-center justify-between"><h2 className="text-[14px] font-semibold">Últimos movimientos</h2><Link href="/movimientos" aria-label="Ver todos los movimientos" className="text-lg leading-none text-[#64718a]">⌕</Link></div>
            <div className="mt-3 grid gap-2.5">
              {loadState === 'loading' && <LoadingMessage />}
              {loadState === 'error' && <ErrorMessage message={errorMessage} onRetry={retryLoad} />}
              {loadState === 'empty' && <p className="rounded-xl bg-white px-4 py-5 text-center text-xs text-[#737987]">Todavía no hay movimientos en tu cuenta.</p>}
              {loadState === 'ready' && latest.map((movement) => <MovementCard key={movement.id} movement={movement} />)}
            </div>
          </>
        ) : (
          <>
            <header className="px-1 pb-3 pt-2"><h1 className="text-[17px] font-semibold">Movimientos</h1></header>
            <label htmlFor="movement-search" className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 shadow-[0_8px_22px_rgba(30,38,58,.055)]"><span className="text-lg text-[#9ea1a9]" aria-hidden="true">⌕</span><input id="movement-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ingresa un nombre o servicio" className="w-full bg-transparent text-[9px] outline-none placeholder:text-[#a9a9af]" /></label>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Filtrar movimientos">{filters.map((item) => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full px-3 py-2 text-[9px] transition ${filter === item.value ? 'bg-[var(--granate)] text-white' : 'bg-white text-[#222]'}`}>{item.label}</button>)}</div>
            <div className="mt-4 grid gap-2.5" aria-live="polite">
              {loadState === 'loading' && <LoadingMessage />}
              {loadState === 'error' && <ErrorMessage message={errorMessage} onRetry={retryLoad} />}
              {loadState === 'empty' && <p className="rounded-xl bg-white px-4 py-5 text-center text-xs text-[#737987]">No encontramos movimientos con esos datos.</p>}
              {loadState === 'ready' && movements.map((movement) => <MovementCard key={movement.id} movement={movement} />)}
            </div>
          </>
        )}
      </div>
      <div className="fixed bottom-0 left-1/2 flex h-[58px] w-full max-w-[430px] -translate-x-1/2 items-center justify-around rounded-t-2xl bg-white shadow-[0_-8px_24px_rgba(32,37,55,.07)]">
        <Link href="/home" aria-label="Inicio" className={`text-xl ${active === 'home' ? 'text-[var(--granate)]' : 'text-[#15191f]'}`}>⌂</Link>
        <Link href="/movimientos" aria-label="Movimientos" className={`text-xl ${active === 'movimientos' ? 'text-[var(--granate)]' : 'text-[#15191f]'}`}>▤</Link>
        <Link href="/login" aria-label="Salir" className="text-xl text-[#15191f]">⇥</Link>
      </div>
      <div className="fixed bottom-[66px] left-1/2 flex w-full max-w-[430px] -translate-x-1/2 justify-center gap-2 px-2"><StatusPill label="API" state={apiState}/><StatusPill label="PostgreSQL" state={dbState}/></div>
    </main>
  );
}
