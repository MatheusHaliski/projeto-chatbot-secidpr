import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-primary-600 text-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            DECIA<br />
            <span className="text-primary-200">Decisão Coletiva com IA</span>
          </h1>
          <p className="text-xl text-primary-100 mb-10 leading-relaxed">
            Transforme discussões em grupo no Telegram em decisões fundamentadas pela inteligência artificial.
            Sem formulários, sem reuniões intermináveis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-lg"
            >
              Começar grátis
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-300 text-white font-semibold rounded-xl hover:bg-primary-500 transition-colors text-lg"
            >
              Como funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
