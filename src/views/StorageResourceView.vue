<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { createResource, deleteResource, getResource, listResource, updateResource } from '../api/agv'

const props = defineProps({ resourceKey: { type: String, required: true } })
const rows = ref([])
const locationTypes = ref([])
const carrierTypes = ref([])
const locations = ref([])
const loading = ref(false)
const query = ref('')
const secondaryFilter = ref('')
const selectedId = ref(null)
const selected = ref(null)
const modal = ref('')
const editingId = ref(null)
const saving = ref(false)
const deletingId = ref(null)
const toastMessage = ref('')
const form = reactive({})
let toastTimer

const tabs = [
  { key: 'locations', label: '库位', path: '/dispatch/storage' },
  { key: 'carriers', label: '载具', path: '/dispatch/carriers' },
  { key: 'storageTypes', label: '库位类型', path: '/dispatch/storage-types' },
  { key: 'carrierTypes', label: '载具类型', path: '/dispatch/carrier-types' },
]

const pageInfo = computed(() => ({
  locations: { heading: '库位列表', add: '新增库位' },
  carriers: { heading: '载具记录', add: '新增载具' },
  storageTypes: { heading: '库位类型', add: '新增库位类型' },
  carrierTypes: { heading: '载具类型列表', add: '新增载具类型' },
}[props.resourceKey]))

const filteredRows = computed(() => {
  const word = query.value.trim().toLowerCase()
  return rows.value.filter((item) => {
    const text = Object.values(item).join(' ').toLowerCase()
    if (word && !text.includes(word)) return false
    if (!secondaryFilter.value) return true
    if (props.resourceKey === 'locations') return String(item.locationType) === String(secondaryFilter.value)
    if (props.resourceKey === 'carriers') return item.carrierStatus === secondaryFilter.value
    if (props.resourceKey === 'carrierTypes') return item.status === secondaryFilter.value
    return true
  })
})

const carrierStatusMeta = {
  IDLE: ['空闲', 'status-executing'], STORED: ['在库', 'status-completed'], PENDING: ['待处理', 'status-waiting'],
  TRANSPORTING: ['运输中', 'status-executing'], PROCESSING: ['机台处理中', 'status-executing'], IN_USE: ['使用中', 'status-executing'],
  LOCKED: ['锁定', 'status-waiting'], ABNORMAL: ['异常', 'status-failed'],
}
const carrierFilterKeys = ['IDLE', 'STORED', 'PENDING', 'TRANSPORTING', 'PROCESSING', 'ABNORMAL']
const typeStatusMeta = { DRAFT: ['草稿', 'status-waiting'], PUBLISHED: ['已发布', 'state-published'], DISABLED: ['已停用', 'state-disabled'] }

function showToast(message) {
  toastMessage.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2300)
}

function typeName(value) {
  const item = locationTypes.value.find((row) => String(row.id) === String(value) || row.typeCode === value || row.typeName === value)
  return item ? `${item.typeName || item.typeCode} · ${item.typeCode || '-'}` : value ? `类型 #${value}` : '-'
}

function carrierTypeName(value) {
  const item = carrierTypes.value.find((row) => String(row.id) === String(value))
  return item ? `${item.typeName || item.typeCode} · ${item.typeCode || '-'}` : value ? `类型 #${value}` : '-'
}

function locationName(value) {
  const item = locations.value.find((row) => String(row.id) === String(value))
  return item ? `${item.locationName || item.locationCode} · ${item.locationCode || '-'}` : value ? `库位 #${value}` : '-'
}

function coordinateText(item) {
  if (item.mapX == null || item.mapY == null) return item.coordinateType || item.coordinate || '-'
  return `X ${Number(item.mapX)} m / Y ${Number(item.mapY)} m / θ ${Number(item.mapYaw || 0)}°`
}

function carrierStatus(value) { return carrierStatusMeta[value] || [value || '-', 'status-cancelled'] }
function carrierTypeStatus(value) { return typeStatusMeta[value] || [value || '-', 'state-disabled'] }
function displayTime(item) { return item.lastCheckTime || item.lastScanTime || item.updateTime || item.createTime || '-' }

async function load() {
  loading.value = true
  try {
    if (props.resourceKey === 'locations') {
      const [data, types] = await Promise.all([listResource('locations'), listResource('storageTypes')])
      rows.value = data
      locationTypes.value = types
    } else if (props.resourceKey === 'carriers') {
      const [data, types, positionOptions] = await Promise.all([listResource('carriers'), listResource('carrierTypes'), listResource('locations')])
      rows.value = data
      carrierTypes.value = types
      locations.value = positionOptions
    } else rows.value = await listResource(props.resourceKey)
    if (!rows.value.some((item) => String(item.id) === String(selectedId.value))) selectedId.value = rows.value[0]?.id ?? null
  } catch (error) {
    rows.value = []
    showToast(`${pageInfo.value.heading}加载失败：${error.message}`)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  query.value = ''
  secondaryFilter.value = ''
}

function clearForm() {
  Object.keys(form).forEach((key) => delete form[key])
  if (props.resourceKey === 'locations') Object.assign(form, { locationCode: '', locationName: '', locationType: '', ownerName: '', spaceName: '', mapName: '', coordinateType: '', navPointCode: '', operationPoint: '', mapX: '', mapY: '', mapYaw: '', compatibleCarrierType: '', statusSource: '', occupancyStatus: 0, currentCarrierCode: '', lastCheckTime: '', remark: '', enabled: 1 })
  if (props.resourceKey === 'carriers') Object.assign(form, { carrierCode: '', barcode: '', carrierTypeId: '', carrierStatus: 'IDLE', currentLocationId: '', relatedOrderCode: '', lastScanTime: '', remark: '', enabled: 1 })
  if (props.resourceKey === 'storageTypes') Object.assign(form, { typeCode: '', typeName: '', capacity: 1, compatibleCarrierTypes: '', statusSource: '', mutexRule: '', remark: '', status: 1 })
  if (props.resourceKey === 'carrierTypes') Object.assign(form, { typeCode: '', typeName: '', dimension: '', maxWeight: '', barcodeRule: '', status: 'DRAFT', remark: '' })
}

function openLayer(name) {
  modal.value = name
  document.body.style.overflow = 'hidden'
  nextTick(() => document.querySelector('.storage-resource-page .modal-overlay input:not(:disabled)')?.focus())
}

function closeLayer() {
  if (saving.value) return
  modal.value = ''
  document.body.style.overflow = ''
}

function openAdd() {
  editingId.value = null
  clearForm()
  openLayer('form')
}

async function openEdit(item) {
  try {
    const detail = await getResource(props.resourceKey, item.id)
    editingId.value = item.id
    clearForm()
    Object.assign(form, item, detail || {})
    if (props.resourceKey === 'locations') form.occupancyStatus = Number(form.occupancyStatus) === 1 ? 1 : 0
    openLayer('form')
  } catch (error) { showToast(`详情加载失败：${error.message}`) }
}

async function openDetail(item) {
  try {
    selected.value = { ...item, ...(await getResource(props.resourceKey, item.id) || {}) }
    openLayer('detail')
  } catch (error) { showToast(`详情加载失败：${error.message}`) }
}

async function openMap(item) {
  try {
    selected.value = { ...item, ...(await getResource('locations', item.id) || {}) }
    openLayer('map')
  } catch (error) { showToast(`地图位置加载失败：${error.message}`) }
}

function numeric(value) { return value === '' || value == null ? null : Number(value) }

function payload() {
  const result = { ...form }
  if (props.resourceKey === 'locations') {
    result.mapX = numeric(result.mapX); result.mapY = numeric(result.mapY); result.mapYaw = numeric(result.mapYaw); result.occupancyStatus = Number(result.occupancyStatus)
  }
  if (props.resourceKey === 'carriers') {
    result.carrierTypeId = result.carrierTypeId === '' ? null : Number(result.carrierTypeId)
    result.currentLocationId = result.currentLocationId === '' ? null : Number(result.currentLocationId)
  }
  if (props.resourceKey === 'storageTypes') result.capacity = numeric(result.capacity)
  if (props.resourceKey === 'carrierTypes') result.maxWeight = numeric(result.maxWeight)
  return result
}

async function save() {
  const data = payload()
  const codeKey = ['locations', 'carriers'].includes(props.resourceKey) ? (props.resourceKey === 'locations' ? 'locationCode' : 'carrierCode') : 'typeCode'
  const nameKey = props.resourceKey === 'locations' ? 'locationName' : ['storageTypes', 'carrierTypes'].includes(props.resourceKey) ? 'typeName' : null
  if (!String(data[codeKey] || '').trim()) return showToast(`请填写${props.resourceKey === 'locations' ? '库位' : props.resourceKey === 'carriers' ? '载具' : '类型'}编码`)
  if (nameKey && !String(data[nameKey] || '').trim()) return showToast(`请填写${props.resourceKey === 'locations' ? '库位名称' : '类型名称'}`)
  if (props.resourceKey === 'locations' && [data.mapX, data.mapY, data.mapYaw].some(Number.isNaN)) return showToast('地图坐标必须是有效数字')
  saving.value = true
  try {
    if (editingId.value == null) await createResource(props.resourceKey, data)
    else await updateResource(props.resourceKey, editingId.value, data)
    const label = { locations: '库位', carriers: '载具', storageTypes: '库位类型', carrierTypes: '载具类型' }[props.resourceKey]
    saving.value = false
    closeLayer()
    showToast(`${label}已${editingId.value == null ? '新增' : '更新'}`)
    await load()
  } catch (error) { showToast(`保存失败：${error.message}`) }
  finally { saving.value = false }
}

async function remove(item) {
  const label = { locations: item.locationName || item.locationCode, carriers: item.carrierCode, storageTypes: item.typeName || item.typeCode, carrierTypes: item.typeName || item.typeCode }[props.resourceKey]
  if (!window.confirm(`确认删除“${label}”吗？`)) return
  deletingId.value = item.id
  try {
    await deleteResource(props.resourceKey, item.id)
    showToast('删除成功')
    await load()
  } catch (error) { showToast(`删除失败：${error.message}`) }
  finally { deletingId.value = null }
}

const formTitle = computed(() => {
  if (editingId.value == null) return pageInfo.value.add
  const code = form.locationCode || form.carrierCode || form.typeCode || editingId.value
  return `编辑${{ locations: '库位', carriers: '载具', storageTypes: '库位类型', carrierTypes: '载具类型' }[props.resourceKey]} · ${code}`
})

const mapStyle = computed(() => {
  const x = Number(selected.value?.mapX), y = Number(selected.value?.mapY)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { display: 'none' }
  return { '--location-x': `${Math.min(97, Math.max(3, x / 50 * 100))}%`, '--location-y': `${Math.min(97, Math.max(3, 100 - y / 12 * 100))}%` }
})

function onKeydown(event) { if (event.key === 'Escape' && modal.value) closeLayer() }

watch(() => props.resourceKey, () => { resetFilters(); closeLayer(); load() })
onMounted(() => { document.addEventListener('keydown', onKeydown); load() })
onUnmounted(() => { document.removeEventListener('keydown', onKeydown); window.clearTimeout(toastTimer); document.body.style.overflow = '' })
</script>

<template>
  <div :class="['storage-resource-page', `${props.resourceKey}-page`]">
    <header class="page-head"><div><h1>库位与载具</h1><p>维护库位所属空间地图、到达坐标、操作点位、兼容载具与占用一致性</p></div></header>
    <div class="page-canvas"><section class="page-panel">
      <div class="tabs-row"><div class="tabs" role="tablist"><template v-for="(tab, index) in tabs" :key="tab.key"><i v-if="index && !(['locations', 'carriers'].includes(props.resourceKey) && index === 1)" class="tab-divider" /><router-link :class="['tab-btn', { active: props.resourceKey === tab.key }]" role="tab" :aria-selected="props.resourceKey === tab.key" :to="tab.path">{{ tab.label }}</router-link></template></div></div>
      <div class="content agv-list-page">
        <div v-if="props.resourceKey === 'locations'" class="rule-banner">定位规则：固定库位必须绑定所属空间地图、X/Y/朝向和AGV 到达导航点；真正取放时再使用库位地址或机台/机械臂操作点。AGV 缓存位是移动库位，其地图坐标跟随机器人实时位置。</div>
        <div v-if="props.resourceKey === 'carriers'" class="rule-banner">载具信息由后端统一维护；当前位置已通过库位接口解析为库位名称和编码。</div>
        <div class="list-head"><div class="list-heading"><h2>{{ pageInfo.heading }}</h2><p v-if="props.resourceKey === 'locations'">每行提供独立“地图位置”按钮，用于在实验室总览地图上标出该库位</p><p v-if="props.resourceKey === 'carriers'">载具位置由扫码、任务动作结果、PLC 和库位状态共同更新</p></div><div class="list-tools"><div v-if="props.resourceKey === 'locations'" class="legend" aria-label="库位状态图例"><span class="legend-chip status-tag state-empty">空闲</span><span class="legend-chip status-tag state-occupied">占用</span><span class="legend-chip status-tag state-conflict">冲突</span></div><button :class="props.resourceKey === 'locations' ? 'add-btn' : 'action-btn'" type="button" @click="openAdd"><svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>{{ pageInfo.add }}</button></div></div>

        <div :class="[props.resourceKey === 'locations' ? 'location-filter' : props.resourceKey === 'storageTypes' ? 'location-type-filter' : 'carrier-filter', 'agv-filter-bar']" data-agv-list-filters>
          <label class="agv-filter-field"><span>{{ props.resourceKey === 'locations' ? '查询库位' : props.resourceKey === 'carriers' ? '查询载具' : '查询类型' }}</span><input v-model="query" :placeholder="props.resourceKey === 'locations' ? '库位编码/名称' : props.resourceKey === 'carriers' ? '载具编码/条码' : '类型编码/名称'" @keyup.enter="load"></label>
          <label v-if="props.resourceKey === 'locations'" class="agv-filter-field"><span>库位类型</span><select v-model="secondaryFilter"><option value="">全部库位类型</option><option v-for="item in locationTypes" :key="item.id" :value="String(item.id)">{{ item.typeName || item.typeCode }} · {{ item.typeCode }}</option></select></label>
          <label v-if="props.resourceKey === 'carriers'" class="agv-filter-field"><span>载具状态</span><select v-model="secondaryFilter"><option value="">全部载具状态</option><option v-for="key in carrierFilterKeys" :key="key" :value="key">{{ carrierStatusMeta[key][0] }}</option></select></label>
          <label v-if="props.resourceKey === 'carrierTypes'" class="agv-filter-field"><span>状态选择</span><select v-model="secondaryFilter"><option value="">全部状态</option><option v-for="(meta, key) in typeStatusMeta" :key="key" :value="key">{{ meta[0] }}</option></select></label>
          <div class="agv-filter-actions"><button type="button" @click="resetFilters"><img class="filter-action-icon" src="/assets/list-icons/refresh.svg" alt="">重置</button><button class="primary" type="button"><img class="filter-action-icon" src="/assets/list-icons/search.svg" alt="">搜索</button></div>
        </div>

        <div class="table-wrap">
          <table v-if="props.resourceKey === 'locations'" aria-label="库位列表"><thead><tr><th>库位编码/名称</th><th>类型</th><th>所属空间/地图</th><th>所属设备/区域</th><th>地图坐标/导航点</th><th>占用状态</th><th>当前载具</th><th>最近核对</th><th>操作</th></tr></thead><tbody><tr v-if="loading"><td class="api-loading-cell" colspan="9"><span class="api-loading">正在加载库位…</span></td></tr><tr v-for="item in filteredRows" v-else :key="item.id" :class="{ selected: String(item.id) === String(selectedId) }" @click="selectedId = item.id"><td><div class="cell-stack"><strong>{{ item.locationCode || '-' }}</strong><span>{{ item.locationName || '-' }}</span></div></td><td>{{ typeName(item.locationType) }}</td><td><div class="cell-stack"><strong>{{ item.spaceName || '-' }}</strong><span>{{ item.mapName || '-' }}</span></div></td><td>{{ item.ownerName || '-' }}</td><td><div class="cell-stack"><strong class="main-regular">{{ coordinateText(item) }}</strong><span>导航点：{{ item.navPointCode || '-' }}</span></div></td><td><span :class="['status-tag', Number(item.occupancyStatus) === 1 ? 'state-occupied' : 'state-empty']">{{ Number(item.occupancyStatus) === 1 ? '占用' : '空闲' }}</span></td><td>{{ item.currentCarrierCode || '-' }}</td><td>{{ displayTime(item) }}</td><td><div class="location-actions"><button class="row-btn" @click.stop="openDetail(item)">详情</button><button class="row-btn map" @click.stop="openMap(item)">地图位置</button><button class="row-btn" @click.stop="openEdit(item)">编辑</button><button class="row-btn delete" :disabled="String(deletingId) === String(item.id)" @click.stop="remove(item)">{{ String(deletingId) === String(item.id) ? '删除中…' : '删除' }}</button></div></td></tr><tr v-if="!loading && !filteredRows.length"><td class="location-empty" colspan="9">暂无库位数据</td></tr></tbody></table>

          <table v-if="props.resourceKey === 'carriers'" aria-label="载具记录"><thead><tr><th>载具编码</th><th>条码</th><th>载具类型</th><th>当前库位</th><th>载具状态</th><th>关联订单</th><th>最后扫描/更新</th><th>操作</th></tr></thead><tbody><tr v-if="loading"><td class="api-loading-cell" colspan="8"><span class="api-loading">正在加载载具…</span></td></tr><tr v-for="item in filteredRows" v-else :key="item.id" :class="{ selected: String(item.id) === String(selectedId) }" @click="selectedId = item.id"><td>{{ item.carrierCode || '-' }}</td><td>{{ item.barcode || '-' }}</td><td>{{ carrierTypeName(item.carrierTypeId) }}</td><td>{{ locationName(item.currentLocationId) }}</td><td><span :class="['status-tag', carrierStatus(item.carrierStatus)[1]]">{{ carrierStatus(item.carrierStatus)[0] }}</span></td><td>{{ item.relatedOrderCode || '-' }}</td><td>{{ displayTime(item) }}</td><td><div class="carrier-actions"><button class="carrier-row-btn" @click.stop="openDetail(item)">详情</button><button class="carrier-row-btn" @click.stop="openEdit(item)">编辑</button><button class="carrier-row-btn delete" :disabled="String(deletingId) === String(item.id)" @click.stop="remove(item)">{{ String(deletingId) === String(item.id) ? '删除中…' : '删除' }}</button></div></td></tr><tr v-if="!loading && !filteredRows.length"><td class="carrier-empty" colspan="8">暂无载具数据</td></tr></tbody></table>

          <table v-if="props.resourceKey === 'storageTypes'" aria-label="库位类型"><thead><tr><th>类型编码</th><th>名称</th><th>容量</th><th>兼容载具类型</th><th>状态判定来源</th><th>隔离/互斥规则</th><th>备注</th><th>更新时间</th><th>操作</th></tr></thead><tbody><tr v-if="loading"><td class="api-loading-cell" colspan="9"><span class="api-loading">正在加载库位类型…</span></td></tr><tr v-for="item in filteredRows" v-else :key="item.id" :class="{ selected: String(item.id) === String(selectedId) }" @click="selectedId = item.id"><td>{{ item.typeCode || '-' }}</td><td>{{ item.typeName || '-' }}</td><td>{{ item.capacity ?? '-' }}</td><td>{{ item.compatibleCarrierTypes || '-' }}</td><td>{{ item.statusSource || '-' }}</td><td>{{ item.mutexRule || '-' }}</td><td>{{ item.remark || '-' }}</td><td>{{ displayTime(item) }}</td><td><div class="location-type-actions"><button class="location-type-row-btn" @click.stop="openEdit(item)">编辑</button><button class="location-type-row-btn delete" @click.stop="remove(item)">删除</button></div></td></tr><tr v-if="!loading && !filteredRows.length"><td class="location-type-empty" colspan="9">暂无库位类型数据</td></tr></tbody></table>

          <table v-if="props.resourceKey === 'carrierTypes'" aria-label="载具类型"><thead><tr><th>类型编码</th><th>名称</th><th>外形尺寸</th><th>最大载重</th><th>条码规则</th><th>状态</th><th>备注</th><th>更新时间</th><th>操作</th></tr></thead><tbody><tr v-if="loading"><td class="api-loading-cell" colspan="9"><span class="api-loading">正在加载载具类型…</span></td></tr><tr v-for="item in filteredRows" v-else :key="item.id" :class="{ selected: String(item.id) === String(selectedId) }" @click="selectedId = item.id"><td>{{ item.typeCode || '-' }}</td><td>{{ item.typeName || '-' }}</td><td>{{ item.dimension || '-' }}</td><td>{{ item.maxWeight == null ? '-' : `${item.maxWeight} kg` }}</td><td>{{ item.barcodeRule || '-' }}</td><td><span :class="['status-tag', carrierTypeStatus(item.status)[1]]">{{ carrierTypeStatus(item.status)[0] }}</span></td><td>{{ item.remark || '-' }}</td><td>{{ displayTime(item) }}</td><td><div class="carrier-actions"><button class="carrier-row-btn" @click.stop="openEdit(item)">编辑</button><button class="carrier-row-btn delete" @click.stop="remove(item)">删除</button></div></td></tr><tr v-if="!loading && !filteredRows.length"><td class="carrier-empty" colspan="9">暂无载具类型数据</td></tr></tbody></table>
        </div>
      </div>
    </section></div>

    <div v-if="modal === 'form'" id="locationFormModal" class="modal-overlay open" @click.self="closeLayer"><section class="modal-card" role="dialog" aria-modal="true"><div class="location-form-head"><h2>{{ formTitle }}</h2></div><form @submit.prevent="save"><div class="location-form-body">
      <template v-if="props.resourceKey === 'locations'"><section class="location-form-section"><div class="location-section-head"><strong>基础信息</strong><span>标识与类型</span></div><div class="form-grid"><label class="form-field"><span>库位编码 *</span><input v-model="form.locationCode" required maxlength="64" :disabled="editingId != null"></label><label class="form-field"><span>库位名称 *</span><input v-model="form.locationName" required maxlength="100"></label><label class="form-field"><span>库位类型</span><select v-model="form.locationType"><option value="">请选择库位类型</option><option v-for="item in locationTypes" :key="item.id" :value="item.id">{{ item.typeName || item.typeCode }} · {{ item.typeCode }}</option></select></label><label class="form-field"><span>所属设备或区域</span><input v-model="form.ownerName"></label></div></section><section class="location-form-section"><div class="location-section-head"><strong>空间归属</strong><span>实验室空间与地图</span></div><div class="form-grid"><label class="form-field"><span>所属空间</span><input v-model="form.spaceName"></label><label class="form-field"><span>所属地图</span><input v-model="form.mapName"></label></div></section><section class="location-form-section"><div class="location-section-head"><strong>地图定位</strong><span>坐标、导航点与操作点</span></div><div class="form-grid coordinate-grid"><label class="form-field"><span>坐标类型</span><input v-model="form.coordinateType" placeholder="例如：固定地图坐标"></label><label class="form-field"><span>AGV 导航点编码</span><input v-model="form.navPointCode"></label><label class="form-field"><span>取放操作点位</span><input v-model="form.operationPoint"></label><label class="form-field"><span>地图 X（米）</span><input v-model="form.mapX" type="number" step="0.0001"></label><label class="form-field"><span>地图 Y（米）</span><input v-model="form.mapY" type="number" step="0.0001"></label><label class="form-field"><span>偏航角（度）</span><input v-model="form.mapYaw" type="number" step="0.0001"></label></div></section><section class="location-form-section"><div class="location-section-head"><strong>状态与兼容</strong><span>载具适配及占用信息</span></div><div class="form-grid"><label class="form-field wide"><span>兼容载具类型</span><input v-model="form.compatibleCarrierType" placeholder="多个类型用逗号分隔"></label><label class="form-field"><span>状态来源</span><input v-model="form.statusSource"></label><label class="form-field"><span>占用状态</span><select v-model="form.occupancyStatus"><option :value="0">空闲</option><option :value="1">占用</option></select></label><label class="form-field"><span>当前载具编码</span><input v-model="form.currentCarrierCode"></label><label class="form-field"><span>最后核对时间</span><input v-model="form.lastCheckTime" placeholder="例如：2026-08-25 14:30:00"></label><label class="form-field wide"><span>备注</span><textarea v-model="form.remark" maxlength="500"></textarea></label></div></section></template>
      <div v-if="props.resourceKey === 'carriers'" class="form-grid"><label class="form-field"><span>载具编码 *</span><input v-model="form.carrierCode" required maxlength="64" :disabled="editingId != null" placeholder="例如 TRAY-000280"></label><label class="form-field"><span>条码</span><input v-model="form.barcode" maxlength="100" placeholder="例如 BC-TRAY-000280"></label><label class="form-field"><span>载具类型</span><select v-model="form.carrierTypeId"><option value="">请选择载具类型</option><option v-for="item in carrierTypes" :key="item.id" :value="item.id">{{ item.typeName || item.typeCode }} · {{ item.typeCode }}</option></select></label><label class="form-field"><span>载具状态</span><select v-model="form.carrierStatus"><option v-for="(meta, key) in carrierStatusMeta" :key="key" :value="key">{{ meta[0] }}</option></select></label><label class="form-field"><span>当前库位</span><select v-model="form.currentLocationId"><option value="">未分配库位</option><option v-for="item in locations" :key="item.id" :value="item.id">{{ item.locationName || item.locationCode }} · {{ item.locationCode }}</option></select></label><label class="form-field"><span>关联业务订单编码</span><input v-model="form.relatedOrderCode"></label><label class="form-field"><span>最后扫描时间</span><input v-model="form.lastScanTime" placeholder="例如 2026-08-25 14:30:00"></label><label class="form-field wide"><span>备注</span><textarea v-model="form.remark" maxlength="500"></textarea></label></div>
      <div v-if="props.resourceKey === 'storageTypes'" class="form-grid"><label class="form-field"><span>类型编码 *</span><input v-model="form.typeCode" required maxlength="64" :disabled="editingId != null"></label><label class="form-field"><span>名称 *</span><input v-model="form.typeName" required maxlength="100"></label><label class="form-field"><span>最大库位容量</span><input v-model="form.capacity" type="number" min="1" step="1"></label><label class="form-field wide"><span>兼容载具类型</span><input v-model="form.compatibleCarrierTypes" placeholder="多个类型编码用逗号分隔"></label><label class="form-field"><span>状态判定来源</span><input v-model="form.statusSource" placeholder="例如：PLC+扫码"></label><label class="form-field"><span>隔离/互斥规则</span><input v-model="form.mutexRule"></label><label class="form-field wide"><span>备注</span><textarea v-model="form.remark" maxlength="500"></textarea></label></div>
      <div v-if="props.resourceKey === 'carrierTypes'" class="form-grid"><label class="form-field"><span>类型编码 *</span><input v-model="form.typeCode" required maxlength="64" :disabled="editingId != null"></label><label class="form-field"><span>名称 *</span><input v-model="form.typeName" required maxlength="100"></label><label class="form-field"><span>外形尺寸</span><input v-model="form.dimension" placeholder="例如：320×220×45 mm"></label><label class="form-field"><span>最大载重（kg）</span><input v-model="form.maxWeight" type="number" min="0" step="0.001"></label><label class="form-field"><span>条码规则</span><input v-model="form.barcodeRule" placeholder="例如：BC-TRAY-******"></label><label class="form-field"><span>状态</span><select v-model="form.status"><option v-for="(meta, key) in typeStatusMeta" :key="key" :value="key">{{ meta[0] }}</option></select></label><label class="form-field wide"><span>备注</span><textarea v-model="form.remark" maxlength="500"></textarea></label></div>
    </div><div class="modal-actions"><button type="button" class="modal-close" @click="closeLayer">取消</button><button type="submit" class="modal-primary" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button></div></form></section></div>

    <div v-if="modal === 'detail' && selected" class="modal-overlay open" @click.self="closeLayer"><section class="modal-card" role="dialog" aria-modal="true"><h2>{{ props.resourceKey === 'locations' ? `库位详情 · ${selected.locationCode || ''}` : `载具详情 · ${selected.carrierCode || ''}` }}</h2><div class="detail-grid"><template v-if="props.resourceKey === 'locations'"><article v-for="item in [['库位编码',selected.locationCode],['库位名称',selected.locationName],['库位类型',typeName(selected.locationType)],['所属空间',selected.spaceName],['所属地图',selected.mapName],['所属设备或区域',selected.ownerName],['坐标类型',selected.coordinateType],['地图坐标',coordinateText(selected)],['AGV 导航点',selected.navPointCode],['取放操作点',selected.operationPoint],['兼容载具类型',selected.compatibleCarrierType],['状态来源',selected.statusSource],['占用状态',Number(selected.occupancyStatus)===1?'占用':'空闲'],['当前载具',selected.currentCarrierCode],['最后核对时间',selected.lastCheckTime]]" :key="item[0]" class="detail-item"><span>{{ item[0] }}</span><strong>{{ item[1] || '-' }}</strong></article><article class="detail-item wide"><span>备注</span><strong>{{ selected.remark || '-' }}</strong></article></template><template v-else><article v-for="item in [['载具编码',selected.carrierCode],['条码',selected.barcode],['载具类型',carrierTypeName(selected.carrierTypeId)],['载具状态',carrierStatus(selected.carrierStatus)[0]],['当前库位',locationName(selected.currentLocationId)],['关联订单',selected.relatedOrderCode],['最后扫描时间',selected.lastScanTime]]" :key="item[0]" class="detail-item"><span>{{ item[0] }}</span><strong>{{ item[1] || '-' }}</strong></article><article class="detail-item wide"><span>备注</span><strong>{{ selected.remark || '-' }}</strong></article></template></div><div class="modal-actions"><button class="modal-close" @click="closeLayer">关闭</button><router-link v-if="props.resourceKey === 'locations'" class="modal-primary" to="/dashboard">在运行总览中查看</router-link><router-link v-else class="modal-primary" to="/dispatch/storage">查看库位列表</router-link></div></section></div>

    <div v-if="modal === 'map' && selected" id="locationMapModal" class="modal-overlay open" @click.self="closeLayer"><section class="modal-card location-map-modal" role="dialog" aria-modal="true"><header class="location-map-head"><h2>地图位置查看 · {{ selected.locationCode }}</h2><button class="location-map-x" aria-label="关闭地图位置" @click="closeLayer">×</button></header><div class="location-map-body"><p class="location-map-notice">地图与运行总览保持一致，仅叠加当前库位定位信息。库位、载具、目标机台等动态数据请到对应详情中查看。</p><div class="location-map-view"><img src="/assets/agvmap.png" alt="与运行总览一致的实验室地图"><div class="location-map-marker" :style="mapStyle"><i></i><span>{{ selected.locationCode }}</span></div><span class="location-map-legend">黄色标记：当前选择库位</span></div><div class="location-map-summary"><article><span>当前库位</span><strong>{{ selected.locationCode || '-' }}</strong><small>{{ selected.locationName || '-' }}</small></article><article><span>所属空间（地图）</span><strong>{{ selected.spaceName || '-' }}</strong><small>{{ selected.mapName || selected.coordinateType || '实验室地图' }}</small></article><article><span>地图导航/操作点</span><strong>{{ selected.navPointCode || selected.operationPoint || '-' }}</strong><small>{{ coordinateText(selected) }}</small></article></div></div><footer class="location-map-footer"><button class="modal-close" @click="closeLayer">关闭</button></footer></section></div>
    <div :class="['toast', { show: toastMessage }]" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
:root {color-scheme:light;
      font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif;}
    *{box-sizing:border-box} body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}button{color:inherit}svg{display:block}[hidden]{display:none!important}
    .icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .page-head{min-height:75px;display:flex;align-items:center;padding:16px 20px;background:#fff}.page-head h1{margin:0 0 6px;font-size:19px;line-height:1.25;letter-spacing:-.02em}.page-head p{margin:0;color:var(--muted);font-size:13px}.page-canvas{min-height:calc(100vh - 128px);padding:20px}.page-panel{min-height:760px;overflow:hidden;border-radius:11px;background:#fff}.tabs-row{padding:16px;border-bottom:1px solid var(--line)}.tabs{width:fit-content;display:inline-flex;align-items:center;padding:2px;border-radius:9px;background:#f3f5f7}.tab-btn{height:34px;display:inline-flex;align-items:center;padding:0 15px;border:0;border-radius:8px;color:var(--ink);background:transparent;font-size:13px;text-decoration:none;cursor:pointer}.tab-btn.active{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(17,36,54,.08)}.tab-divider{width:1px;height:18px;margin:0 2px;background:#d8dde1}
    .content{padding:20px 16px 18px}.rule-banner{margin-bottom:19px;padding:16px 18px;border-radius:9px;color:var(--orange);background:#fff3ed;font-size:12px;font-weight:650;line-height:1.65}.list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:13px}.list-heading h2{margin:0 0 6px;font-size:15px}.list-heading p{margin:0;color:var(--muted);font-size:11px}.list-tools{display:flex;align-items:center;gap:15px}.legend{display:flex;align-items:center;gap:9px}.legend-chip,.status-tag{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid currentColor;border-radius:18px;line-height:1}.legend-chip{min-width:61px;padding:6px 10px;font-size:11px}.legend-chip:before,.status-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.state-empty{color:var(--green);border-color:#d1efdf;background:#f4fcf7}.state-occupied{color:var(--blue);border-color:#cbe3f7;background:#f2f8fd}.state-reserved{color:var(--yellow);border-color:#f8e8b4;background:#fffaf0}.state-conflict{color:var(--red);border-color:#f7d2d0;background:#fff6f5}.add-btn{height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650;cursor:pointer}.add-btn:hover{background:#176fb5}
    .table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;min-width:1190px;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;text-align:left;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;font-size:12px;font-weight:700;white-space:nowrap}td{height:68px;vertical-align:middle}tbody tr{transition:background .15s ease}tbody tr:hover{background:#f9fcfe}.cell-stack strong,.cell-stack span{display:block}.cell-stack strong{font-size:13px;font-weight:650}.cell-stack span{margin-top:7px;color:var(--muted);font-size:11px}.cell-stack .main-regular{font-weight:500}.linkish{text-decoration:underline;text-underline-offset:3px}.status-tag{min-width:61px;padding:5px 9px;font-size:11px}.row-actions{display:flex;gap:6px}.row-btn{height:27px;padding:0 10px;border:1px solid #e2e5e8;border-radius:14px;background:#f7f8f9;font-size:11px;font-weight:650;white-space:nowrap;cursor:pointer}.row-btn.map{color:var(--blue-strong);border-color:#cce3f5;background:#f1f8fd}.row-btn:hover{filter:brightness(.97)}
    .modal-overlay,.alert-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s ease}.modal-overlay.open,.alert-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(590px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:14px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .18s ease}.modal-overlay.open .modal-card{transform:none}.modal-card h2{margin:0 0 17px;font-size:19px}.status-list{display:grid;gap:12px}.status-item{padding:15px;border-radius:7px;background:#fff}.status-item strong{display:block;margin-bottom:7px;font-size:16px}.status-item p{margin:0;color:var(--muted);font-size:12px}.normal strong{color:#23c36b}.limited strong{color:#ffb000}.abnormal strong{color:#ff493d}.maintenance strong{color:#59616a}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detail-item{padding:13px;border-radius:8px;background:#fff}.detail-item span{display:block;margin-bottom:5px;color:var(--muted);font-size:10px}.detail-item strong{font-size:12px}.detail-item.wide{grid-column:1/-1}.modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}.modal-close,.modal-primary{height:36px;padding:0 15px;border:0;border-radius:8px;font-size:13px;font-weight:650;cursor:pointer}.modal-close{background:#e9edf1}.modal-primary{color:#fff;background:var(--blue);text-decoration:none;display:inline-flex;align-items:center}
    .alert-overlay{z-index:75}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:transform .24s ease;outline:0}.alert-overlay.open .alert-drawer{transform:none}.alert-header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.alert-header h2{margin:0 0 5px;font-size:20px}.alert-header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{min-height:0;overflow-y:auto;padding:16px}.alert-list{display:grid;gap:12px}.alert-card{padding:14px;border-radius:11px;background:#fff}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:#77808a;font-size:11px;line-height:1.5}.severity{float:right;padding:3px 7px;border:1px solid #ffd8d5;border-radius:13px;color:var(--red);background:#fff8f7;font-size:10px}.alert-footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.alert-primary{width:240px;height:37px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650;cursor:pointer}.toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s ease}.toast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:980px){.list-head{align-items:flex-start;flex-direction:column}.list-tools{width:100%;justify-content:space-between}.rule-banner{font-size:11px}}
    @media(max-width:760px){.page-head{padding:14px}.page-head h1{font-size:18px}.page-head p{font-size:12px}.page-canvas{padding:12px}.tabs-row{padding:12px;overflow-x:auto}.tabs{white-space:nowrap}.content{padding:16px 12px}.rule-banner{padding:14px}.list-tools{align-items:flex-start;flex-direction:column}.legend{width:100%;overflow-x:auto;padding-bottom:3px}.add-btn{width:100%;justify-content:center}.detail-grid{grid-template-columns:1fr}.detail-item.wide{grid-column:auto}.alert-drawer{width:100vw}}

/* Controller-rendered states */
.location-filter{display:flex;align-items:center;gap:10px;margin:0 0 14px}.location-filter input,.location-filter select{height:38px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font-size:12px}.location-filter input{width:min(230px,38vw)}.location-filter button{height:38px;padding:0 15px;border:0;border-radius:8px;color:var(--blue-strong);background:var(--blue-pale);font-size:12px;font-weight:650;cursor:pointer}.location-empty{text-align:center;color:var(--muted)}.location-actions{display:flex;gap:7px}.row-btn.delete{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.row-btn:disabled,.add-btn:disabled{cursor:not-allowed;opacity:.55}.location-enabled{display:inline-flex;padding:4px 8px;border-radius:12px;color:var(--green);background:#edf9f3;font-size:11px}.location-enabled.disabled{color:#8d949c;background:#f1f3f5}#locationFormModal{padding:20px}#locationFormModal .modal-card{width:min(880px,calc(100vw - 32px));max-height:min(90vh,820px);display:flex;flex-direction:column;overflow:hidden;padding:0;border:1px solid rgba(222,227,232,.9);border-radius:16px;background:#fff}#locationFormModal .location-form-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px 18px;border-bottom:1px solid #e9edf0;background:#fff}#locationFormModal .location-form-head h2{margin:0 0 6px;font-size:20px;line-height:1.25}#locationFormModal .location-form-head p{margin:0;color:#8a949d;font-size:12px;line-height:1.5}#locationFormModal .location-form-x{width:34px;height:34px;display:grid;place-items:center;flex:0 0 auto;border:0;border-radius:8px;color:#68737d;background:#f2f4f6;font-size:22px;line-height:1;cursor:pointer}#locationFormModal .location-form-x:hover{color:#243746;background:#e9edf0}#locationForm{min-height:0;display:flex;flex:1;flex-direction:column}#locationFormModal .location-form-body{min-height:0;overflow:auto;padding:18px 22px 22px;background:#f5f7f9}#locationFormModal .location-form-section{padding:17px 18px 18px;border:1px solid #e7ebee;border-radius:12px;background:#fff}#locationFormModal .location-form-section+.location-form-section{margin-top:14px}#locationFormModal .location-section-head{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}#locationFormModal .location-section-head strong{font-size:14px}#locationFormModal .location-section-head span{color:#98a0a8;font-size:11px}#locationFormModal .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}#locationFormModal .form-grid.coordinate-grid{grid-template-columns:repeat(3,minmax(0,1fr))}#locationFormModal .form-field{min-width:0;display:grid;align-content:start;gap:7px}#locationFormModal .form-field.wide{grid-column:1/-1}#locationFormModal .form-field>span{color:#69747e;font-size:11px;font-weight:600}#locationFormModal .form-field input,#locationFormModal .form-field select,#locationFormModal .form-field textarea{width:100%;border:1px solid #dce2e7;border-radius:8px;outline:0;color:#162838;background:#fff;font:inherit;font-size:12px;transition:border-color .16s,box-shadow .16s}#locationFormModal .form-field input,#locationFormModal .form-field select{height:40px;padding:0 11px}#locationFormModal .form-field textarea{min-height:74px;padding:10px 11px;resize:vertical}#locationFormModal .form-field input:focus,#locationFormModal .form-field select:focus,#locationFormModal .form-field textarea:focus{border-color:#62a8dc;box-shadow:0 0 0 3px rgba(33,130,209,.12)}#locationFormModal .form-field input:disabled{color:#7e8891;background:#f0f3f5;cursor:not-allowed}#locationFormModal .modal-actions{flex:0 0 auto;margin:0;padding:14px 22px;border-top:1px solid #e7ebee;background:#fff;box-shadow:0 -8px 22px rgba(20,42,60,.04)}#locationFormModal .modal-close,#locationFormModal .modal-primary{min-width:78px;height:38px;justify-content:center}#locationFormModal .modal-primary:disabled{cursor:not-allowed;opacity:.58}@media(max-width:760px){.location-filter{align-items:stretch;flex-direction:column}.location-filter input,.location-filter select,.location-filter button{width:100%}#locationFormModal{padding:10px}#locationFormModal .modal-card{width:100%;max-height:calc(100vh - 20px)}#locationFormModal .location-form-head{padding:18px 17px 14px}#locationFormModal .location-form-body{padding:12px}#locationFormModal .location-form-section{padding:14px}#locationFormModal .form-grid,#locationFormModal .form-grid.coordinate-grid{grid-template-columns:1fr}#locationFormModal .form-field.wide{grid-column:auto}#locationFormModal .modal-actions{padding:12px 14px}}
#locationFormModal .modal-card{width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 48px);padding:22px;border:0;border-radius:14px;background:#f5f7f9}#locationFormModal .location-form-head{display:block;padding:0;border:0;background:transparent}#locationFormModal .location-form-head h2{margin:0 0 17px;font-size:19px}#locationFormModal .location-form-head p,#locationFormModal .location-form-x{display:none}#locationFormModal .location-form-body{padding:0 3px 0 0;background:transparent}#locationFormModal .location-form-section{padding:0;border:0;border-radius:0;background:transparent}#locationFormModal .location-form-section+.location-form-section{margin-top:17px;padding-top:16px;border-top:1px solid #e1e5e8}#locationFormModal .location-section-head{margin-bottom:11px}#locationFormModal .location-section-head strong{font-size:13px}#locationFormModal .location-section-head span{font-size:10px}#locationFormModal .form-grid,#locationFormModal .form-grid.coordinate-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#locationFormModal .form-field{gap:7px}#locationFormModal .form-field>span{color:#65707a;font-size:11px;font-weight:400}#locationFormModal .form-field input,#locationFormModal .form-field select{height:39px;border-color:#dfe3e6}#locationFormModal .form-field textarea{min-height:76px;border-color:#dfe3e6}#locationFormModal .modal-actions{margin:17px 0 0;padding:0;border:0;background:transparent;box-shadow:none}#locationFormModal .modal-close,#locationFormModal .modal-primary{min-width:auto;height:36px}@media(max-width:760px){#locationFormModal .modal-card{width:100%;max-height:calc(100vh - 20px);padding:18px}#locationFormModal .location-form-body{padding:0 2px 0 0}#locationFormModal .form-grid,#locationFormModal .form-grid.coordinate-grid{grid-template-columns:1fr}#locationFormModal .location-form-section+.location-form-section{margin-top:15px;padding-top:14px}#locationFormModal .modal-actions{padding:0}}
.api-loading-cell{height:120px!important;text-align:center}.api-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.api-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:api-loading-spin .7s linear infinite}@keyframes api-loading-spin{to{transform:rotate(360deg)}}

/* 库位地图定位弹窗 */
#locationMapModal{padding:24px}.location-map-modal{width:min(900px,calc(100vw - 32px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;padding:0;border-radius:12px;background:#fff}.location-map-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 18px 11px}.location-map-head h2{margin:0;font-size:15px;line-height:22px}.location-map-x{width:30px;height:30px;display:grid;place-items:center;flex:0 0 auto;padding:0;border:0;border-radius:7px;color:#87919a;background:transparent;font-size:23px;line-height:1;cursor:pointer}.location-map-x:hover{color:var(--ink);background:#f2f4f6}.location-map-body{min-height:0;overflow-y:auto;padding:0 18px 18px}.location-map-notice{margin:0 0 14px;padding:11px 13px;border-radius:8px;color:#f06b34;background:#fff1e9;font-size:11px;line-height:1.55}.location-map-view{position:relative;width:calc(100% - 80px);margin:0 auto;overflow:hidden;aspect-ratio:1672/941;border:1px solid #edf0f2;border-radius:9px;background:#fff}.location-map-view>img{display:block;width:100%;height:100%;object-fit:contain}.location-map-marker{position:absolute;left:var(--location-x,25%);top:var(--location-y,52%);z-index:2;display:flex;align-items:center;transform:translate(-7px,-50%);pointer-events:none}.location-map-marker>i{width:14px;height:14px;flex:0 0 auto;border:3px solid #fff;border-radius:50%;background:#f6b714;box-shadow:0 0 0 2px rgba(12,29,47,.16),0 3px 8px rgba(12,29,47,.28)}.location-map-marker>span{margin-left:7px;padding:5px 8px;border-radius:5px;color:#fff;background:rgba(12,29,47,.82);font-size:10px;line-height:1.3;white-space:nowrap}.location-map-legend{position:absolute;left:9px;bottom:8px;padding:5px 8px;border-radius:5px;color:#fff;background:rgba(12,29,47,.78);font-size:9px;line-height:1.3}.location-map-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.location-map-summary article{min-width:0;min-height:94px;padding:14px;border:1px solid #e8ecef;border-radius:9px;background:#fff}.location-map-summary span,.location-map-summary small{display:block;color:#929ba4;font-size:10px;line-height:16px}.location-map-summary strong{display:block;margin:8px 0 6px;overflow:hidden;color:#26384a;font-size:14px;line-height:20px;text-overflow:ellipsis;white-space:nowrap}.location-map-summary small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.location-map-footer{display:flex;justify-content:flex-end;padding:12px 18px;border-top:1px solid #eef0f2;background:#fff}@media(max-width:760px){#locationMapModal{padding:10px}.location-map-modal{width:100%;max-height:calc(100vh - 20px)}.location-map-head{padding:15px 14px 10px}.location-map-body{padding:0 14px 14px}.location-map-view{width:100%}.location-map-summary{grid-template-columns:1fr}.location-map-summary article{min-height:76px}.location-map-footer{padding:11px 14px}}
</style>
<style scoped src="../styles/forms.css"></style>
<style scoped>
.storage-resource-page{min-height:100%;color:#122235;background:#f3f6f8;--blue:#1677c8;--blue-strong:#1677c8;--blue-pale:#eaf4fd;--green:#1f9d63;--yellow:#d99b00;--orange:#d96522;--red:#d84343;--ink:#122235;--muted:#768392;--line:#dfe5ea;--canvas:#f3f6f8;--agv-topbar-height:56px}.storage-resource-page .page-head{min-height:92px;display:flex;align-items:center;padding:16px 20px}.storage-resource-page .page-head h1{margin:0 0 8px;font-size:20px;line-height:26px}.storage-resource-page .page-head p{margin:0;color:#596675;font-size:13px;line-height:20.15px}.storage-resource-page .icon{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.storage-resource-page .page-panel{min-height:760px}.storage-resource-page .agv-filter-bar{margin:0 0 14px!important}.storage-resource-page .table-wrap>table{table-layout:auto}.storage-resource-page tbody tr.selected{background:#f2f8fd}.storage-resource-page .action-btn{height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border:0;border-radius:8px;color:#fff;background:#1677c8;font-size:13px;font-weight:650;cursor:pointer}.storage-resource-page .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.storage-resource-page .form-field{display:grid;gap:7px}.storage-resource-page .form-field.wide{grid-column:1/-1}.storage-resource-page .form-field span{color:#65707a;font-size:11px}.storage-resource-page .form-field input,.storage-resource-page .form-field select{width:100%;height:39px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font-size:12px}.storage-resource-page .form-field textarea{min-height:76px;padding:10px 11px;resize:vertical;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font:inherit;font-size:12px}.carriers-page table{min-width:1100px}.carriers-page td{height:53px}.carriers-page tbody tr{cursor:pointer}.carriers-page .status-tag{min-width:78px;height:24px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:4px 12px;border:1px solid currentColor;border-radius:999px;font-size:12px;line-height:16px}.carriers-page .status-tag::before{width:4px;height:4px}.status-executing{color:#28bd6b;border-color:#bfead3;background:rgba(40,189,107,.08)}.status-executing::before{background:#1577d2!important}.status-completed{color:#2f9d68;border-color:#c9ead9;background:#f3fbf7}.status-waiting{color:#bc8300;border-color:#f7dfad;background:rgba(246,183,20,.08)}.status-failed{color:#d84343;border-color:#f1cccc;background:#fff3f3}.status-cancelled{color:#7f8a95;border-color:#dfe4e8;background:#f6f8f9}.carrier-actions,.location-type-actions{display:flex;gap:7px}.carrier-row-btn,.location-type-row-btn{height:27px;padding:0 10px;border:1px solid #cde2f3;border-radius:15px;color:#1677c8;background:#f1f8fd;font-size:11px;font-weight:650;cursor:pointer}.carrier-row-btn.delete,.location-type-row-btn.delete{color:#d84343;border-color:#f3d7d5;background:#fff5f4}.storageTypes-page table{min-width:1160px}.carrierTypes-page table{min-width:1120px}.storageTypes-page td,.carrierTypes-page td{height:53px}.storageTypes-page tbody tr,.carrierTypes-page tbody tr{cursor:pointer}.carrierTypes-page .status-tag{min-width:66px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:5px 9px;border:1px solid currentColor;border-radius:18px;font-size:11px;line-height:1}.carrierTypes-page .status-tag::before{width:5px;height:5px}.state-published{color:#1f9d63;border-color:#d1efdf;background:#f4fcf7}.state-disabled{color:#8d949c;border-color:#e1e5e8;background:#f7f8f9}.location-empty,.carrier-empty,.location-type-empty{text-align:center;color:#768392}.storage-resource-page #locationFormModal .modal-card{width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 48px)}.storage-resource-page #locationFormModal .location-form-body{max-height:calc(100vh - 170px);overflow:auto}.carriers-page #locationFormModal .location-form-body,.storageTypes-page #locationFormModal .location-form-body,.carrierTypes-page #locationFormModal .location-form-body{padding:0 3px 0 0}.carriers-page #locationFormModal .modal-card,.storageTypes-page #locationFormModal .modal-card,.carrierTypes-page #locationFormModal .modal-card{width:min(590px,calc(100vw - 32px))}@media(max-width:760px){.storage-resource-page .page-head{min-height:75px;padding:14px}.storage-resource-page .page-head h1{margin-bottom:6px;font-size:18px;line-height:1.25}.storage-resource-page .page-head p{font-size:12px;line-height:normal}.storage-resource-page .form-grid{grid-template-columns:1fr}.storage-resource-page .form-field.wide{grid-column:auto}.storage-resource-page .page-panel{min-height:calc(100vh - 152px)}}
</style>
