import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GranaBank | Club Lanús',
  description: 'Tu cuenta granate, siempre cerca.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
