const FEATURES = [
  {
    title: 'Decisão fundamentada',
    description: 'A IA analisa todas as opiniões e gera uma decisão com resumo, recomendação e justificativa detalhada.',
  },
  {
    title: 'Artefatos automáticos',
    description: 'Receba automaticamente arquivos .txt, .py, .js ou .csv conforme o tipo de problema discutido.',
  },
  {
    title: 'Auditoria completa',
    description: 'Todas as sessões, opiniões e decisões ficam registradas e acessíveis no painel administrativo.',
  },
  {
    title: 'Sem formulários',
    description: 'Opiniões em linguagem natural no Telegram — sem formulários, campos ou templates a preencher.',
  },
  {
    title: 'Segurança por token',
    description: 'Cada workspace possui um token exclusivo. Apenas grupos autorizados podem interagir com o bot.',
  },
  {
    title: 'Multi-workspace',
    description: 'Gerencie múltiplos grupos e equipes em um único painel, com isolamento total de dados.',
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900">Funcionalidades</h2>
          <p className="text-gray-600 mt-4 text-lg">Tudo que sua equipe precisa para decidir melhor</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary-100 rounded-xl mb-4 flex items-center justify-center">
                <div className="w-5 h-5 bg-primary-600 rounded" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
