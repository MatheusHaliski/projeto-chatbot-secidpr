import StatBadge from '../shared/StatBadge';

interface ProfileSummaryCardProps {
  username: string;
  displayName: string;
  bio: string;
  loginEmail: string;
  loginStatus: string;
  authSource: string;
}

export default function ProfileSummaryCard({ username, displayName, bio, loginEmail, loginStatus, authSource }: ProfileSummaryCardProps) {
  return (
    <article className="rounded-2xl border border-white/20 p-5 shadow-lg" style={{ backgroundColor: 'var(--user-surface-solid, #ea580c)' }}>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl text-white">
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{displayName || `@${username}`}</h3>
          <p className="text-sm font-medium text-white/85">{bio || `@${username}`}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Login" value={loginEmail} />
        <StatBadge label="Status" value={loginStatus} />
        <StatBadge label="Source" value={authSource} />
      </div>
    </article>
  );
}
