// /types/linkUnlock.ts
export type LinkUnlockV1 = {
  kind: "onlystars.linkUnlock@v1";
  url: string;           // external URL being sold
  description?: string;  // short blurb
  coverUrl?: string;     // optional cover image
};
