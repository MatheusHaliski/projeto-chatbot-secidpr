'use client';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface Props {
  user: User;
}

export default function Topbar({ user }: Props) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          title="Sair"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sair
        </button>
      </div>
    </header>
  );
}
