interface SearchUserCardProps {
  name: string;
  username: string;
  descriptor?: string;
  avatarUrl?: string;
  onOpenProfile: () => void;
}

export default function SearchUserCard({ name, username, descriptor, avatarUrl, onOpenProfile }: SearchUserCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpenProfile}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpenProfile();
      }}
      className="cursor-pointer rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-white/30 bg-white/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold">{name.slice(0, 1)}</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-sm text-white/70">@{username}</p>
        </div>
      </div>
      {descriptor ? <p className="mt-2 text-xs text-white/70">{descriptor}</p> : null}
    </article>
  );
}
