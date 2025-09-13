'use client';

import { useAccount } from 'wagmi';
import EditProfileBox from './EditProfileBox';

export default function OwnerEditor({
  creatorId,
  creatorAddress,
  currentAvatar,
  currentBio,
}: {
  creatorId: string;
  creatorAddress: `0x${string}` | string | null;
  currentAvatar?: string | null;
  currentBio?: string | null;
}) {
  const { address } = useAccount();
  const isOwner =
    !!creatorAddress &&
    !!address &&
    creatorAddress.toLowerCase() === address.toLowerCase();

  if (!isOwner) return null;

  return (
    <div className="mt-6">
      <EditProfileBox
        creatorId={creatorId}
        currentAvatar={currentAvatar}
        currentBio={currentBio}
        onSaved={() => {
          // EditProfileBox already calls router.refresh()
          // Nothing else needed here.
        }}
      />
    </div>
  );
}
