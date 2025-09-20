// src/api/checkApiKey.ts
export async function checkApiKeyValid(apiKey: string): Promise<boolean> {
  // Google Developers 채널 ID(공개용)로 테스트
  const testChannelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&id=${testChannelId}&key=${apiKey}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[checkApiKeyValid] HTTP Error', res.status, res.statusText)
      return false
    }
    const data = await res.json()
    if (data.error) {
      console.error('[checkApiKeyValid] API Error', data.error)
      return false
    }
    return true
  } catch (e) {
    console.error('[checkApiKeyValid] Exception', e)
    return false
  }
}
