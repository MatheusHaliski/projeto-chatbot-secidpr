interface SchemeStepCardProps {
  step: string;
  title: string;
  description: string;
  icon: string;
}

export default function SchemeStepCard({ step, title, description, icon }: SchemeStepCardProps) {
  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.14em] text-white/65">{step}</p>
      <h4 className="mt-1 text-sm font-semibold text-white">
        <span className="mr-1.5">{icon}</span>
        {title}
      </h4>
      <p className="mt-1 text-sm text-white/75">{description}</p>
    </article>
  );
}
