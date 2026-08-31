<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardOverview, getLabConfig, getLaboratory } from '../api/agv'
import { appState } from '../stores/appStore'

const routeColors = ['#2188ff', '#18a66a', '#8a5cf5', '#f39b24', '#ec5272', '#16a5a3']
const routeGroups = {
  A: [[92, 304], [164, 304], [164, 228], [302, 228], [302, 194], [454, 194], [454, 420], [566, 420]],
  B: [[943, 445], [819, 445], [819, 382], [903, 382], [903, 294], [740, 294], [740, 330], [648, 330]],
}
const statusMeta = {
  RUNNING: { label: '运行中', color: '#2188ff' },
  WAITING: { label: '等待资源', color: '#f39b24' },
  IDLE: { label: '空闲', color: '#18a66a' },
  CHARGING: { label: '充电中', color: '#8a5cf5' },
  ERROR: { label: '异常', color: '#e64a62' },
}

const mapArt = ref(null)
const cardsHost = ref(null)
const selectedAgv = ref('all')
const agvKeyword = ref('')
const statusFilter = ref('all')
const overview = ref(null)
const mapVersion = ref('大型实验室地图 V1')
const mapLoading = ref(true)
const mapMessage = ref('地图加载中…')
const tooltip = reactive({ visible: false, label: '', left: 0, top: 0, arrowX: 0 })
const mapView = reactive({ scale: 1, x: 0, y: 0, dragging: false, pointerX: 0, pointerY: 0 })

const resources = [
  { name: '检测仪 B 进样位', status: '预约中', tone: '', task: 'TRN-0031-01', reason: '等待机台许可', release: '放料完成' },
  { name: '机器人缓存位 C01', status: '占用', tone: 'yellow', task: 'TRN-0031-01', reason: '载具在车', release: '从缓存取走' },
  { name: '自动门 D-01', status: '已预约', tone: 'green', task: 'TRN-0035-01', reason: '等待通行', release: 'AGV 通过门区' },
]

function normalizeStatus(value, online = true) {
  if (online === false) return 'ERROR'
  const status = String(value || '').toUpperCase()
  if (['执行中', '运行中', 'EXECUTING', 'RUNNING', 'MOVING', 'WORKING'].includes(status)) return 'RUNNING'
  if (['等待资源', '等待', 'STANDBY', 'WAITING', 'QUEUED', 'BLOCKED'].includes(status)) return 'WAITING'
  if (['充电', '充电中', 'CHARGING'].includes(status)) return 'CHARGING'
  if (['异常', '故障', '离线', 'ERROR', 'FAULT', 'OFFLINE'].includes(status)) return 'ERROR'
  return 'IDLE'
}

const fleetAgvs = computed(() => {
  const backendAgv = overview.value?.agvStatus || {}
  const backendCode = backendAgv.agvCode || backendAgv.code
  return appState.agvs.map((agv, index) => {
    const isBackendRobot = backendCode === agv.code
    const routeGroup = index < 3 ? 'A' : 'B'
    const online = isBackendRobot && typeof backendAgv.online === 'boolean' ? backendAgv.online : agv.online
    const status = normalizeStatus(isBackendRobot ? backendAgv.executionStatus : agv.status, online)
    return {
      ...agv,
      online,
      status,
      statusLabel: statusMeta[status]?.label || statusMeta.IDLE.label,
      statusColor: statusMeta[status]?.color || statusMeta.IDLE.color,
      battery: isBackendRobot && Number.isFinite(Number(backendAgv.batteryPercent))
        ? Math.max(0, Math.min(100, Number(backendAgv.batteryPercent)))
        : agv.battery,
      point: isBackendRobot
        ? backendAgv.currentPointName || backendAgv.currentPointCode || backendAgv.currentLocation || agv.location
        : agv.location,
      routeColor: routeColors[index],
      routeGroup,
      routeLane: index % 3,
      routeProgressIndex: index % 3 === 0 ? 1 : index % 3 === 1 ? 4 : 7,
      routePoints: routeGroups[routeGroup],
      flow: `FLOW-${String((index % 4) + 1).padStart(3, '0')}`,
    }
  })
})

const filteredAgvs = computed(() => {
  const keyword = agvKeyword.value.trim().toLowerCase()
  return fleetAgvs.value.filter((agv) => {
    const matchesKeyword = !keyword || agv.code.toLowerCase().includes(keyword)
    const matchesStatus = statusFilter.value === 'all' || agv.status === statusFilter.value
    return matchesKeyword && matchesStatus
  })
})

const mapAgvs = computed(() => selectedAgv.value === 'all'
  ? fleetAgvs.value
  : fleetAgvs.value.filter((agv) => agv.code === selectedAgv.value))

const mapSummary = computed(() => selectedAgv.value === 'all'
  ? '当前显示 6 台 AGV：AGV-01～03 共用 A 组路线，AGV-04～06 共用 B 组路线'
  : mapAgvs.value.length
    ? `${mapAgvs.value[0].code}（${mapAgvs.value[0].routeGroup}组 · ${mapAgvs.value[0].point}）的当前位置、任务点位与调度路线`
    : '当前没有可显示的 AGV')

const agvMetrics = computed(() => {
  const counts = fleetAgvs.value.reduce((result, agv) => {
    result[agv.status] = (result[agv.status] || 0) + 1
    return result
  }, {})
  const count = (status) => counts[status] || 0
  return [
    { label: 'AGV 总数', value: fleetAgvs.value.length, unit: '台' },
    { label: '运行中', value: count('RUNNING'), unit: '台', badge: '正在执行任务', tone: 'blue' },
    { label: '空闲 / 等待', value: count('IDLE') + count('WAITING'), unit: '台', badge: `空闲 ${count('IDLE')} · 等待资源 ${count('WAITING')}`, tone: 'warning' },
    { label: '充电中', value: count('CHARGING'), unit: '台', badge: '充电或维护', tone: 'orange' },
    { label: '异常', value: count('ERROR'), unit: '台', badge: '故障或离线', tone: 'danger' },
  ]
})

const orderMetrics = computed(() => {
  const order = overview.value?.currentOrder || {}
  const today = overview.value?.todayTaskCompletion || {}
  const executing = number(order.executingCount, 5)
  const queued = number(order.queuedCount, 4)
  const total = number(today.totalCount, executing + queued + 8)
  const abnormal = Math.max(0, number(order.abnormalCount, 0))
  const completed = Math.max(0, number(order.completedCount, total - executing - queued - abnormal))
  const received = Math.max(total, executing + queued + completed + abnormal)
  const runningAgvs = fleetAgvs.value.filter((agv) => agv.status === 'RUNNING').length
  return [
    { label: '今日接收', value: received, unit: '单', caption: '来自 MES / LIMS' },
    { label: '执行中', value: executing, unit: '单', caption: `关联 ${runningAgvs} 台运行中 AGV`, tone: 'blue' },
    { label: '排队中', value: queued, unit: '单', caption: '等待 AGV 或共享资源', tone: 'warning' },
    { label: '已完成', value: completed, unit: '单', caption: '已完成结果回传', tone: 'success' },
    { label: '异常', value: abnormal, unit: '单', caption: '任务挂起或等待人工处理', tone: 'danger' },
  ]
})

function number(value, fallback = 0) {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}

function routeSegments(points) {
  return points.slice(0, -1).map((start, index) => {
    const end = points[index + 1]
    return `M ${start[0]} ${start[1]} H ${end[0]} V ${end[1]}`
  })
}

function showWaypointTooltip(event, agv, index) {
  const anchor = event.currentTarget.getBoundingClientRect()
  const host = mapArt.value?.getBoundingClientRect()
  if (!host) return
  tooltip.label = `${agv.code} 点位 ${index + 1} · X ${agv.routePoints[index][0]} / Y ${agv.routePoints[index][1]}`
  tooltip.visible = true
  tooltip.left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - host.left - 110, host.width - 228))
  tooltip.top = Math.max(8, anchor.top - host.top - 42)
  tooltip.arrowX = Math.max(12, Math.min(anchor.left + anchor.width / 2 - host.left - tooltip.left, 208))
}

function hideTooltip() {
  tooltip.visible = false
}

function announceWaypoint(agv, index) {
  ElMessage.info(`${agv.code} 点位 ${index + 1} · X ${agv.routePoints[index][0]} / Y ${agv.routePoints[index][1]}`)
}

function resetFilters() {
  agvKeyword.value = ''
  statusFilter.value = 'all'
}

function selectRobot(agv) {
  selectedAgv.value = agv.code
  requestAnimationFrame(() => mapArt.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

function scrollCards(direction) {
  cardsHost.value?.scrollBy({ left: direction * 580, behavior: 'smooth' })
}

function applyZoom(nextScale) {
  mapView.scale = Math.max(1, Math.min(3, Math.round(nextScale * 10) / 10))
  if (mapView.scale === 1) {
    mapView.x = 0
    mapView.y = 0
  }
  hideTooltip()
}

function resetZoom() {
  mapView.scale = 1
  mapView.x = 0
  mapView.y = 0
  hideTooltip()
}

function onMapWheel(event) {
  applyZoom(mapView.scale + (event.deltaY < 0 ? 0.2 : -0.2))
}

function onMapPointerDown(event) {
  if (mapView.scale <= 1 || event.button !== 0 || event.target.closest('.fleet-map-zoom')) return
  mapView.dragging = true
  mapView.pointerX = event.clientX
  mapView.pointerY = event.clientY
  mapArt.value?.setPointerCapture?.(event.pointerId)
}

function onMapPointerMove(event) {
  if (!mapView.dragging) return
  mapView.x += event.clientX - mapView.pointerX
  mapView.y += event.clientY - mapView.pointerY
  mapView.pointerX = event.clientX
  mapView.pointerY = event.clientY
  hideTooltip()
}

function stopMapDrag(event) {
  if (!mapView.dragging) return
  mapView.dragging = false
  if (mapArt.value?.hasPointerCapture?.(event.pointerId)) mapArt.value.releasePointerCapture(event.pointerId)
}

async function loadOverview() {
  try {
    overview.value = await getDashboardOverview()
  } catch (error) {
    console.error('加载车队总览失败', error)
  }
}

async function loadMap() {
  mapLoading.value = true
  mapMessage.value = '地图加载中…'
  try {
    const laboratory = await getLaboratory()
    const config = laboratory?.published || laboratory?.draft
    const configId = config?.configId ?? config?.id
    const detail = configId ? await getLabConfig(configId) : null
    mapVersion.value = `大型实验室地图 V${detail?.revision || config?.revision || 1}`
  } catch (error) {
    console.error('加载多 AGV 地图失败', error)
    mapMessage.value = '实时地图数据暂不可用，当前显示本地地图'
    await new Promise((resolve) => window.setTimeout(resolve, 1200))
  } finally {
    mapLoading.value = false
  }
}

onMounted(() => Promise.allSettled([loadOverview(), loadMap()]))
</script>

<template>
  <div class="fleet-dashboard dashboard-view">
    <section class="fleet-panel fleet-map-panel" aria-labelledby="fleetMapTitle">
      <header class="fleet-panel-head">
        <div><h2 id="fleetMapTitle">多 AGV 实时运行地图</h2><p>{{ mapSummary }}</p></div>
        <div class="fleet-map-controls">
          <div class="fleet-map-select-wrap">
            <label for="fleetMapRobot">地图显示 AGV</label>
            <select id="fleetMapRobot" v-model="selectedAgv">
              <option value="all">全部 6 台 AGV</option>
              <option v-for="agv in fleetAgvs" :key="agv.id" :value="agv.code">{{ agv.code }} · {{ agv.routeGroup }}组 · {{ agv.point }}</option>
            </select>
          </div>
          <div class="fleet-map-badges">
            <span class="fleet-badge map-version">{{ mapVersion }}</span>
            <span class="fleet-badge map-count">当前显示 {{ mapAgvs.length }} 台</span>
          </div>
        </div>
      </header>

      <div
        ref="mapArt"
        :class="['fleet-map-art', { 'is-dragging': mapView.dragging }]"
        role="group"
        aria-label="多 AGV 实时运行地图"
        @wheel.prevent="onMapWheel"
        @dblclick.prevent="applyZoom(mapView.scale + 0.4)"
        @pointerdown="onMapPointerDown"
        @pointermove="onMapPointerMove"
        @pointerup="stopMapDrag"
        @pointercancel="stopMapDrag"
      >
        <div class="fleet-map-viewport" :style="{ transform: `translate(${mapView.x}px, ${mapView.y}px) scale(${mapView.scale})` }">
          <img class="fleet-map-image" src="/assets/agvmap.png" alt="多 AGV 实验室完整地图">
          <svg class="fleet-route-layer" viewBox="0 0 1024 551" preserveAspectRatio="none" aria-label="多 AGV 路线与实验室点位图层">
            <defs>
              <marker v-for="(color, index) in routeColors" :id="`fleetArrow${index + 1}`" :key="color" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8Z" :fill="color" /></marker>
            </defs>
            <g aria-label="各 AGV 独立点位与方向连线">
              <g
                v-for="agv in mapAgvs"
                :key="agv.code"
                class="fleet-route"
                :data-fleet-robot="agv.code"
                :data-route-group="agv.routeGroup"
                :style="{ '--route': agv.routeColor, '--route-dash-offset': `${agv.routeLane * -6}px` }"
                :aria-label="`${agv.code} · ${agv.routeGroup}组共用路线`"
              >
                <path v-for="(segment, segmentIndex) in routeSegments(agv.routePoints)" :key="segmentIndex" class="fleet-route-line" :d="segment" :marker-end="`url(#fleetArrow${agv.id})`" />
                <g
                  v-for="(point, pointIndex) in agv.routePoints"
                  v-show="selectedAgv !== 'all' || agv.routeLane === 0"
                  :key="`point-${pointIndex}`"
                  class="fleet-agv-waypoint-node"
                  tabindex="0"
                  role="button"
                  :aria-label="`${agv.code} 点位 ${pointIndex + 1} · X ${point[0]} / Y ${point[1]}`"
                  :transform="`translate(${point[0]} ${point[1]})`"
                  @mouseenter="showWaypointTooltip($event, agv, pointIndex)"
                  @mouseleave="hideTooltip"
                  @focus="showWaypointTooltip($event, agv, pointIndex)"
                  @blur="hideTooltip"
                  @click="announceWaypoint(agv, pointIndex)"
                  @keydown.enter.prevent="announceWaypoint(agv, pointIndex)"
                  @keydown.space.prevent="announceWaypoint(agv, pointIndex)"
                ><path class="fleet-agv-waypoint" d="M 0 -7 L 7 0 L 0 7 L -7 0 Z" /></g>
                <g class="fleet-agv-current" :transform="`translate(${agv.routePoints[agv.routeProgressIndex][0]} ${agv.routePoints[agv.routeProgressIndex][1]})`">
                  <circle r="9" />
                  <rect class="fleet-agv-body" x="-5" y="-4" width="10" height="8" rx="2" />
                  <rect class="fleet-agv-info-bg" :x="agv.routePoints[agv.routeProgressIndex][0] > 760 ? -142 : 14" y="-28" width="128" height="50" rx="4" />
                  <text class="fleet-agv-info-title" :x="agv.routePoints[agv.routeProgressIndex][0] > 760 ? -135 : 21" y="-14">{{ agv.code }} · {{ agv.point }}</text>
                  <text :x="agv.routePoints[agv.routeProgressIndex][0] > 760 ? -135 : 21" y="-2">订单：{{ agv.task }}</text>
                  <text :x="agv.routePoints[agv.routeProgressIndex][0] > 760 ? -135 : 21" y="11">流程：{{ agv.flow }} · {{ agv.target }}</text>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div class="fleet-map-zoom" aria-label="地图缩放控制">
          <button type="button" aria-label="放大地图" @click="applyZoom(mapView.scale + 0.2)">+</button>
          <button type="button" aria-label="缩小地图" @click="applyZoom(mapView.scale - 0.2)">−</button>
          <button type="button" aria-label="重置地图缩放" @click="resetZoom">复位</button>
        </div>
        <div v-if="mapLoading" class="fleet-map-state">{{ mapMessage }}</div>
        <div v-if="tooltip.visible" class="fleet-map-tooltip" role="tooltip" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px`, '--tooltip-arrow-x': `${tooltip.arrowX}px` }">{{ tooltip.label }}</div>
        <div class="fleet-map-note">路线为各 AGV 当前任务的调度走向，地图筛选只影响显示，不改变实际任务</div>
      </div>
      <div class="fleet-route-legend" aria-label="AGV 路线图例">
        <span v-for="agv in mapAgvs" :key="agv.id" class="fleet-legend-item" :style="{ '--legend': agv.routeColor }"><i />{{ agv.code }} · {{ agv.routeGroup }}组 · {{ agv.task }}</span>
      </div>
    </section>

    <aside class="fleet-side-column" aria-label="当前任务资源与待处理事项">
      <section class="side-panel fleet-resource-panel">
        <h2>当前任务占用与预约资源</h2>
        <div class="resource-list">
          <article v-for="item in resources" :key="item.name" class="resource-card">
            <div class="resource-head"><strong>{{ item.name }}</strong><span :class="['mini-pill', item.tone]"><i class="dot" />{{ item.status }}</span></div>
            <div class="resource-details">
              <div class="detail-row"><span class="detail-label">关联任务</span><span>{{ item.task }}</span></div>
              <div class="detail-row"><span class="detail-label">原因</span><span>{{ item.reason }}</span></div>
              <div class="detail-row"><span class="detail-label">释放条件</span><span>{{ item.release }}</span></div>
            </div>
          </article>
        </div>
      </section>
      <section class="side-panel issues-panel fleet-issues-panel">
        <div class="panel-heading"><h2>待处理事项</h2></div>
        <div class="issue-list">
          <article class="issue-card"><div class="issue-head"><span class="issue-check" aria-hidden="true" /><div class="issue-copy"><strong>库位状态不一致</strong><p>立库 A-第4层-07 · 建议扫码核对</p></div></div></article>
          <article class="issue-card"><div class="issue-head"><span class="issue-check" aria-hidden="true" /><div class="issue-copy"><strong>机台许可等待超时</strong><p>检测仪 B · 等待操作员确认</p></div></div></article>
        </div>
      </section>
    </aside>

    <section class="fleet-metrics-block fleet-agv-summary" aria-labelledby="agvStatsTitle">
      <div class="fleet-section-label"><h2 id="agvStatsTitle">AGV 状态统计</h2><p>车队实时在线与任务分布</p></div>
      <div class="fleet-metrics five">
        <article v-for="item in agvMetrics" :key="item.label" class="fleet-metric">
          <div class="fleet-metric-head"><span class="fleet-metric-label">{{ item.label }}</span><span v-if="item.badge" :class="['fleet-metric-badge', item.tone]">{{ item.badge }}</span></div>
          <strong>{{ item.value }}<em>{{ item.unit }}</em></strong>
        </article>
      </div>
    </section>

    <section class="fleet-metrics-block fleet-order-summary" aria-labelledby="orderStatsTitle">
      <div class="fleet-section-label"><h2 id="orderStatsTitle">订单情况统计</h2><p>统计今日已接收、执行中、排队中、已完成和异常订单</p></div>
      <div class="fleet-metrics five">
        <article v-for="item in orderMetrics" :key="item.label" class="fleet-metric">
          <div class="fleet-metric-head"><span class="fleet-metric-label">{{ item.label }}</span></div>
          <strong>{{ item.value }}<em>{{ item.unit }}</em></strong>
          <small :class="['fleet-metric-caption', item.tone]">{{ item.caption }}</small>
        </article>
      </div>
    </section>

    <section class="fleet-panel fleet-monitor" aria-labelledby="fleetMonitorTitle">
      <header class="fleet-panel-head monitor-head"><div><h2 id="fleetMonitorTitle">AGV 状态监控</h2><p>查看每台 AGV 的电量、位置、任务和目标点位</p></div><span class="fleet-badge">共 {{ filteredAgvs.length }} 台</span></header>
      <div class="fleet-filter-bar">
        <label class="fleet-search"><span aria-hidden="true">⌕</span><input v-model="agvKeyword" type="search" placeholder="搜索 AGV 编号" autocomplete="off"></label>
        <select v-model="statusFilter" aria-label="按运行状态筛选"><option value="all">全部状态</option><option v-for="(meta, code) in statusMeta" :key="code" :value="code">{{ meta.label }}</option></select>
        <button class="fleet-reset" type="button" @click="resetFilters">重置</button>
        <button class="fleet-search-button" type="button">搜索</button>
      </div>
      <div class="fleet-carousel-wrap">
        <button class="fleet-carousel-arrow previous" type="button" aria-label="向左查看更多 AGV" @click="scrollCards(-1)">‹</button>
        <div v-show="filteredAgvs.length" ref="cardsHost" class="fleet-cards">
          <article v-for="agv in filteredAgvs" :key="agv.id" :class="['fleet-card', { selected: selectedAgv === agv.code }]" :style="{ '--status': agv.statusColor }" tabindex="0" role="button" :aria-label="`查看 ${agv.code} 运行路线`" @click="selectRobot(agv)" @keydown.enter.prevent="selectRobot(agv)" @keydown.space.prevent="selectRobot(agv)">
            <div class="fleet-card-head"><div class="fleet-card-id"><span><strong>{{ agv.code }}</strong><small>{{ agv.online ? '通信在线' : '通信异常' }}</small></span></div><span class="fleet-status">{{ agv.statusLabel }}</span></div>
            <div class="fleet-card-details">
              <div class="fleet-detail"><span>当前位置</span><b :title="agv.point">{{ agv.point }}</b></div>
              <div class="fleet-detail"><span>当前任务</span><b :title="agv.task">{{ agv.task }}</b></div>
              <div class="fleet-detail"><span>目标位置</span><b :title="agv.target">{{ agv.target }}</b></div>
            </div>
            <div class="fleet-battery"><div class="fleet-battery-track"><i :style="{ '--battery': `${agv.battery}%` }" /></div><b>{{ agv.battery }}%</b></div>
          </article>
        </div>
        <button class="fleet-carousel-arrow next" type="button" aria-label="向右查看更多 AGV" @click="scrollCards(1)">›</button>
      </div>
      <div v-if="!filteredAgvs.length" class="fleet-empty">没有符合当前条件的 AGV</div>
    </section>

    <div class="fleet-page-actions"><router-link class="fleet-secondary-action" to="/dispatch/conflicts">进入冲突节点排程</router-link></div>
  </div>
</template>

<style scoped>
.dashboard-view { font-size: 14px; }
.dashboard-view .fleet-metric::after { content: none; }
.dashboard-view .fleet-card { margin-top: 0; padding: 12px; }
.dashboard-view .fleet-map-controls { justify-content: space-between; }
.dashboard-view .fleet-map-select-wrap { position: relative; }
.dashboard-view .fleet-map-select-wrap::after { position: absolute; top: 50%; right: 13px; width: 6px; height: 6px; border-right: 1.5px solid #7b8793; border-bottom: 1.5px solid #7b8793; content: ''; pointer-events: none; transform: translateY(-70%) rotate(45deg); }
.dashboard-view .fleet-map-controls select { width: 138px; min-width: 138px; height: 40px; padding: 0 28px 0 12px; appearance: none; }
.dashboard-view .fleet-map-viewport { min-height: 0; transition: transform .2s; }
.dashboard-view .fleet-map-image { min-height: 0; }
.dashboard-view .fleet-route-legend span { padding: 4px 8px; }
.dashboard-view .resource-list,
.dashboard-view .issue-list { display: grid; gap: 9px; }
.dashboard-view .side-panel h2 { margin: 0 0 12px; font-size: 15px; line-height: 24px; }
.dashboard-view .resource-card,
.dashboard-view .issue-card { overflow: hidden; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
.dashboard-view .resource-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 42px; padding: 9px 10px; border-bottom: 1px solid rgb(8 24 41 / 6%); background: rgb(8 24 41 / 2%); }
.dashboard-view .resource-head strong,
.dashboard-view .issue-head strong { font-size: 12px; line-height: 20px; }
.dashboard-view .mini-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border: 0; border-radius: 13px; color: #009fe3; background: rgb(0 159 227 / 8%); font-size: 10px; white-space: nowrap; }
.dashboard-view .mini-pill.green { color: var(--green, #28bd6b); background: rgb(40 189 107 / 8%); }
.dashboard-view .mini-pill.yellow { color: var(--yellow, #f6b714); background: rgb(246 183 20 / 8%); }
.dashboard-view .mini-pill .dot { width: 5px; height: 5px; margin: 0; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
.dashboard-view .resource-details { display: grid; gap: 6px; padding: 9px 10px; }
.dashboard-view .detail-row { display: grid; grid-template-columns: 52px 1fr; gap: 8px; color: var(--ink); font-size: 11px; line-height: 16px; }
.dashboard-view .detail-label { color: #92999f; }
.dashboard-view .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.dashboard-view .panel-heading h2 { margin: 0 0 12px; }
.dashboard-view .issue-card { display: flex; align-items: center; min-height: 62px; padding: 10px; }
.dashboard-view .issue-head { display: flex; align-items: flex-start; gap: 12px; }
.dashboard-view .issue-check { display: grid; place-items: center; width: 20px; height: 20px; border: 2px solid rgb(8 24 41 / 12%); border-radius: 50%; flex: 0 0 auto; }
.dashboard-view .issue-card p { margin: 2px 0 0; color: rgb(8 24 41 / 48%); font-size: 11px; line-height: 16px; }
.dashboard-view .fleet-map-state { z-index: 6; }
@media (max-width: 760px) {
  .dashboard-view .fleet-map-image { min-width: 720px; }
  .dashboard-view .fleet-route-layer { min-width: 672px; }
}
</style>
