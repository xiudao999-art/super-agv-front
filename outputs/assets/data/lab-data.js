import { requestJson } from '../core/http-client.js';

export const labRequest = (path, options) => requestJson(path, options);

export async function uploadLabMap(file, options = {}) {
  const body = new FormData();
  body.append('file', file, file.name);
  return requestJson('/api/files/images', { ...options, method: 'POST', body, headers: { Accept: 'application/json' } });
}
