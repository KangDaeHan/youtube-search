type YTErrorBody = {
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

type FetchOpts = {
  signal?: AbortSignal;
  // UI에서 조절하는 값(분) — 없으면 즉시 재시도 X
  cooldownMinutes?: number;
};

const API = 'https://www.googleapis.com/youtube/v3';

function getCooldownUntil() {
  const t = localStorage.getItem('yt_quota_cooldown_until');
  return t ? new Date(t).getTime() : 0;
}
function setCooldown(minutes: number) {
  const until = new Date(Date.now() + minutes * 60_000);
  localStorage.setItem('yt_quota_cooldown_until', until.toISOString());
}
export function clearCooldown() {
  localStorage.removeItem('yt_quota_cooldown_until');
}

export function ensureKey(getKey: () => string | undefined) {
  const key = getKey();
  if (!key) throw new Error('YouTube API 키가 설정되지 않았습니다.');
  return key;
}

export async function fetchJSON(
  url: string,
  { signal, cooldownMinutes }: FetchOpts = {}
) {
  // 쿼터 대기 시간 체크
  const now = Date.now();
  const until = getCooldownUntil();
  if (until && now < until) {
    const waitMin = Math.ceil((until - now) / 60_000);
    const e = new Error(`API 키 쿼터 대기 중입니다. ${waitMin}분 후 다시 시도하세요.`);
    // @ts-expect-error custom flag
    e.code = 'COOLDOWN';
    throw e;
  }

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    throw new Error(`네트워크 오류: ${(err as Error).message}`);
  }

  // 정상
  if (res.ok) {
    try {
      return await res.json();
    } catch {
      throw new Error('JSON 파싱 실패');
    }
  }

  // 비정상 — 본문 분석
  let body: YTErrorBody | undefined;
  try {
    body = (await res.json()) as YTErrorBody;
  } catch {
    // 본문이 비어있을 수 있음
  }

  const status = res.status;
  const reason =
    body?.error?.errors?.[0]?.reason ||
    (status === 403 ? 'forbidden' : undefined);

  // 쿼터/제한 계열
  const quotaReasons = new Set([
    'quotaExceeded',
    'dailyLimitExceeded',
    'rateLimitExceeded',
    'forbidden', // 종종 403 + forbidden 만 오는 경우
  ]);

  if (status === 403 && quotaReasons.has(reason || '')) {
    if (cooldownMinutes && cooldownMinutes > 0) {
      setCooldown(cooldownMinutes);
    }
    throw new Error(
      `요청이 거부되었습니다(403: ${reason ?? 'quota/limit'}). 잠시 후 다시 시도하세요.`
    );
  }

  // 키 오류/권한
  if (status === 400 || status === 401) {
    throw new Error(
      `인증/요청 오류(${status}). 메시지: ${body?.error?.message ?? '확인 필요'}`
    );
  }

  throw new Error(
    `요청 실패(${status}). 메시지: ${body?.error?.message ?? '확인 필요'}`
  );
}

export function q(params: Record<string, string | number | boolean | undefined>) {
  const ps = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    ps.set(k, String(v));
  });
  return ps.toString();
}

export function buildURL(
  path: string,
  params: Record<string, string | number | boolean | undefined>
) {
  const hasQuery = path.includes('?');
  const query = q(params);
  return `${API}${path}${hasQuery ? '&' : '?'}${query}`;
}
