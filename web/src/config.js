// App configuration. Override any of these by copying .env.example to
// .env.local and changing the values there (Vite loads it automatically).
// Defaults below match the root project's config.json.

export const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const DISTRO_API = import.meta.env.VITE_DISTRO_API || 'https://api.folding.cash/';

// Kept in sync with the CLI's Dust constant (index.js).
export const DUST = 1000n;

// Passed to GetDistro as includeFoldingUserTypes, matching the CLI.
export const INCLUDE_FOLDING_USER_TYPES = 8;

// The default reference amount used for the report workflow, where the
// actual token amount doesn't matter because nothing is sent on-chain.
export const DEFAULT_REPORT_AMOUNT = 100;
