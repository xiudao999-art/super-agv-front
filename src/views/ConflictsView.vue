<script setup>
import { computed, onUnmounted, ref } from 'vue'

const defaultStart = '2026-08-26T09:00'
const defaultEnd = '2026-08-26T09:40'
const rangeStart = ref(defaultStart)
const rangeEnd = ref(defaultEnd)
const selectedIds = ref([])
const collapsed = ref(false)
const scheduled = ref(false)
const draggingId = ref('')
const dragOverId = ref('')
const markerRatio = ref(.3)
const toastMessage = ref('')
let toastTimer

const orders = [
  { id: 'ORD-20260826-001', agv: 'AGV-01', name: '贴标物料转运', route: '智能仓储 → 贴标机台', resource: '贴标机台 / 自动门-01', priority: '紧急', tone: 'urgent' },
  { id: 'ORD-20260826-002', agv: 'AGV-02', name: '手套箱取料', route: '手套箱 → 投料工作站', resource: '手套箱 / 投料工作站', priority: '高', tone: 'high' },
  { id: 'ORD-20260826-003', agv: 'AGV-03', name: '样本跨区转运', route: '东区 → 西区', resource: '窄通道C01 / 自动门-01', priority: '普通', tone: 'normal' },
  { id: 'ORD-20260826-004', agv: 'AGV-04', name: '跨层物料转运', route: '1F → 2F', resource: '电梯-01W / 窄通道C01', priority: '高', tone: 'high' },
  { id: 'ORD-20260826-005', agv: 'AGV-05', name: '反应样本投料', route: '缓存区 → 投料工作站', resource: '投料工作站 / 电梯-01W', priority: '普通', tone: 'normal' },
  { id: 'ORD-20260826-006', agv: 'AGV-06', name: '待检样本转运', route: '东区 → 西区', resource: '窄通道C01 / 自动门-01', priority: '低', tone: 'low' },
]

const timelineRows = [
  { agv: 'AGV-01', tasks: [{ state: 'released', start: .4, span: 1.15, title: '贴标仪器', sub: '取料' }, { state: 'reserved', start: 2.35, span: 1.45, title: '贴标机台·放料位01', sub: '取料' }, { state: 'queued conflict', start: 3.82, span: .92, title: '自动门-01', sub: '取料' }] },
  { agv: 'AGV-02', tasks: [{ state: 'running', start: 5.65, span: 1.15, title: '手套箱', sub: '取料' }, { state: 'queued', start: 6.8, span: 1.05, title: '投料工作站', sub: '取料' }] },
  { agv: 'AGV-03', tasks: [{ state: 'reserved', start: 3.7, span: 1.02, title: '窄通道C01', sub: '东 → 西' }, { state: 'queued', start: 4.88, span: .92, title: '自动门-01', sub: '西 → 东' }] },
  { agv: 'AGV-04', tasks: [{ state: 'reserved', start: 3.35, span: 1.05, title: '电梯-01W', sub: '开门并通过' }, { state: 'queued', start: 4.4, span: 1.18, title: '窄通道C01', sub: '等待门区释放' }] },
  { agv: 'AGV-05', tasks: [{ state: 'reserved', start: 5.55, span: 1.05, title: '投料工作站', sub: '1F → 2F' }, { state: 'blocked', start: 7.28, span: 1.05, title: '电梯离线', sub: '通信异常' }] },
  { agv: 'AGV-06', tasks: [{ state: 'reserved', start: 1.2, span: 1.02, title: '窄通道C01', sub: '东 → 西' }, { state: 'queued', start: 2.28, span: .92, title: '自动门-01', sub: '西 → 东' }] },
]

const selectedOrders = computed(() => selectedIds.value.map((id) => orders.find((item) => item.id === id)).filter(Boolean))
const allSelected = computed(() => selectedIds.value.length === orders.length)
const partlySelected = computed(() => selectedIds.value.length > 0 && !allSelected.value)
const scheduleState = computed(() => scheduled.value ? `已重新排程 · ${selectedIds.value.length} 个订单` : selectedIds.value.length >= 2 ? `已选择 ${selectedIds.value.length} 个订单` : selectedIds.value.length ? '还需选择 1 个订单' : '等待选择订单')
const axis = computed(() => {
  const start = new Date(rangeStart.value)
  const end = new Date(rangeEnd.value)
  const duration = end - start
  if (!Number.isFinite(duration) || duration <= 0) return []
  const count = Math.min(13, Math.max(2, Math.floor(duration / 300000) + 1))
  return Array.from({ length: count }, (_, index) => formatTime(new Date(start.getTime() + duration / (count - 1) * index)))
})
const markerLabel = computed(() => {
  const start = new Date(rangeStart.value)
  const end = new Date(rangeEnd.value)
  if (!Number.isFinite(end - start) || end <= start) return '09:12'
  return formatTime(new Date(start.getTime() + (end - start) * markerRatio.value))
})
const timelineResult = computed(() => scheduled.value ? `订单排程顺序：${selectedOrders.value.map((item) => item.agv).join(' → ')}` : '当前按系统默认优先级展示')

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value)
}
function showToast(message) {
  toastMessage.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2200)
}
function selectOrder(id, checked) {
  selectedIds.value = checked ? [...selectedIds.value, id].filter((item, index, list) => list.indexOf(item) === index) : selectedIds.value.filter((item) => item !== id)
  scheduled.value = false
}
function selectAll(event) {
  selectedIds.value = event.target.checked ? orders.map((item) => item.id) : []
  scheduled.value = false
}
function clearSelected() {
  selectedIds.value = []
  scheduled.value = false
  showToast('已清空选中订单')
}
function move(id, direction) {
  const index = selectedIds.value.indexOf(id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= selectedIds.value.length) return
  const next = [...selectedIds.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  selectedIds.value = next
  scheduled.value = false
}
function dropOrder(targetId, event) {
  event.preventDefault()
  if (!draggingId.value || draggingId.value === targetId) return
  const next = [...selectedIds.value]
  const fromIndex = next.indexOf(draggingId.value)
  const targetIndex = next.indexOf(targetId)
  const rect = event.currentTarget.getBoundingClientRect()
  const insertAfter = event.clientY > rect.top + rect.height / 2
  next.splice(fromIndex, 1)
  let insertIndex = targetIndex + (insertAfter ? 1 : 0)
  if (fromIndex < insertIndex) insertIndex -= 1
  next.splice(insertIndex, 0, draggingId.value)
  selectedIds.value = next
  draggingId.value = ''
  dragOverId.value = ''
  scheduled.value = false
}
function reschedule() {
  if (selectedIds.value.length < 2) return showToast('请至少选择 2 个订单后再排程')
  scheduled.value = true
  showToast('已按当前优先级重新生成 AGV 时序')
}
function search() {
  const start = new Date(rangeStart.value)
  const end = new Date(rangeEnd.value)
  if (!Number.isFinite(end - start) || end <= start) return showToast('结束时间必须晚于开始时间')
  if (end - start > 12 * 60 * 60 * 1000) return showToast('时间范围最多选择 12 小时')
  markerRatio.value = .3
  showToast('时间轴已切换到所选时间范围')
}
function reset() {
  rangeStart.value = defaultStart
  rangeEnd.value = defaultEnd
  selectedIds.value = []
  scheduled.value = false
  markerRatio.value = .3
  showToast('时间范围和订单排程已重置')
}
function locateTime(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const left = rect.left + 112
  if (event.clientX < left) return
  markerRatio.value = Math.max(0, Math.min(1, (event.clientX - left) / (rect.right - left)))
}
function taskStyle(row, task) {
  let start = task.start
  if (scheduled.value) {
    const index = selectedOrders.value.findIndex((order) => order.agv === row.agv)
    if (index >= 0) start = Math.min(10.7, [.45, 1.75, 3.05, 4.35, 5.65, 6.95][index] + task.start - Math.min(...row.tasks.map((item) => item.start)))
  }
  return { '--start': start, '--span': task.span }
}

onUnmounted(() => window.clearTimeout(toastTimer))
</script>

<template>
  <div class="conflicts-view">
    <header class="page-head"><div><h1>多 AGV 冲突节点排程</h1><p>只编排会争抢同一物理资源的关键节点，普通动作由流程正常执行</p></div></header>
    <main class="page-canvas conflict-page">
      <section class="schedule-overview" aria-label="排程规则说明"><article class="overview-card resource-card"><h2>进入排程的互斥资源</h2><div class="resource-tags"><span>取料位/放料位</span><span>窄通道/交叉口</span><span>自动门</span><span>电梯</span><span>共享充电桩</span><span>单容量机台交互位</span><span class="muted">普通动作不排程</span></div></article></section>

      <section class="schedule-filters" aria-label="冲突排程筛选">
        <label class="schedule-field schedule-range-field"><span>时间范围</span><span class="range-inputs"><input v-model="rangeStart" type="datetime-local" aria-label="开始时间"><i>至</i><input v-model="rangeEnd" type="datetime-local" :min="rangeStart" aria-label="结束时间"></span></label>
        <div class="filter-actions"><button class="schedule-btn" type="button" @click="reset"><img src="/assets/list-icons/refresh.svg" alt="">重置</button><button class="schedule-btn primary" type="button" @click="search"><img src="/assets/list-icons/search.svg" alt="">搜索</button></div>
      </section>

      <section :class="['order-schedule-card', { collapsed }]" aria-labelledby="orderScheduleTitle">
        <header class="order-schedule-head"><div><h2 id="orderScheduleTitle">订单优先级排程</h2><p>勾选至少 2 个订单，在右侧调整顺序后重新计算互斥资源的占用时序</p></div><div class="order-schedule-head-actions"><span :class="['schedule-state', { ready: selectedIds.length >= 2 && !scheduled, done: scheduled }]">{{ scheduleState }}</span><button class="collapse-schedule" type="button" :aria-expanded="!collapsed" @click="collapsed = !collapsed"><span>{{ collapsed ? '展开' : '收起' }}</span><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg></button></div></header>
        <div v-show="!collapsed" class="order-schedule-body"><div class="order-schedule-workspace">
          <div class="order-pool"><div class="order-table-head"><label><input type="checkbox" :checked="allSelected" :indeterminate.prop="partlySelected" @change="selectAll"><span>全选</span></label><span>订单 / 执行 AGV</span><span>主要冲突资源</span><span>业务优先级</span></div><div class="order-rows">
            <label v-for="order in orders" :key="order.id" :class="['order-row', { selected: selectedIds.includes(order.id) }]">
              <input type="checkbox" :checked="selectedIds.includes(order.id)" :aria-label="`选择订单 ${order.id}`" @change="selectOrder(order.id, $event.target.checked)"><span class="order-main"><strong>{{ order.id }}</strong><small>{{ order.agv }} · {{ order.name }} · {{ order.route }}</small></span><span class="order-resource">{{ order.resource }}</span><span :class="['order-priority', order.tone]">{{ order.priority }}</span>
            </label>
          </div></div>
          <aside class="priority-queue" aria-label="已选订单排程顺序"><header><div><h3>已选订单优先级</h3><p>拖拽或使用上下按钮调整，序号越小越先占用资源</p></div><strong>{{ selectedIds.length }} 个</strong></header><div class="priority-content"><div v-if="!selectedIds.length" class="priority-empty"><span>尚未选择订单</span><small>从左侧勾选需要参与重新排程的订单</small></div><ol v-else class="priority-list"><li v-for="(order, index) in selectedOrders" :key="order.id" draggable="true" :class="{ dragging: draggingId === order.id, 'drag-over': dragOverId === order.id }" @dragstart="draggingId = order.id" @dragend="draggingId = ''; dragOverId = ''" @dragover.prevent="dragOverId = order.id" @drop="dropOrder(order.id, $event)"><span class="drag-handle" title="拖拽调整顺序">⠿</span><b>{{ index + 1 }}</b><span><strong>{{ order.id }}</strong><small>{{ order.agv }} · {{ order.name }}</small></span><div class="priority-move-actions"><button type="button" :disabled="index === 0" :aria-label="`上移 ${order.id}`" @click="move(order.id, 'up')"><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6" /></svg></button><button type="button" :disabled="index === selectedOrders.length - 1" :aria-label="`下移 ${order.id}`" @click="move(order.id, 'down')"><svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6" /></svg></button></div></li></ol></div><footer><button class="schedule-btn" type="button" :disabled="!selectedIds.length" @click="clearSelected">清空</button><button class="schedule-btn primary" type="button" :disabled="selectedIds.length < 2" @click="reschedule">按当前顺序重新排程</button></footer></aside>
        </div></div>
      </section>

      <section v-if="scheduled" class="timeline-card">
        <header class="timeline-head"><div><h2>AGV 时序表</h2><p>{{ timelineResult }}</p></div><div class="timeline-legend" aria-label="排程状态图例"><span class="running">执行中</span><span class="reserved">已预约</span><span class="queued">排队</span><span class="released">已释放</span><span class="blocked">异常阻塞</span></div></header>
        <div class="resource-strip" aria-label="互斥资源"><span>贴标仪器</span><span>贴标机台·放料位01</span><span>窄通道C01</span><span>自动门-01</span><span>电梯-01W</span><span>手套箱</span><span>投料工作站</span><span>反应取样工作站</span></div>
        <div class="timeline-scroll"><div class="timeline" :style="{ '--time-columns': axis.length, '--time-step': `${100 / axis.length}%`, '--now-position': markerRatio, minWidth: `${Math.max(920, 112 + axis.length * 88)}px` }"><div class="time-axis" @click="locateTime"><span class="axis-spacer" /><button v-for="time in axis" :key="time" class="time-cell" type="button">{{ time }}</button></div><div class="now-line"><span>{{ markerLabel }}</span></div><div v-for="row in timelineRows" :key="row.agv" :class="['timeline-row', { rescheduled: selectedOrders.some(order => order.agv === row.agv) }]" :data-agv="row.agv"><strong>{{ row.agv }}</strong><div class="timeline-track"><button v-for="task in row.tasks" :key="`${task.title}-${task.start}`" :class="['task', task.state, { 'is-rescheduled': selectedOrders.some(order => order.agv === row.agv) }]" :style="taskStyle(row, task)" type="button" tabindex="-1" aria-disabled="true"><b>{{ task.title }}</b><small>{{ task.sub }}</small></button></div></div></div></div>
      </section>
    </main>
    <div :class="['toast', { show: toastMessage }]" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
:root{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color-scheme:light}.conflict-page{display:grid;gap:16px;padding:20px}.schedule-overview{display:grid;grid-template-columns:minmax(0,1.17fr) minmax(450px,.93fr);gap:16px}.overview-card,.schedule-filters,.timeline-card{border-radius:12px;background:#fff}.overview-card{min-height:100px;padding:18px 20px}.overview-card h2,.timeline-head h2{margin:0;color:var(--ink);font-size:15px}.resource-tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}.resource-tags span{display:inline-flex;align-items:center;min-height:32px;padding:0 11px;border:1px solid #b9dbf8;border-radius:5px;color:#1677d2;background:#edf7ff;font-size:12px;white-space:nowrap}.resource-tags .muted{border-color:#e1e5e8;color:#7c8792;background:#f6f7f8}.priority-steps{display:flex;align-items:center;gap:14px;margin:17px 0 0;padding:0;list-style:none}.priority-steps li{position:relative;display:flex;align-items:center;gap:8px;color:#354354;font-size:12px;white-space:nowrap}.priority-steps li:not(:last-child){padding-right:21px}.priority-steps li:not(:last-child)::after{position:absolute;right:0;color:#344354;font-size:25px;font-weight:300;content:"›"}.priority-steps b{width:30px;height:30px;display:grid;place-items:center;border-radius:7px;color:#1677d2;background:#e9f5ff;font-size:16px}.schedule-filters{display:grid;grid-template-columns:minmax(520px,760px) auto;justify-content:space-between;gap:16px;padding:14px 16px}.schedule-field{min-height:42px;display:flex;align-items:center;gap:12px;padding:0;border:0;background:transparent}.schedule-field>span:first-child{flex:0 0 auto;color:#8a949e;font-size:12px}.range-inputs{min-width:0;display:flex;align-items:center;gap:9px}.range-inputs input{width:210px;height:36px;padding:0 10px;border:1px solid #d9dfe4;border-radius:7px;outline:0;color:#2c3b4c;background:#fff;font-size:12px}.range-inputs input:focus{border-color:#1677d2;box-shadow:0 0 0 2px rgba(22,119,210,.1)}.range-inputs i{color:#8a949e;font-size:12px;font-style:normal}.filter-actions{display:flex;align-items:center;gap:9px}.schedule-btn{height:42px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 17px;border:0;border-radius:8px;background:#f1f3f5;font-size:13px;font-weight:650;cursor:pointer}.schedule-btn.primary{color:#fff;background:#1677d2}.schedule-btn img{width:17px;height:17px}.schedule-btn.primary img{filter:brightness(0) invert(1)}.timeline-card{min-width:0;padding:20px}.timeline-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.timeline-legend{display:flex;align-items:center;justify-content:center;gap:20px;color:#77828e;font-size:12px}.timeline-legend span{display:flex;align-items:center;gap:7px}.timeline-legend span::before{width:10px;height:10px;border-radius:50%;background:var(--legend-color);content:""}.timeline-legend .running{--legend-color:#1677d2}.timeline-legend .reserved{--legend-color:#24ad70}.timeline-legend .queued{--legend-color:#f0b41b}.timeline-legend .released{--legend-color:#8b96a1}.timeline-legend .blocked{--legend-color:#ea4f45}.resource-strip{display:grid;grid-template-columns:repeat(8,minmax(150px,1fr));gap:12px;margin-bottom:15px;overflow-x:auto}.resource-strip>span{min-height:52px;display:grid;place-items:center;padding:8px 12px;border:1px solid #e3e8ec;border-radius:10px;background:#fff;color:#283647;font-size:12px;font-weight:650;white-space:nowrap}.timeline-scroll{overflow-x:auto;border-radius:8px}.timeline{--time-columns:9;--time-step:11.111111%;--now-position:.3;position:relative;min-width:920px;border:0;border-radius:8px;overflow:hidden;background:#fff}.time-axis,.timeline-row{display:grid;grid-template-columns:112px repeat(var(--time-columns),minmax(88px,1fr))}.time-axis{height:50px;color:#8b96a1;background:#f8f9fa;font-size:12px}.axis-spacer,.time-cell{display:grid;place-items:center;border:0;border-right:1px solid #eff2f4}.time-cell{color:#8b96a1;background:transparent;font-size:12px;cursor:pointer}.time-cell:hover,.time-cell.active{color:#1677d2;background:#edf7ff}.time-cell:last-child{border-right:0}.timeline-row{min-height:66px;border-top:1px solid #edf0f2}.timeline-row>strong{display:flex;align-items:center;padding-left:16px;border-right:1px solid #edf0f2;color:#253447;font-size:13px}.timeline-track{position:relative;grid-column:2/-1;background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--time-step) - 1px),#f0f2f4 calc(var(--time-step) - 1px),#f0f2f4 var(--time-step))}.task{--task-color:#8b96a1;position:absolute;top:10px;left:calc(var(--start)*8.333333%);width:calc(var(--span)*8.333333%);min-width:78px;height:46px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:5px 10px;overflow:hidden;border:2px solid transparent;color:#fff;background:var(--task-color);font-size:11px;text-align:left;cursor:pointer}.task b,.task small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.task b{font-size:11px}.task small{margin-top:3px;color:inherit;opacity:.9}.task.running{--task-color:#1677d2}.task.reserved{--task-color:#198d61}.task.queued{--task-color:#f5b619;color:#26313d}.task.released{--task-color:#8c97a2}.task.blocked{--task-color:#ef4b43;color:#202b35}.task.conflict{border-color:#273645;box-shadow:0 0 0 1px rgba(255,255,255,.85)}.task:hover,.task.selected{z-index:3;outline:3px solid rgba(22,119,210,.2);transform:translateY(-1px)}.now-line{position:absolute;top:0;bottom:0;left:calc(112px + (100% - 112px)*var(--now-position));z-index:4;width:1px;background:#ef5b52;pointer-events:none}.now-line span{position:absolute;top:30px;left:8px;padding:3px 6px;color:#fff;background:#ef5b52;font-size:10px;font-weight:700}.timeline-selection{min-height:38px;display:flex;align-items:center;gap:12px;margin-top:12px;padding:0 13px;border-radius:7px;color:#687482;background:#f7f9fa;font-size:12px}.timeline-selection span{color:#8c96a0}.timeline-selection strong{color:#314052;font-weight:600}.modal-overlay,.drawer-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s}.modal-overlay.open,.drawer-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(620px,calc(100vw - 32px));padding:24px;border-radius:10px;background:#fff}.modal-card h2{margin:0 0 18px;font-size:18px}.status-list{display:grid;gap:10px}.status-item{padding:14px;border:1px solid #e5e9ec;border-radius:8px}.status-item p{margin:6px 0 0;color:#76818b;font-size:12px}.modal-actions{display:flex;justify-content:flex-end;margin-top:20px}.modal-close{height:34px;padding:0 16px;border:1px solid #d9dfe4;border-radius:7px;background:#fff;cursor:pointer}.drawer{position:absolute;top:0;right:0;width:min(420px,92vw);height:100%;padding:24px;background:#fff;transform:translateX(100%);transition:transform .22s}.drawer-overlay.open .drawer{transform:translateX(0)}.drawer h2{margin:0}.drawer header p{color:#76818b}.alert-feed{display:grid;gap:12px;margin-top:20px}.alert-card{padding:14px;border:1px solid #e5e9ec;border-radius:8px}.alert-card p{margin:7px 0 0;color:#76818b;font-size:12px}.drawer footer{position:absolute;right:24px;bottom:24px;left:24px}.drawer footer a{height:40px;display:grid;place-items:center;border-radius:8px;color:#fff;background:#1677d2;text-decoration:none}.toast{position:fixed;right:24px;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:#263747;box-shadow:0 8px 24px rgba(23,42,60,.2);opacity:0;transform:translateY(10px);transition:.2s;pointer-events:none}.toast.show{opacity:1;transform:translateY(0)}
@media(max-width:1440px){.schedule-overview{grid-template-columns:1fr}.schedule-filters{grid-template-columns:minmax(0,1fr) auto}.priority-steps{flex-wrap:wrap}.priority-steps li:not(:last-child)::after{display:none}}
@media(max-width:760px){.conflict-page{gap:12px;padding:12px}.overview-card,.timeline-card{padding:16px}.schedule-filters{grid-template-columns:1fr;padding:12px}.schedule-range-field{align-items:flex-start;flex-direction:column}.range-inputs{width:100%;align-items:stretch;flex-direction:column}.range-inputs input{width:100%}.range-inputs i{text-align:center}.filter-actions{grid-column:auto}.schedule-btn{flex:1}.timeline-head{align-items:flex-start;flex-direction:column}.timeline-legend{flex-wrap:wrap;justify-content:flex-start;gap:10px 16px}.resource-strip{grid-template-columns:repeat(8,150px)}.timeline-selection{align-items:flex-start;flex-direction:column;gap:4px;padding:10px 12px}}
.task{cursor:default;pointer-events:none}.task:hover{outline:0;transform:none}
.time-axis,.time-cell{cursor:crosshair}

.order-schedule-card{min-width:0;padding:20px;border-radius:12px;background:#fff}.order-schedule-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:16px}.order-schedule-head h2{margin:0;color:#263747;font-size:15px}.order-schedule-head p{margin:6px 0 0;color:#818c97;font-size:12px}.schedule-state{min-height:28px;display:inline-flex;align-items:center;padding:0 10px;border-radius:6px;color:#7a8691;background:#f1f3f5;font-size:11px;font-weight:650;white-space:nowrap}.schedule-state.ready{color:#1677d2;background:#edf7ff}.schedule-state.done{color:#16885e;background:#edf9f4}.order-schedule-workspace{display:grid;grid-template-columns:minmax(650px,1.35fr) minmax(360px,.75fr);gap:16px}.order-pool,.priority-queue{min-width:0;border:1px solid #e5eaee;border-radius:10px;overflow:hidden;background:#fff}.order-table-head{min-height:42px;display:grid;grid-template-columns:100px minmax(240px,1.35fr) minmax(170px,.9fr) 86px;align-items:center;gap:12px;padding:0 14px;color:#7f8a95;background:#f7f9fa;font-size:11px}.order-table-head label{display:flex;align-items:center;gap:7px;cursor:pointer}.order-table-head input,.order-row input{width:15px;height:15px;margin:0;accent-color:#1677d2}.order-rows{display:grid}.order-row{position:relative;min-height:66px;display:grid;grid-template-columns:28px minmax(240px,1.35fr) minmax(170px,.9fr) 86px 42px;align-items:center;gap:12px;padding:9px 14px;border-top:1px solid #edf0f2;color:#263747;background:#fff;cursor:pointer}.order-row:hover{background:#f9fcff}.order-row.selected{background:#f3f9fe}.order-row.selected::before{position:absolute;top:0;bottom:0;left:0;width:3px;background:#1677d2;content:""}.order-main strong,.order-main small{display:block}.order-main strong{font-size:12px}.order-main small{max-width:100%;margin-top:5px;overflow:hidden;color:#7f8a95;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.order-resource{color:#536170;font-size:11px}.order-priority{width:52px;min-height:24px;display:inline-grid;place-items:center;border-radius:5px;font-size:11px;font-weight:700}.order-priority.urgent{color:#d94740;background:#fff0ef}.order-priority.high{color:#c07800;background:#fff7e6}.order-priority.normal{color:#1677d2;background:#edf7ff}.order-priority.low{color:#697580;background:#f1f3f5}.selected-rank{width:34px;height:26px;display:grid;place-items:center;border-radius:6px;color:#fff;background:#1677d2;font-size:11px}.priority-queue{display:grid;grid-template-rows:auto 1fr auto}.priority-queue>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid #edf0f2}.priority-queue h3{margin:0;color:#263747;font-size:13px}.priority-queue header p{margin:5px 0 0;color:#818c97;font-size:10px;line-height:1.45}.priority-queue header>strong{min-width:46px;color:#1677d2;font-size:12px;text-align:right}.priority-empty{min-height:228px;display:grid;align-content:center;justify-items:center;padding:24px;color:#89949f;text-align:center}.priority-empty span{font-size:12px;font-weight:650}.priority-empty small{margin-top:7px;font-size:10px}.priority-list{max-height:302px;display:grid;align-content:start;gap:7px;margin:0;padding:10px;overflow-y:auto;list-style:none}.priority-list li{display:grid;grid-template-columns:18px 28px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:52px;padding:7px 8px;border:1px solid #e1e7eb;border-radius:8px;background:#fff;cursor:grab;transition:border-color .15s,box-shadow .15s,opacity .15s}.priority-list li:hover{border-color:#b8d8f2}.priority-list li.dragging{opacity:.45}.priority-list li.drag-over{border-color:#1677d2;box-shadow:0 0 0 2px rgba(22,119,210,.12)}.drag-handle{color:#9ba5ae;font-size:18px;line-height:1}.priority-list li>b{width:27px;height:27px;display:grid;place-items:center;border-radius:6px;color:#1677d2;background:#e9f5ff;font-size:12px}.priority-list li>span strong,.priority-list li>span small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.priority-list li>span strong{font-size:11px}.priority-list li>span small{margin-top:4px;color:#838e98;font-size:10px}.priority-move-actions{display:flex;gap:4px}.priority-move-actions button{width:28px;height:28px;display:grid;place-items:center;padding:0;border:1px solid #dce3e8;border-radius:6px;color:#536170;background:#fff;cursor:pointer}.priority-move-actions button:hover:not(:disabled){border-color:#1677d2;color:#1677d2;background:#edf7ff}.priority-move-actions button:disabled{cursor:not-allowed;opacity:.35}.priority-move-actions svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.priority-queue>footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 14px;border-top:1px solid #edf0f2;background:#fafbfc}.priority-queue .schedule-btn{height:36px;padding:0 13px;font-size:11px}.schedule-btn:disabled{cursor:not-allowed;opacity:.45}.timeline-head>div:first-child p{margin:6px 0 0;color:#7e8994;font-size:11px}.timeline-row.rescheduled{background:#fbfdff}.timeline-row.rescheduled>strong{position:relative;color:#1677d2;background:#f2f8fd}.timeline-row.rescheduled>strong::after{position:absolute;right:8px;min-width:25px;height:21px;display:grid;place-items:center;border-radius:5px;color:#fff;background:#1677d2;content:"P" attr(data-priority);font-size:9px}.task{transition:left .32s ease,outline-color .2s}.task.is-rescheduled{box-shadow:0 0 0 3px rgba(22,119,210,.12)}

@media(max-width:1180px){.order-schedule-workspace{grid-template-columns:1fr}.priority-list{max-height:none}.priority-empty{min-height:120px}}
@media(max-width:760px){.order-schedule-card{padding:16px}.order-schedule-head{align-items:flex-start;flex-direction:column}.order-pool{overflow-x:auto}.order-table-head{min-width:760px}.order-row{min-width:760px}.priority-queue>footer{flex-direction:column}.priority-queue .schedule-btn{width:100%}}

.order-schedule-head-actions{display:flex;align-items:center;gap:9px}.collapse-schedule{height:30px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border:1px solid #dbe2e7;border-radius:7px;color:#536170;background:#fff;font-size:11px;font-weight:650;cursor:pointer}.collapse-schedule:hover{border-color:#1677d2;color:#1677d2;background:#f7fbff}.collapse-schedule svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}.collapse-schedule[aria-expanded="false"] svg{transform:rotate(180deg)}.order-schedule-body[hidden]{display:none}.order-schedule-card.collapsed .order-schedule-head{margin-bottom:0}.priority-content{min-height:0;overflow-y:auto}.priority-content>.priority-list{overflow:visible}.conflict-priority-editor{border-top:1px solid #edf0f2;background:#fbfcfd}.conflict-priority-editor>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 15px 8px}.conflict-priority-editor h3{margin:0;color:#263747;font-size:13px}.conflict-priority-editor header p{margin:5px 0 0;color:#818c97;font-size:10px}.conflict-priority-editor header>span{color:#7f8a95;font-size:10px}.conflict-priority-list{display:grid;gap:7px;margin:0;padding:4px 10px 10px;list-style:none}.conflict-priority-list li{display:grid;grid-template-columns:18px 28px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:50px;padding:7px 8px;border:1px solid #e1e7eb;border-radius:8px;background:#fff;cursor:grab;transition:border-color .15s,box-shadow .15s,opacity .15s}.conflict-priority-list li:hover{border-color:#b8d8f2}.conflict-priority-list li.dragging{opacity:.45}.conflict-priority-list li.drag-over{border-color:#1677d2;box-shadow:0 0 0 2px rgba(22,119,210,.12)}.conflict-priority-list li>b{width:27px;height:27px;display:grid;place-items:center;border-radius:6px;color:#7c5b17;background:#fff5d9;font-size:12px}.conflict-priority-list li>span strong,.conflict-priority-list li>span small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conflict-priority-list li>span strong{font-size:11px}.conflict-priority-list li>span small{margin-top:4px;color:#838e98;font-size:10px}

@media(max-width:760px){.order-schedule-head-actions{width:100%;justify-content:space-between}}
</style>
<style scoped>
.conflicts-view{min-height:100%;color:#122235;background:#f3f6f8;--ink:#122235}.conflicts-view .page-head{min-height:92px;display:flex;align-items:center;padding:16px 20px;background:#fff}.conflicts-view .page-head h1{margin:0 0 8px;color:#122235;font-size:20px;line-height:26px}.conflicts-view .page-head p{margin:0;color:#596675;font-size:13px;line-height:20.15px}.conflicts-view svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.conflicts-view .schedule-overview{grid-template-columns:1fr;margin:0}.conflicts-view .overview-card{border:0;cursor:default;transition:none}.conflicts-view .schedule-filters{align-items:normal;margin:0}.conflicts-view .order-schedule-card{padding:20px;overflow:visible}.conflicts-view .order-schedule-head{align-items:flex-start;margin-bottom:16px;padding:0;border:0}.conflicts-view .order-schedule-workspace{grid-template-columns:minmax(650px,1.35fr) minmax(360px,.75fr);min-height:0}.conflicts-view .order-pool{padding:0;border-right:1px solid #e5eaee}.conflicts-view .priority-queue{position:static;padding:0;background:#fff}.conflicts-view .order-row{grid-template-columns:28px minmax(240px,1.35fr) minmax(170px,.9fr) 86px;border:0;border-top:1px solid #edf0f2;border-radius:0}.conflicts-view .order-main strong{color:#263747}.conflicts-view .timeline-card{margin:0;padding:20px}.conflicts-view .resource-strip{margin:0 0 15px}.conflicts-view .timeline-row{gap:0}.conflicts-view .timeline-track{height:auto;border:0;border-radius:0}.conflicts-view .timeline-row.rescheduled>strong::after{display:none}@media(max-width:760px){.conflicts-view .page-head{min-height:75px;padding:14px}.conflicts-view .page-head h1{margin-bottom:6px;font-size:18px;line-height:1.25}.conflicts-view .page-head p{font-size:12px;line-height:normal}.conflicts-view .order-schedule-card{padding:16px}.conflicts-view .order-pool{overflow-x:auto}}
</style>
<style scoped>
@media(max-width:1180px){.conflicts-view .order-schedule-workspace{grid-template-columns:minmax(0,1fr)}}
</style>
