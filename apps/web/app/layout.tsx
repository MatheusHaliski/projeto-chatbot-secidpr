import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DECIA — Decisão Coletiva com IA',
  description: 'Sistema de decisão coletiva com inteligência artificial para equipes de trabalho',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
