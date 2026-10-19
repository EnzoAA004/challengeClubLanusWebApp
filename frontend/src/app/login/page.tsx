'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[#f8f9fb] px-5 pb-6 pt-14 shadow-xl">
      <div className="mt-1 text-center">
        <div className="mx-auto mb-3 h-8 w-8 rounded-[9px] bg-[var(--granate)]" />
        <h1 className="text-[27px] font-bold tracking-tight text-[var(--granate)]">GranaBank</h1>
        <p className="mt-2 text-xs text-[#687895]">Con cada compra, sumás orgullo granate</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-12 flex flex-1 flex-col">
        <label htmlFor="email" className="mb-2 text-[11px] font-medium">Email</label>
        <input id="email" type="email" autoComplete="email" required placeholder="Ingresa tu email" value={email} onChange={(event) => setEmail(event.target.value)} className="mb-4 h-11 rounded-xl border border-transparent bg-white px-3 text-xs shadow-[0_8px_24px_rgba(30,38,58,.06)] outline-none focus:border-[#c5a3aa]" />
        <label htmlFor="password" className="mb-2 text-[11px] font-medium">Contraseña</label>
        <input id="password" type="password" autoComplete="current-password" required placeholder="Ingresa tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border border-transparent bg-white px-3 text-xs shadow-[0_8px_24px_rgba(30,38,58,.06)] outline-none focus:border-[#c5a3aa]" />
        <label className="mt-2 flex items-center gap-1.5 text-[10px] text-[#969aa2]"><input type="checkbox" className="accent-[var(--granate)]" /> Recordarme</label>
        {error && <p role="alert" className="mt-3 text-center text-[11px] text-[#a33042]">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="mt-auto h-10 rounded-xl bg-[var(--granate)] text-[11px] font-semibold text-white shadow-lg transition hover:bg-[#6f1729] disabled:opacity-70">{isSubmitting ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
      <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-[#e7e8ec]" />
    </main>
  );
}
