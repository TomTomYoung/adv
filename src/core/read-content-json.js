const temporaryStatuses = new Set([408, 429, 500, 502, 503, 504]);
const retryDelays = [350, 1000];

function retryAfter(response) {
  const header = response?.headers.get('Retry-After');
  if (!header) return 0;
  if (/^\d+$/.test(header)) return Number(header) * 1000;
  return Math.max(0, Date.parse(header) - Date.now()) || 0;
}

export async function readContentJson(file, url = new URL('../../' + file, import.meta.url), integrity) {
  const options = {cache: 'no-store'};
  if (integrity) options.integrity = integrity;
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (attempt >= retryDelays.length || !(error instanceof TypeError)) {
        if (integrity) throw Error('更新データが揃っていません。記録を保ったまま再読み込みしてください: ' + file, {cause: error});
        throw Error('読込失敗: ' + file + ' (' + error.message + ')', {cause: error});
      }
    }
    if (response?.ok) return response.json();
    const wait = retryAfter(response);
    if (response) {
      await response.body?.cancel();
      if (!temporaryStatuses.has(response.status) || attempt >= retryDelays.length || wait > 10000) {
        throw Error('読込失敗: ' + file + ' (' + response.status + ')');
      }
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(wait, retryDelays[attempt])));
  }
}
