// 로컬/프로덕션 모두에서 안전하게 읽기
export const isDev = import.meta.env.DEV;

export function readEnvKey(): string | undefined {
  // .env.local 의 VITE_YT_API_KEY (선택)
  const fromEnv = import.meta.env.VITE_YT_API_KEY as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  // localStorage (UI에서 입력 저장)
  const fromLS = localStorage.getItem('yt_api_key') ?? '';
  return fromLS.trim() || undefined;
}

export function writeEnvKey(k: string) {
  localStorage.setItem('yt_api_key', (k ?? '').trim());
}
