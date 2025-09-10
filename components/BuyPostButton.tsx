// components/BuyPostButton.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { BASE_CHAIN_ID } from '@/lib/registry';
import { useCreatorHub } from '@/hooks/useCreatorHub';

type Props = {
  postId: bigint;
  className?: string;
  onPurchased?: () => void;
  disabled?: boolean;
  label?: string; // override button label (default: "Buy Post")
};

export default function BuyPostButton({
  postId,
  className,
  onPurchased,
  disabled,
  label,
}: Props) {
  const { buyPost } = useCreatorHub();
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  const [busy, setBusy] = useState(false);

  const needsNetworkSwitch = useMemo(
    () => isConnected && chainId !== BASE_CHAIN_ID,
    [isConnected, chainId]
  );

  const handleClick = useCallback(async () => {
    try {
      // 1) Connect wallet if needed
      if (!isConnected) {
        openConnectModal?.();
        return;
      }

      // 2) Ensure Base network
      if (needsNetworkSwitch) {
        await switchChainAsync?.({ chainId: BASE_CHAIN_ID });
      }

      // 3) Execute purchase (hook handles ETH/USDC & approvals)
      setBusy(true);
      await buyPost(postId);

      toast.success('Post unlocked');
      onPurchased?.();
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        (typeof e === 'string' ? e : 'Failed to purchase');
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [
    isConnected,
    openConnectModal,
    needsNetworkSwitch,
    switchChainAsync,
    buyPost,
    postId,
    onPurchased,
  ]);

  const btnLabel = useMemo(() => {
    if (!isConnected) return 'Connect wallet';
    if (needsNetworkSwitch) return 'Switch to Base';
    return busy ? 'Purchasing…' : label || 'Buy Post';
  }, [isConnected, needsNetworkSwitch, busy, label]);

  const isDisabled =
    disabled || busy || (isConnected && needsNetworkSwitch && busy);

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={busy}
      className={`btn disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ''}`}
      title={!address ? 'Connect wallet' : needsNetworkSwitch ? 'Switch to Base' : 'Buy this post'}
    >
      {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />}
      {btnLabel}
    </button>
  );
}
