/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployed API base URL, e.g. https://api.example.com/api/v1 (unset in dev). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
