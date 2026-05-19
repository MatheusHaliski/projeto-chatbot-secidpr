import { getAdminFirestore } from '@/app/lib/firebaseAdmin';
import { MannequinProfile } from '@/app/lib/fashion-ai/types/mannequin';

const COLLECTION = 'fai_mannequin_profiles';

const NOW = () => new Date().toISOString();

export const DEFAULT_MANNEQUIN_PROFILES: MannequinProfile[] = [
  {
    id: 'male_v1',
    label: 'Male mannequin v1',
    baseImageUrl: '/tester2d/mannequins/male-default.png',
    canvasWidth: 1200,
    canvasHeight: 2000,
    slots: {
      top: { bbox: { x: 344, y: 438, w: 512, h: 570 }, anchors: { neckCenter: { x: 600, y: 496 }, shoulderLeft: { x: 420, y: 540 }, shoulderRight: { x: 780, y: 540 }, waistLeft: { x: 470, y: 900 }, waistRight: { x: 730, y: 900 } } },
      bottom: { bbox: { x: 364, y: 980, w: 470, h: 700 }, anchors: { waistLeft: { x: 472, y: 996 }, waistRight: { x: 728, y: 996 } } },
      shoes: { bbox: { x: 408, y: 1682, w: 388, h: 188 } },
      full_body: { bbox: { x: 332, y: 430, w: 540, h: 1250 } },
      accessory: { bbox: { x: 278, y: 340, w: 646, h: 1190 } },
    },
    updatedAt: NOW(),
  },
  {
    id: 'female_v1',
    label: 'Female mannequin v1',
    baseImageUrl: '/tester2d/mannequins/female-default.png',
    canvasWidth: 1200,
    canvasHeight: 2000,
    slots: {
      top: { bbox: { x: 352, y: 438, w: 488, h: 556 }, anchors: { neckCenter: { x: 600, y: 494 }, shoulderLeft: { x: 430, y: 536 }, shoulderRight: { x: 770, y: 536 }, waistLeft: { x: 484, y: 894 }, waistRight: { x: 716, y: 894 } } },
      bottom: { bbox: { x: 372, y: 972, w: 450, h: 714 }, anchors: { waistLeft: { x: 488, y: 988 }, waistRight: { x: 712, y: 988 } } },
      shoes: { bbox: { x: 414, y: 1686, w: 376, h: 188 } },
      full_body: { bbox: { x: 336, y: 430, w: 528, h: 1256 } },
      accessory: { bbox: { x: 288, y: 336, w: 620, h: 1186 } },
    },
    updatedAt: NOW(),
  },
];

export class MannequinRepository {
  async getById(id: 'male_v1' | 'female_v1'): Promise<MannequinProfile | null> {
    const snap = await getAdminFirestore().collection(COLLECTION).doc(id).get();
    if (!snap.exists) return DEFAULT_MANNEQUIN_PROFILES.find((item) => item.id === id) ?? null;
    return snap.data() as MannequinProfile;
  }

  async list(): Promise<MannequinProfile[]> {
    const snap = await getAdminFirestore().collection(COLLECTION).get();
    if (snap.empty) return DEFAULT_MANNEQUIN_PROFILES;
    return snap.docs.map((doc) => doc.data() as MannequinProfile);
  }

  async seedDefaults(opts: { force?: boolean } = {}): Promise<void> {
    const db = getAdminFirestore();
    const batch = db.batch();
    DEFAULT_MANNEQUIN_PROFILES.forEach((profile) => {
      const ref = db.collection(COLLECTION).doc(profile.id);
      // force=true overwrites ALL fields (use when slot/anchor coordinates were corrected).
      // force=false (default) merges so manual calibrations in Firestore are preserved.
      batch.set(ref, { ...profile, updatedAt: new Date().toISOString() }, { merge: !opts.force });
    });
    await batch.commit();
  }
}
