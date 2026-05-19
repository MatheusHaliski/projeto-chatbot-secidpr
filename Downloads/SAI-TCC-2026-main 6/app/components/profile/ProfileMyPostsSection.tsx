import SectionBlock from '@/app/components/shared/SectionBlock';
import CompactCardActionBar from '@/app/components/profile/CompactCardActionBar';
import { UserPostRecord } from '@/app/components/profile/types';

interface ProfileMyPostsSectionProps {
  posts: UserPostRecord[];
}

export default function ProfileMyPostsSection({ posts }: ProfileMyPostsSectionProps) {
  return (
    <SectionBlock title="My Posts" subtitle="Public/published outfit cards and cross-platform export state.">
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {posts.map((post) => (
          <article key={post.post_id} className="rounded-2xl border border-white/25 bg-white/10 p-3 backdrop-blur-md">
            <img src={post.preview_image_url} alt={post.title} className="h-36 w-full rounded-xl object-cover" />
            <h4 className="mt-3 text-sm font-semibold text-white">{post.title}</h4>
            <p className="mt-1 line-clamp-2 text-xs text-white/75">{post.caption}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/90">
              <span className="rounded-full border border-white/30 px-2 py-0.5">{post.status}</span>
              <span className="rounded-full border border-cyan-300/50 bg-cyan-500/20 px-2 py-0.5">{post.platforms.join(' · ')}</span>
              <span className="rounded-full border border-white/30 px-2 py-0.5">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <CompactCardActionBar
              actions={[
                { label: 'View details' },
                { label: 'Re-export', tone: 'accent' },
                { label: 'Edit caption' },
                { label: 'Duplicate' },
                { label: 'Unpublish', tone: 'danger' },
              ]}
            />
          </article>
        ))}
        {!posts.length ? <p className="text-sm text-white/80">No post exports yet. Export from a scheme to populate this section.</p> : null}
      </div>
    </SectionBlock>
  );
}
