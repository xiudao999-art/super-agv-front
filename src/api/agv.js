import http from '../services/http'
import { collection, createRecord, removeRecord, updateRecord } from '../stores/appStore'

// The historical project already has a working backend. Mock data is opt-in so
// a normal development start always exercises the real interfaces.
export const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true'

const resources = {
  orders: { list: '/api/orders', create: '/api/orders' },
  locations: { list: '/locations', create: '/locations' },
  carriers: { list: '/carriers', create: '/carriers' },
  storageTypes: { list: '/locationTypes', create: '/locationTypes' },
  carrierTypes: { list: '/carrierTypes', create: '/carrierTypes' },
  processes: { list: '/api/flow-templates/flows/page', create: '/api/flow-templates/create' },
  workflows: { list: '/api/workflow-templates/page', create: '/api/workflow-templates' },
}

const clone = (value) => JSON.parse(JSON.stringify(value))
const unwrap = (response) => {
  const body = response?.data ?? response
  if (typeof body?.code === 'number' && ![0, 200, 201].includes(body.code)) {
    throw new Error(body.message || `接口业务错误 ${body.code}`)
  }
  return body?.data ?? body
}
const asRows = (payload) => Array.isArray(payload) ? payload : payload?.records || []
const formatDateTime = (value) => value ? String(value).replace('T', ' ').slice(0, 19) : '-'

const occupancyLabels = { 0: '空闲', 1: '占用', FREE: '空闲', OCCUPIED: '占用' }
const carrierStatusLabels = { IDLE: '空闲', STORED: '在库', IN_USE: '使用中', MAINTENANCE: '维护' }
const publishStatusLabels = { DRAFT: '草稿', PUBLISHED: '已发布', ACTIVE: '已启用', ENABLED: '已启用', DISABLED: '已停用' }

function normalizeRows(name, rows, context = {}) {
  if (name === 'orders') {
    return rows.map((row) => ({ ...row, issuedAt: formatDateTime(row.issuedAt), updatedAt: formatDateTime(row.updatedAt) }))
  }

  if (name === 'locations') {
    const typeMap = new Map((context.locationTypes || []).map((item) => [String(item.id), item.typeName]))
    return rows.map((row) => ({
      ...row,
      typeName: row.typeName || typeMap.get(String(row.locationType)) || row.locationType || '-',
      coordinate: [row.mapX, row.mapY, row.mapYaw].every((item) => item == null)
        ? '-'
        : `${row.mapX ?? '-'} / ${row.mapY ?? '-'} / ${row.mapYaw ?? '-'}°`,
      occupancyLabel: occupancyLabels[row.occupancyStatus] || row.occupancyStatus || '未知',
      currentCarrierCode: row.currentCarrierCode || '-',
      lastCheckTime: row.lastCheckTime || row.updateTime || '-',
    }))
  }

  if (name === 'carriers') {
    const typeMap = new Map((context.carrierTypes || []).map((item) => [String(item.id), item.typeName]))
    const locationMap = new Map((context.locations || []).map((item) => [String(item.id), item.locationName]))
    return rows.map((row) => ({
      ...row,
      typeName: row.typeName || typeMap.get(String(row.carrierTypeId)) || '-',
      locationName: row.locationName || locationMap.get(String(row.currentLocationId)) || '-',
      statusLabel: carrierStatusLabels[row.carrierStatus] || row.carrierStatus || row.status || '未知',
      relatedOrderCode: row.relatedOrderCode || '-',
    }))
  }

  if (name === 'storageTypes') {
    return rows.map((row) => ({
      ...row,
      compatible: row.compatibleCarrierTypes || row.compatible || '-',
      statusLabel: publishStatusLabels[row.status] || (Number(row.status) === 1 ? '已启用' : '已停用'),
    }))
  }

  if (name === 'carrierTypes') {
    return rows.map((row) => ({
      ...row,
      compatible: row.compatible || '-',
      statusLabel: publishStatusLabels[row.status] || row.status || '未知',
    }))
  }

  if (name === 'processes') {
    return rows.map((row) => ({
      ...row,
      number: row.flowNumber,
      name: row.flowName,
      template: row.templateName,
      trigger: row.trigger || '-',
      steps: row.templateNodeCount ?? '-',
      version: row.version || '-',
      statusLabel: publishStatusLabels[row.status] || row.status || '已配置',
      updatedAt: formatDateTime(row.updatedAt),
    }))
  }

  if (name === 'workflows') {
    return rows.map((row) => ({
      ...row,
      sequence: row.actionSequenceText || (Array.isArray(row.actionSequence) ? row.actionSequence.join(' → ') : row.sequence || '-'),
      statusLabel: row.statusDescription || publishStatusLabels[row.status] || row.status,
      updatedAt: formatDateTime(row.updatedAt),
    }))
  }

  return rows
}

export async function listResource(name, params = {}) {
  if (useMockApi || !resources[name]) return normalizeRows(name, clone(collection(name)))

  const requestParams = ['orders', 'processes', 'workflows'].includes(name)
    ? { pageNum: 1, pageSize: 200, ...params }
    : params

  if (name === 'locations') {
    const [locations, locationTypes] = await Promise.all([
      http.get(resources.locations.list, { params: requestParams }),
      http.get(resources.storageTypes.list),
    ])
    return normalizeRows(name, asRows(unwrap(locations)), { locationTypes: asRows(unwrap(locationTypes)) })
  }

  if (name === 'carriers') {
    const [carriers, carrierTypes, locations] = await Promise.all([
      http.get(resources.carriers.list, { params: requestParams }),
      http.get(resources.carrierTypes.list),
      http.get(resources.locations.list),
    ])
    return normalizeRows(name, asRows(unwrap(carriers)), {
      carrierTypes: asRows(unwrap(carrierTypes)),
      locations: asRows(unwrap(locations)),
    })
  }

  const payload = unwrap(await http.get(resources[name].list, { params: requestParams }))
  return normalizeRows(name, asRows(payload))
}

export async function createResource(name, payload) {
  if (useMockApi || !resources[name]) return createRecord(name, payload)
  return unwrap(await http.post(resources[name].create, payload))
}

export async function getResource(name, id) {
  if (useMockApi || !resources[name]) return clone(collection(name).find((row) => String(row.id) === String(id)))
  return unwrap(await http.get(`${resources[name].list}/${encodeURIComponent(id)}`))
}

export async function updateResource(name, id, payload) {
  if (useMockApi || !resources[name]) return updateRecord(name, id, payload)
  const endpoint = name === 'workflows' ? resources[name].create : `${resources[name].create}/${encodeURIComponent(id)}`
  const method = name === 'workflows' ? 'post' : 'put'
  return unwrap(await http[method](endpoint, payload))
}

export async function deleteResource(name, id) {
  if (useMockApi || !resources[name]) return removeRecord(name, id)
  return unwrap(await http.delete(`${resources[name].create}/${encodeURIComponent(id)}`))
}

export async function getDashboardOverview() {
  if (useMockApi) return null
  return unwrap(await http.get('/api/home-test/overview'))
}

export async function getOrderDetail(id) {
  if (useMockApi) return null
  return unwrap(await http.get('/api/detail', { params: { id } }))
}

export async function syncOrders() {
  if (useMockApi) return { receivedCount: 3, createdCount: 1, updatedCount: 2 }
  return unwrap(await http.post('/api/orders/sync'))
}

export async function getWorkflow(id) {
  if (useMockApi) return clone(collection('workflows').find((row) => String(row.id) === String(id)))
  return unwrap(await http.get(`/api/workflow-templates/${encodeURIComponent(id)}`))
}

export async function getActions() {
  if (useMockApi) return []
  return unwrap(await http.get('/api/actions'))
}

export async function saveWorkflow(payload) {
  if (useMockApi) {
    return payload.id ? updateRecord('workflows', payload.id, payload) : createRecord('workflows', payload)
  }
  const endpoint = payload.id ? '/api/workflow-templates/update' : '/api/workflow-templates'
  return unwrap(await http.post(endpoint, payload))
}

export async function deployWorkflow(id) {
  if (useMockApi) return updateRecord('workflows', id, { status: 'ACTIVE', statusLabel: '已启用' })
  return unwrap(await http.post('/api/workflow-templates/deploy', null, { params: { id } }))
}

export async function getLaboratory() {
  if (useMockApi) return null
  return unwrap(await http.get('/api/lab'))
}

export async function getLabConfig(id) {
  if (useMockApi) return null
  return unwrap(await http.get(`/api/lab-configs/${encodeURIComponent(id)}`))
}

export async function saveLabEntity(configId, collectionName, id, payload) {
  const base = `/api/lab-configs/${encodeURIComponent(configId)}/${collectionName}`
  return unwrap(id == null ? await http.post(base, payload) : await http.put(`${base}/${encodeURIComponent(id)}`, payload))
}

export async function deleteLabEntity(configId, collectionName, id) {
  return unwrap(await http.delete(`/api/lab-configs/${encodeURIComponent(configId)}/${collectionName}/${encodeURIComponent(id)}`))
}

export async function createLabDraft() {
  return unwrap(await http.post('/api/lab/drafts'))
}

export async function validateLabConfig(id) {
  return unwrap(await http.post(`/api/lab-configs/${encodeURIComponent(id)}/validate`))
}

export async function publishLabConfig(id) {
  return unwrap(await http.post(`/api/lab-configs/${encodeURIComponent(id)}/publish`))
}

export async function updateLabMap(id, payload) {
  return unwrap(await http.put(`/api/lab-configs/${encodeURIComponent(id)}/map`, payload))
}

export async function uploadLabMap(file) {
  const body = new FormData()
  body.append('file', file)
  return unwrap(await http.post('/api/files/images', body, { headers: { 'Content-Type': 'multipart/form-data' } }))
}

export async function listRobots(params = {}) {
  if (useMockApi) {
    const records = clone(collection('robotPool') || [])
    return { records, total: records.length, current: 1, size: records.length }
  }
  return unwrap(await http.get('/api/robot-info', { params: { pageNum: 1, pageSize: 200, ...params } }))
}

export async function getRobotInfo(id) {
  if (useMockApi) return clone(collection('robotPool').find((row) => String(row.id) === String(id)))
  return unwrap(await http.get(`/api/robot-info/${encodeURIComponent(id)}`))
}

export async function saveRobotInfo(payload) {
  if (useMockApi) return payload.id ? updateRecord('robotPool', payload.id, payload) : createRecord('robotPool', payload)
  return unwrap(await http.post('/api/robot-info', payload))
}

export async function deleteRobotInfo(id) {
  if (useMockApi) return removeRecord('robotPool', id)
  return unwrap(await http.delete(`/api/robot-info/${encodeURIComponent(id)}`))
}

export async function listExceptionHandlingRules(params = {}) {
  return unwrap(await http.get('/api/exception-handling-rules', {
    params: { pageNum: 1, pageSize: 200, ...params },
  }))
}

export async function getExceptionHandlingRule(id) {
  return unwrap(await http.get(`/api/exception-handling-rules/${encodeURIComponent(id)}`))
}

export async function changeExceptionHandlingRuleStatus(id, status) {
  return unwrap(await http.put(`/api/exception-handling-rules/${encodeURIComponent(id)}/status`, { status }))
}

export async function saveExceptionHandlingRule(payload) {
  const { id, ...body } = payload
  return unwrap(id == null
    ? await http.post('/api/exception-handling-rules', body)
    : await http.put(`/api/exception-handling-rules/${encodeURIComponent(id)}`, body))
}

export async function deleteExceptionHandlingRule(id) {
  return unwrap(await http.delete(`/api/exception-handling-rules/${encodeURIComponent(id)}`))
}

export async function updateFlow(id, payload) {
  return unwrap(await http.put(`/api/flow-templates/flows/${encodeURIComponent(id)}`, payload))
}

export async function getFlow(id) {
  return unwrap(await http.get(`/api/flow-templates/flows/${encodeURIComponent(id)}`))
}
