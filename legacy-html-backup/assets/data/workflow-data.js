import { requestJson } from '../core/http-client.js';

export function getFlowPage(params, options = {}) {
  const query = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return requestJson(`/api/flow-templates/flows/page?${query}`, options);
}
export const getWorkflowTemplates = options => requestJson('/api/workflow-templates', options);
export const createFlow = (payload, options = {}) => requestJson('/api/flow-templates/create', { ...options, method: 'POST', body: JSON.stringify(payload) });
