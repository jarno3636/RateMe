// hooks/useUsdcApproval.ts
import { useUSDCAllowance, useUSDCApprove } from "./useUsdc";

// Re-export with the names used by components like CreateProfileCTA
export const useUsdcAllowance = useUSDCAllowance;
export const useApproveUsdc = useUSDCApprove;
