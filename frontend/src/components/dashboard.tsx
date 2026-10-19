'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import type { Account, ApiEnvelope, Movement, MovementListResult, MovementType } from '@/lib/types';
import { HomeIcon, LogoutIcon, MovementIcon, MovementsIcon, SearchIcon } from './icons';

type LoadState = 'loading' | 'error' | 'empty' | 'ready';

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Débito Aut.', value: 'subscription' },
  { label: 'Recibido', value: 'received' },
  { label: 'Enviado', value: 'sent' },
] as const;

async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  return fetchApi<T>(path, { signal });
}

function formatAmount(amount: string, currency: string): string {
  const number = Number(amount);
  if (!Number.isFinite(number)) return `${currency} ${amount}`;
  if (currency === 'USD') {
    return `$${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
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
          <MovementIcon type={movement.type} />
        </div>
        <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-[#53627a]">{movement.counterparty}</p><p className="mt-0.5 truncate text-[9px] text-[#a7a8ae]">{movement.description}</p></div>
        <span className="text-[9px] font-medium" style={{ color }}>{formatAmount(movement.amount, movement.currency)}</span>
      </article>
    </Link>
  );
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]['value']>('all');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [latest, setLatest] = useState<Movement[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retry, setRetry] = useState(0);

  const retryLoad = useCallback(() => setRetry((value) => value + 1), []);

  const logout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await fetchApi<{ status: string }>('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch {
      setLogoutError('No pudimos cerrar la sesión. Intentá nuevamente.');
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (active !== 'home') return;
    const controller = new AbortController();
    setLoadState('loading');
    setErrorMessage('');
    void Promise.all([
      fetchJson<ApiEnvelope<Account>>('/api/accounts/demo', controller.signal),
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
              <div className="flex gap-4 text-[#172033]"><Link href="/movimientos" aria-label="Buscar movimientos" className="grid h-10 w-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)]"><SearchIcon /></Link></div>
            </header>
            <section className="relative overflow-hidden rounded-[20px] bg-[var(--granate)] px-4 py-3 text-white shadow-lg">
              <div className="absolute -right-3 top-5 h-24 w-8 rounded-full bg-[#f1a2a6]" />
              <div className="relative flex items-center justify-between text-[9px]"><span>Balance</span><span className="mr-2 flex"><i className="h-3.5 w-3.5 rounded-full bg-[#f04428]"/><i className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#ffb124]/90"/></span></div>
              <div className="relative mt-1 flex items-center gap-2 text-[14px]"><span className="rounded bg-gradient-to-br from-yellow-300 to-pink-500 px-1.5 py-1 text-[7px] font-bold">{account?.currency ?? 'USD'}</span><strong className="font-medium">{account ? Number(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</strong></div>
              <p className="relative mt-3 text-[12px] tracking-[.12em]">**** &nbsp; **** &nbsp; **** &nbsp;1234</p>
              <div className="relative mt-3 flex items-end justify-between"><span className="text-[9px]">Soy Granate</span><span className="text-right text-[7px]">Exp. Date<br/><b className="text-[9px]">02/30</b></span></div>
            </section>
            <div className="mt-5 flex items-center justify-between"><h2 className="text-[14px] font-semibold">Últimos movimientos</h2><Link href="/movimientos" aria-label="Ver todos los movimientos" className="grid h-9 w-9 place-items-center rounded-full text-[#64718a] outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)]"><SearchIcon /></Link></div>
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
            <label htmlFor="movement-search" className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 shadow-[0_8px_22px_rgba(30,38,58,.055)]"><SearchIcon className="h-4 w-4 shrink-0 text-[#9ea1a9]"/><input id="movement-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ingresa un nombre o servicio" className="w-full bg-transparent text-[9px] outline-none placeholder:text-[#a9a9af]" /></label>
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
      <nav aria-label="Navegación principal" className="fixed bottom-0 left-1/2 flex h-[62px] w-full max-w-[430px] -translate-x-1/2 items-center justify-around rounded-t-2xl bg-white shadow-[0_-8px_24px_rgba(32,37,55,.07)]">
        <Link href="/home" aria-current={active === 'home' ? 'page' : undefined} aria-label="Inicio" className={`grid h-11 w-11 place-items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)] ${active === 'home' ? 'text-[var(--granate)]' : 'text-[#15191f]'}`}><HomeIcon /></Link>
        <Link href="/movimientos" aria-current={active === 'movimientos' ? 'page' : undefined} aria-label="Movimientos" className={`grid h-11 w-11 place-items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)] ${active === 'movimientos' ? 'text-[var(--granate)]' : 'text-[#15191f]'}`}><MovementsIcon /></Link>
        <button type="button" onClick={logout} disabled={isLoggingOut} aria-label="Cerrar sesión" className="grid h-11 w-11 place-items-center rounded-lg text-[#15191f] outline-none hover:text-[var(--granate)] focus-visible:ring-2 focus-visible:ring-[var(--granate)] disabled:opacity-60">{isLoggingOut ? '…' : <LogoutIcon />}</button>
      </nav>
      {logoutError && <p role="alert" className="fixed bottom-[68px] left-1/2 w-[calc(100%-2rem)] max-w-[398px] -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-center text-xs text-[#a33042] shadow">{logoutError}</p>}
    </main>
  );
}
