import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-24 bg-primary-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Comece a tomar decisões melhores hoje
        </h2>
        <p className="text-primary-200 text-xl mb-10">
          Gratuito para equipes de ate 20 opinioes por sessao. Sem necessidade de cartao de credito.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-10 py-4 bg-white text-primary-900 font-bold rounded-xl hover:bg-primary-50 transition-colors text-lg"
        >
          Criar conta gratis
        </Link>
      </div>
    </section>
  );
}
