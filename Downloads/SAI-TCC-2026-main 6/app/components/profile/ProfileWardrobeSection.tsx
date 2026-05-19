'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SectionBlock from '@/app/components/shared/SectionBlock';
import WardrobeCompactCard from '@/app/components/profile/WardrobeCompactCard';

type WardrobeViewItem = {
  wardrobe_item_id: string;
  name: string;
  image_url: string;
  brand: string;
  piece_type: string;
  gender?: string;
};

interface ProfileWardrobeSectionProps {
  items: WardrobeViewItem[];
  onItemDeleted?: (id: string) => void;
}

// Maps a garment type to the Dress Tester query param for slot/mannequin selection
function resolveTesterSlot(pieceType: string): string {
  const normalized = pieceType.trim().toLowerCase();
  if (['shirt', 'top', 'blouse', 'sweater', 'hoodie', 'jacket', 'coat', 'blazer'].some((t) => normalized.includes(t))) return 'upper';
  if (['pants', 'shorts', 'skirt', 'trouser', 'jeans', 'bottom'].some((t) => normalized.includes(t))) return 'lower';
  if (['shoes', 'boot', 'sneaker', 'footwear', 'heel', 'loafer'].some((t) => normalized.includes(t))) return 'shoes';
  if (['dress'].some((t) => normalized.includes(t))) return 'dress';
  return 'accessory';
}

function resolveTesterGender(gender?: string): 'male' | 'female' {
  if (!gender) return 'female';
  const norm = gender.trim().toLowerCase();
  if (norm === 'male' || norm === 'masculino' || norm === 'm') return 'male';
  return 'female';
}

export default function ProfileWardrobeSection({ items: initialItems, onItemDeleted }: ProfileWardrobeSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<WardrobeViewItem[]>(initialItems);
  const [detailItem, setDetailItem] = useState<WardrobeViewItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WardrobeViewItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUseInTester = (item: WardrobeViewItem) => {
    const gender = resolveTesterGender(item.gender);
    const slot = resolveTesterSlot(item.piece_type);
    router.push(`/dress-tester?wardrobeItemId=${item.wardrobe_item_id}&slot=${slot}&gender=${gender}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/wardrobe/${deleteItem.wardrobe_item_id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Falha ao excluir a peça.');
      const removed = deleteItem.wardrobe_item_id;
      setItems((prev) => prev.filter((item) => item.wardrobe_item_id !== removed));
      onItemDeleted?.(removed);
      setDeleteItem(null);
    } catch {
      setDeleteError('Não foi possível excluir a peça. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionBlock title="Meu Guarda-roupa" subtitle="Visualize e gerencie suas peças com cards premium compactos.">
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <WardrobeCompactCard
              key={item.wardrobe_item_id}
              imageUrl={item.image_url}
              name={item.name}
              brand={item.brand}
              pieceType={item.piece_type}
              gender={item.gender}
              rarity="Premium"
              wearstyles={['Street', 'Essential']}
              onViewDetails={() => setDetailItem(item)}
              onEdit={() => setDetailItem(item)}
              onUseInTester={() => handleUseInTester(item)}
              onDelete={() => {
                setDeleteError(null);
                setDeleteItem(item);
              }}
            />
          ))}
          {!items.length ? <p className="text-sm text-white/80">Nenhuma peça encontrada ainda.</p> : null}
        </div>
      </SectionBlock>

      {/* View Details Modal */}
      {detailItem ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/25 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">{detailItem.name}</h3>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg border border-white/30 px-2.5 py-1 text-xs text-white hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              <Image
                src={detailItem.image_url || '/welcome-newcomers.png'}
                alt={detailItem.name}
                width={480}
                height={480}
                className="h-64 w-full object-contain"
                unoptimized
              />
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/80">
              <p><span className="font-medium text-white">Marca:</span> {detailItem.brand}</p>
              <p><span className="font-medium text-white">Tipo de peça:</span> {detailItem.piece_type}</p>
              {detailItem.gender ? (
                <p><span className="font-medium text-white">Gênero:</span> {detailItem.gender}</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setDetailItem(null); handleUseInTester(detailItem); }}
                className="flex-1 rounded-xl border border-cyan-300/50 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Usar no Provador 2D
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteItem ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => { if (!isDeleting) setDeleteItem(null); }}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/25 bg-slate-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Excluir peça</h3>
            <p className="mt-2 text-sm text-white/70">
              Tem certeza que deseja excluir <strong className="text-white">{deleteItem.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            {deleteError ? (
              <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{deleteError}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-white/30 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-rose-300/50 bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
