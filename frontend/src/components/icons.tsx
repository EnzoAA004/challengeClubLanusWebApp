import type { MovementType } from '@/lib/types';

type IconProps = { className?: string };

export function SearchIcon({ className = 'h-5 w-5' }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.2 4.2"/></svg>;
}

export function HomeIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 10.5 8.5-7 8.5 7v9a1.5 1.5 0 0 1-1.5 1.5h-4.4v-6.2h-5.2V21H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>;
}

export function MovementsIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2.8" width="14" height="18.4" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
}

export function LogoutIcon({ className = 'h-6 w-6' }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l4-4-4-4M14 12H3"/></svg>;
}

export function MovementIcon({ type, className = 'h-5 w-5' }: IconProps & { type: MovementType }) {
  if (type === 'subscription') return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4v15m0-15L5 7m3-3 3 3M16 20V5m0 15 3-3m-3 3-3-3"/></svg>;
  if (type === 'received') return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 4.5 13.5h4.75V4h5.5v9.5h4.75z"/></svg>;
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 19.5 10.5h-4.75V20h-5.5v-9.5H4.5z"/></svg>;
}
