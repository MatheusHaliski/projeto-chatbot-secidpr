interface ContextSectionItemProps {
  label: string;
  isActive?: boolean;
  onSelect?: () => void;
}

export default function ContextSectionItem({ label, isActive, onSelect }: ContextSectionItemProps) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
          isActive
            ? 'bg-white text-black shadow'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        {label}
      </button>
    </li>
  );
}
