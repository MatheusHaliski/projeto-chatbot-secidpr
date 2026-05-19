import { AppRoute } from '@/app/lib/stylist-shell';
import ProfileView from '@/app/views/ProfileView';
import CreateMySchemeView from '@/app/views/CreateMySchemeView';
import ExploreSchemeView from '@/app/views/ExploreSchemeView';
import MyWardrobeView from '@/app/views/MyWardrobeView';
import SearchItemsView from '@/app/views/SearchItemsView';
import DressTesterView from '@/app/views/DressTesterView';
import SearchPiecesView from '@/app/views/SearchPiecesView';

interface ContentRouterProps {
  route: AppRoute;
}

export default function ContentRouter({ route }: ContentRouterProps) {
  if (route === 'create-my-scheme') return <CreateMySchemeView />;
  if (route === 'search-items') return <SearchItemsView />;
  if (route === 'explore-scheme') return <ExploreSchemeView />;
  if (route === 'profile' || route === 'profile-settings') return <ProfileView />;
  if (route === 'search-pieces') return <SearchPiecesView />;
  if (route === 'dress-tester') return <DressTesterView />;
  return <MyWardrobeView />;
}
