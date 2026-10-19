'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!response.ok) {
        const result = await response.json() as { message?: string };
        setError(result.message ?? 'No pudimos iniciar sesión.');
        return;
      }
      router.push('/home');
    } catch {
      setError('No pudimos conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f8f9fb] px-4 pb-6 pt-[min(18vh,104px)] shadow-xl sm:px-5">
      <div className="mt-1 text-center">
        <div className="mx-auto mb-3 h-8 w-8 rounded-[9px] bg-[var(--granate)]" aria-hidden="true" />
        <h1 className="text-[26px] font-bold tracking-[-.04em] text-[var(--granate)]">GranaBank</h1>
        <p className="mt-2 text-[11px] text-[#687895]">Con cada compra, sumás orgullo granate</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-1 flex-col" aria-label="Iniciar sesión">
        <label htmlFor="email" className="mb-2 text-[11px] font-medium">Email</label>
        <input id="email" type="email" autoComplete="email" required placeholder="Ingresa tu email" value={email} onChange={(event) => setEmail(event.target.value)} className="mb-4 h-11 rounded-[11px] border border-transparent bg-white px-3 text-xs shadow-[0_8px_24px_rgba(30,38,58,.06)] outline-none focus-visible:border-[#c5a3aa] focus-visible:ring-2 focus-visible:ring-[#841b31]/20" />
        <label htmlFor="password" className="mb-2 text-[11px] font-medium">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" required placeholder="Ingresa tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-[11px] border border-transparent bg-white px-3 text-xs shadow-[0_8px_24px_rgba(30,38,58,.06)] outline-none focus-visible:border-[#c5a3aa] focus-visible:ring-2 focus-visible:ring-[#841b31]/20" />
        <label className="mt-2 flex min-h-8 w-fit items-center gap-1.5 rounded-md pr-2 text-[10px] text-[#969aa2] focus-within:ring-2 focus-within:ring-[var(--granate)]"><input checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} type="checkbox" className="h-4 w-4 accent-[var(--granate)]" /> Recordarme</label>
        {error && <p role="alert" aria-live="polite" className="mt-3 rounded-lg bg-[#fff1f2] px-3 py-2 text-center text-[11px] text-[#a33042]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-auto h-10 rounded-[10px] bg-[var(--granate)] text-[11px] font-semibold text-white shadow-lg transition hover:bg-[var(--granate-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--granate)] focus-visible:ring-offset-2 disabled:opacity-70">{isSubmitting ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-[#e7e8ec]" />
    </main>
  );
}
