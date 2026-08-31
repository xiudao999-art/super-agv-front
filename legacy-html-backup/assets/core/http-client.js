export function apiUrl(path, baseUrl = window.AGVS_API_BASE_URL || '') {
  const base = String(baseUrl || '').replace(/\/$/, '');
  return base + path;
}

export async function requestJson(path, options = {}) {
  const { baseUrl, timeout = 12000, signal, headers, ...requestOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('请求超时', 'TimeoutError')), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  try {
    const hasJsonBody = requestOptions.body && !(requestOptions.body instanceof FormData);
    const response = await fetch(apiUrl(path, baseUrl), {
      ...requestOptions,
      headers: { Accept: 'application/json', ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}), ...headers },
      signal: controller.signal
    });
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json') ? await response.json() : { message: await response.text() };
    if (!response.ok || (typeof result?.code === 'number' && ![0, 200, 201].includes(result.code))) {
      throw new Error(result?.message || `HTTP ${response.status}`);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}
