import { apiUrl, requestJson } from '../core/http-client.js';

export function getOrders(params, options = {}) {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return requestJson(`/api/orders?${query}`, options);
}

export function getFlows(params, options = {}) {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return requestJson(`/api/flow-templates/flows/page?${query}`, options);
}

export const ordersEndpoint = baseUrl => apiUrl('/api/orders', baseUrl);
export const ordersSyncEndpoint = baseUrl => apiUrl('/api/orders/sync', baseUrl);
export const orderCreateEndpoint = baseUrl => apiUrl('/api/orders', baseUrl);
export const orderDetailEndpoint = baseUrl => apiUrl('/api/detail', baseUrl);
export const syncOrders = options => requestJson('/api/orders/sync', { ...options, method: 'POST' });
export const createOrder = (payload, options = {}) => requestJson('/api/orders', { ...options, method: 'POST', body: JSON.stringify(payload) });
export const getOrderDetail = (id, options = {}) => requestJson('/api/detail?' + new URLSearchParams({ id: String(id) }), options);
