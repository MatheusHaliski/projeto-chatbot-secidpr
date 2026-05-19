interface PageHeaderProps {
  title: string;
  subtitle: string;
  className?: string;
}

export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
      <div className={`sa-surface-header rounded-2xl border-8 border-white mt-0 w-full px-4 py-3 shadow-lg transition duration-300 hover:brightness-110 ${className ?? ''}`}>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/70">{subtitle}</p>
      </div>
  );
}
