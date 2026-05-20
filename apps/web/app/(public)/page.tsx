import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import CTA from '@/components/landing/CTA';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <span className="text-white font-bold text-xl">DECIA</span>
              <p className="text-sm mt-1">Decisão Coletiva com Inteligência Artificial</p>
            </div>
            <div className="text-sm">
              <p>Desenvolvido pela SEIA</p>
              <p>Secretaria da Inovação e Inteligência Artificial</p>
              <p>Governo do Estado do Paraná</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
