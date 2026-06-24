/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JELLYFIN_SERVER_URL?: string;
  readonly VITE_JELLYFIN_API_KEY?: string;
  readonly VITE_JELLYFIN_USER_ID?: string;
  readonly VITE_NAVIDROME_SERVER_URL?: string;
  readonly VITE_HOME_ASSISTANT_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
