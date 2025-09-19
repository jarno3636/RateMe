// /components/ClientProviders.tsx
"use client";

/**
 * Thin client-only wrapper that re-exports the app-level Providers.
 * This avoids the unused `sonner` dependency and prevents double-mounting toasters.
 */
import Providers from "@/app/providers";

export default Providers;
