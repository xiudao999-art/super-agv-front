import { apiUrl, requestJson } from '../core/http-client.js';

export const getLaboratory = options => requestJson('/api/lab', options);
export const getLaboratoryConfig = (configId, options) => requestJson(`/api/lab-configs/${encodeURIComponent(configId)}`, options);
export const getDashboardOverview = options => requestJson('/api/home-test/overview', options);
export const dashboardOverviewEndpoint = baseUrl => apiUrl('/api/home-test/overview', baseUrl);
export const resolveDashboardAssetUrl = (path, baseUrl) => apiUrl(path, baseUrl);
