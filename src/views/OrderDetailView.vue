<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderDetail, listResource } from '../api/agv'

const route = useRoute()
const router = useRouter()
const orderId = ref(Number(route.query.id) || null)
const pendingOrderId = ref(orderId.value)
const initialOrderId = ref(orderId.value)
const selectedTaskId = ref(null)
const orders = ref([])
const detail = ref(null)
const loading = ref(false)
const detailError = ref('')
const toastMessage = ref('')
let toastTimer

const statusMeta = {
  QUEUED: { label: '排队中', className: 'waiting' },
  RUNNING: { label: '执行中', className: 'executing' },
  SUCCEEDED: { label: '已完成', className: 'completed' },
  FAILED: { label: '失败', className: 'failed' },
  CANCELLED: { label: '已取消', className: 'cancelled' },
  PENDING: { label: '待执行', className: 'waiting' },
  EXECUTING: { label: '执行中', className: 'executing' },
  COMPLETED: { label: '已完成', className: 'completed' },
}

const order = computed(() => detail.value?.order || orders.value.find((item) => String(item.id) === String(orderId.value)) || {})
const tasks = computed(() => [...(detail.value?.tasks || [])].sort((a, b) => (Number(a.taskSeq) || 0) - (Number(b.taskSeq) || 0)))
const selectedTask = computed(() => tasks.value.find((task) => String(task.id) === String(selectedTaskId.value)) || tasks.value[0] || detail.value?.currentTask || null)
const actions = computed(() => [...(detail.value?.executionConfig?.actions || [])].sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)))
const executionConfig = computed(() => detail.value?.executionConfig || {})
const summaryStatus = computed(() => statusInfo(selectedTask.value?.status || order.value.status))
const configItems = computed(() => [
  ['流程', `${executionConfig.value.flowNumber || '-'}${executionConfig.value.flowName ? ` · ${executionConfig.value.flowName}` : ''}`],
  ['流程模板', `${executionConfig.value.flowTemplateName || '-'}${executionConfig.value.flowTemplateId ? ` · #${executionConfig.value.flowTemplateId}` : ''}`],
  ['完整路径', executionConfig.value.completePath || '-'],
  ['点位配置', executionConfig.value.pointConfiguration || '-'],
  ['异常策略', executionConfig.value.failureStrategy || '-'],
])
const warningText = computed(() => detail.value?.errorCode || detail.value?.errorMessage
  ? `${detail.value?.errorCode ? `${detail.value.errorCode}：` : ''}${detail.value?.errorMessage || '订单执行异常'}`
  : '取料、放料等可能改变物理状态的动作超时后，先查询现场证据，不直接重复执行。')

function statusInfo(value) {
  return statusMeta[value] || { label: value || '-', className: 'cancelled' }
}

function showToast(message) {
  toastMessage.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2300)
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) return text.replace('T', ' ')
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text.replace('T', ' ')
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date).replaceAll('/', '-')
}

function chooseTask(task, updateUrl = true) {
  selectedTaskId.value = task?.id ?? null
  if (!updateUrl || !task) return
  router.replace({
    path: '/orders/detail',
    query: {
      id: order.value.id || orderId.value,
      order: order.value.upstreamOrderNo || order.value.systemOrderNo || '',
      task: task.taskNumber || task.id,
    },
  })
}

async function loadDetail() {
  if (!orderId.value) return
  loading.value = true
  detailError.value = ''
  detail.value = null
  try {
    const result = await getOrderDetail(orderId.value)
    if (!result?.order) throw new Error('接口未返回订单详情')
    detail.value = result
    const requested = tasks.value.find((task) => String(task.taskNumber) === String(route.query.task) || String(task.id) === String(route.query.task))
    const current = result.currentTask && tasks.value.find((task) => String(task.id) === String(result.currentTask.id))
    chooseTask(requested || current || tasks.value[0] || result.currentTask || null)
  } catch (error) {
    detailError.value = error.message
    showToast(`订单详情加载失败：${error.message}`)
  } finally {
    loading.value = false
  }
}

async function searchOrder() {
  const nextId = Number(pendingOrderId.value)
  if (!Number.isInteger(nextId) || nextId < 1) return
  orderId.value = nextId
  selectedTaskId.value = null
  await loadDetail()
}

async function resetOrder() {
  pendingOrderId.value = initialOrderId.value || orders.value[0]?.id || null
  await searchOrder()
}

async function load() {
  try {
    orders.value = await listResource('orders')
    const requested = orders.value.find((item) => String(item.id) === String(orderId.value))
      || orders.value.find((item) => [item.upstreamOrderNo, item.systemOrderNo].includes(route.query.order))
      || orders.value[0]
    orderId.value = requested?.id || null
    pendingOrderId.value = orderId.value
    initialOrderId.value = orderId.value
    if (!orderId.value) throw new Error('订单列表为空')
    await loadDetail()
  } catch (error) {
    detailError.value = error.message
    showToast(`订单列表加载失败：${error.message}`)
  }
}

onMounted(load)
onUnmounted(() => window.clearTimeout(toastTimer))
</script>

<template>
  <div class="order-task-page">
    <header class="page-head">
      <div><h1>订单任务详情</h1><p>查看订单拆分后的搬运任务与动作执行链</p></div>
      <button class="primary-btn" type="button" @click="router.push('/orders')"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg><span>返回订单列表</span></button>
    </header>

    <div class="detail-canvas">
      <section class="detail-panel">
        <div class="tabs-row"><div class="tabs" role="tablist"><router-link class="tab-btn" role="tab" aria-selected="false" to="/orders">订单列表</router-link><a class="tab-btn active" role="tab" aria-selected="true" href="#task-list">订单任务详情</a></div></div>
        <div id="task-list" class="task-list-section">
          <div class="section-heading"><h2>订单任务列表</h2><p>点击任意一行切换下方订单信息、动作链和执行配置</p></div>
          <div class="toolbar">
            <label class="field-shell"><span>选择订单</span><select v-model="pendingOrderId" aria-label="选择订单" @change="searchOrder"><option v-for="item in orders" :key="item.id" :value="item.id">{{ item.upstreamOrderNo || '-' }} / {{ item.systemOrderNo || '-' }}</option></select></label>
            <div class="toolbar-actions"><button class="filter-btn" type="button" @click="resetOrder"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7V3l-3 3a8 8 0 1 0 2 8" /></svg>重置</button><button class="filter-btn primary" type="button" @click="searchOrder"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>搜索</button></div>
          </div>
          <div class="table-wrap">
            <table class="task-table" aria-label="订单任务列表">
              <thead><tr><th>任务编号</th><th>流程编号</th><th>订单号</th><th>系统订单号</th><th>当前状态</th><th>当前步骤</th><th>下发时间</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td class="detail-loading-cell" colspan="7"><span class="detail-loading">正在加载订单详情…</span></td></tr>
                <tr v-for="task in tasks" v-else :key="task.id" :class="{ selected: String(task.id) === String(selectedTaskId) }" @click="chooseTask(task)">
                  <td>{{ task.taskNumber || '-' }}</td><td>{{ task.flowNumber || '-' }}</td><td>{{ order.upstreamOrderNo || '-' }}</td><td>{{ order.systemOrderNo || '-' }}</td><td><span :class="['status-tag', `status-${statusInfo(task.status).className}`]">{{ statusInfo(task.status).label }}</span></td><td>{{ task.currentStep || task.taskName || '-' }}</td><td>{{ formatTime(task.startedAt || task.updatedAt || order.issuedAt) }}</td>
                </tr>
                <tr v-if="!loading && !tasks.length"><td class="detail-empty" colspan="7">{{ detailError ? `订单详情加载失败：${detailError}` : '当前订单暂无任务数据' }}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-summary">{{ loading ? '正在加载…' : detailError ? '加载失败' : `共计 ${tasks.length} 条数据` }}</div>
        </div>
      </section>

      <section class="summary-grid" aria-label="订单任务摘要">
        <article class="summary-card"><div class="summary-card-label">订单号</div><strong>{{ order.upstreamOrderNo || '-' }}</strong></article>
        <article class="summary-card"><div class="summary-card-label">系统订单号</div><strong>{{ order.systemOrderNo || '-' }}</strong></article>
        <article class="summary-card"><div class="summary-card-label"><span>当前任务状态</span><span :class="['status-tag', `status-${summaryStatus.className}`, 'current-step']">{{ selectedTask?.currentStep || selectedTask?.taskName || (detailError ? '不可用' : '加载中…') }}</span></div><strong>{{ detailError ? '加载失败' : summaryStatus.label }}</strong></article>
      </section>

      <section class="lower-grid">
        <article class="card action-card">
          <div class="card-head"><div><h2>动作链详情</h2><p>查看所选任务的动作、地图、路径和关联资源</p></div><div class="card-actions"><button class="soft-btn" type="button" @click="showToast('正在查看实时调度')">查看实时调度</button><button class="soft-btn" type="button" @click="showToast('正在查看路径配置')">查看路径配置</button><button class="soft-btn" type="button" @click="showToast('正在查看关联资源')">查看关联资源</button></div></div>
          <div class="table-wrap">
            <table class="action-table" aria-label="动作链详情">
              <thead><tr><th>序号</th><th>动作名称</th><th>点位/资源</th><th>当前状态</th><th>完成证据</th></tr></thead>
              <tbody>
                <tr v-if="loading"><td class="detail-loading-cell" colspan="5"><span class="detail-loading">正在加载动作链…</span></td></tr>
                <tr v-for="action in actions" v-else :key="action.id || action.nodeId || action.sort"><td>{{ action.sort ?? action.nodeId ?? '-' }}</td><td>{{ action.nodeName || '-' }}</td><td>{{ action.nodeCode || '-' }}</td><td><span :class="['status-tag', `status-${statusInfo(action.status).className}`]">{{ statusInfo(action.status).label }}</span></td><td>{{ action.completionCriteria || action.failureStrategy || '-' }}</td></tr>
                <tr v-if="!loading && !actions.length"><td class="detail-empty" colspan="5">{{ detailError ? '暂无动作链数据' : '当前执行配置暂无动作链数据' }}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-summary">{{ loading ? '正在加载…' : `共计 ${actions.length} 条数据` }}</div>
        </article>

        <aside class="card config-card">
          <h2>本次任务执行配置</h2>
          <div class="config-list">
            <article v-if="loading" class="config-loading">正在加载执行配置…</article>
            <article v-for="item in configItems" v-else :key="item[0]" class="config-item"><strong>{{ item[0] }}</strong><p>{{ detailError && item[0] === '流程' ? detailError : item[1] }}</p></article>
          </div>
          <div :class="['warning-note', { error: detail?.errorCode || detail?.errorMessage }]">{{ warningText }}</div>
        </aside>
      </section>
    </div>
    <div :class="['toast', { show: toastMessage }]" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
:root {color-scheme:light;
      font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif;}
    *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}
    button,input,select{font:inherit} button{color:inherit} svg{display:block} [hidden]{display:none!important}
    .icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .page-head{min-height:94px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;background:#fff}.page-head h1{margin:0 0 7px;font-size:20px;line-height:1.25;letter-spacing:-.02em}.page-head p{margin:0;color:var(--muted);font-size:13px}
    .primary-btn{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 16px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650;text-decoration:none;cursor:pointer}.primary-btn:hover{background:#176fb5}
    .detail-canvas{min-height:calc(100vh - 147px);padding:20px}.detail-panel{overflow:hidden;border-radius:11px;background:#fff}.tabs-row{padding:16px;border-bottom:1px solid var(--line)}
    .tabs{width:fit-content;display:inline-flex;padding:2px;border-radius:9px;background:#f3f5f7}.tab-btn{height:34px;padding:0 15px;border:0;border-radius:8px;color:var(--ink);background:transparent;font-size:13px;text-decoration:none;display:inline-flex;align-items:center;cursor:pointer}.tab-btn.active{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(17,36,54,.08)}
    .task-list-section{padding:20px 16px 18px}.section-heading h2{margin:0 0 6px;font-size:15px}.section-heading p{margin:0;color:var(--muted);font-size:11px}.toolbar{display:grid;grid-template-columns:minmax(580px,1fr) auto;gap:14px;align-items:center;margin:17px 0 13px}
    .field-shell{min-width:0;height:42px;display:flex;align-items:center;gap:12px;padding:0 12px;border:1px solid #dfe3e6;border-radius:8px;background:#fff}.field-shell>span{flex:0 0 auto;color:#959ba2;font-size:12px}.field-shell select{min-width:0;flex:1;height:100%;border:0;outline:0;color:var(--ink);background:transparent;font-size:13px;cursor:pointer}
    .toolbar-actions{display:flex;gap:10px}.filter-btn{height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:0;border-radius:8px;background:#f3f5f7;font-size:13px;font-weight:650;cursor:pointer}.filter-btn.primary{min-width:74px;color:#fff;background:var(--blue)}.filter-btn:hover{filter:brightness(.97)}
    .table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;height:52px;text-align:left;white-space:nowrap;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;font-size:12px;font-weight:700}tbody tr{cursor:pointer;transition:background .15s ease}tbody tr:hover,tbody tr.selected{background:#f6fbff}.task-table{min-width:980px}.action-table{min-width:780px}
    .status-tag{min-width:61px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:4px 9px;border:1px solid currentColor;border-radius:16px;font-size:11px;line-height:1}.status-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.status-executing{color:#2182d1;border-color:#cbe3f7;background:#f2f8fd}.status-waiting{color:#f2b719;border-color:#f8e8b4;background:#fffaf0}.status-completed{color:#2fbd78;border-color:#d1efdf;background:#f4fcf7}
    .table-summary{margin-top:13px;color:var(--muted);font-size:11px}
    .summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px}.summary-card{min-height:108px;padding:18px;border-radius:11px;background:#fff}.summary-card-label{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:12px}.summary-card strong{display:block;margin-top:22px;font-size:25px;letter-spacing:.01em}.summary-card .current-step{margin-top:0;color:var(--blue-strong);font-size:11px}
    .lower-grid{display:grid;grid-template-columns:minmax(0,1.95fr) minmax(300px,.95fr);gap:16px;margin-top:16px}.card{border-radius:11px;background:#fff}.action-card{padding:18px 16px}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.card-head h2,.config-card>h2{margin:0 0 6px;font-size:15px}.card-head p{margin:0;color:var(--muted);font-size:11px}.card-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.soft-btn{height:36px;padding:0 14px;border:0;border-radius:8px;background:#f3f5f7;font-size:12px;font-weight:650;cursor:pointer}.soft-btn:hover{background:#eaf0f5}
    .config-card{padding:18px 16px}.config-list{display:grid;gap:12px;margin-top:18px}.config-item{padding:15px;border:1px solid #e8eaed;border-radius:9px}.config-item strong{display:block;margin-bottom:10px;font-size:12px}.config-item p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}.warning-note{margin-top:14px;padding:16px;border-radius:9px;color:var(--orange);background:#fff4ed;font-size:12px;font-weight:650;line-height:1.65}
    .modal-overlay,.alert-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s ease}.modal-overlay.open,.alert-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.status-modal{width:min(600px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:24px;border-radius:16px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .18s ease}.modal-overlay.open .status-modal{transform:none}.status-modal h2{margin:0 0 18px;font-size:20px}.status-list{display:grid;gap:12px}.status-item{padding:15px;border-radius:7px;background:#fff}.status-item strong{display:block;margin-bottom:7px;font-size:16px}.status-item p{margin:0;color:var(--muted);font-size:12px}.normal strong{color:#23c36b}.limited strong{color:#ffb000}.abnormal strong{color:#ff493d}.maintenance strong{color:#59616a}.modal-actions{display:flex;justify-content:flex-end;margin-top:18px}.modal-close{height:36px;padding:0 16px;border:0;border-radius:8px;background:#e9edf1;font-size:13px;font-weight:650;cursor:pointer}
    .alert-overlay{z-index:75}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:transform .24s ease;outline:0}.alert-overlay.open .alert-drawer{transform:none}.alert-header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.alert-header h2{margin:0 0 5px;font-size:20px}.alert-header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{min-height:0;overflow-y:auto;padding:16px}.alert-list{display:grid;gap:12px}.alert-card{padding:14px;border-radius:11px;background:#fff}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:#77808a;font-size:11px;line-height:1.5}.severity{float:right;padding:3px 7px;border:1px solid #ffd8d5;border-radius:13px;color:var(--red);background:#fff8f7;font-size:10px}.alert-footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.alert-primary{width:240px;height:37px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650;cursor:pointer}
    .toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s ease}.toast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:1100px){.lower-grid{grid-template-columns:1fr}.summary-grid{grid-template-columns:1fr 1fr}.summary-card:last-child{grid-column:1/-1}.toolbar{grid-template-columns:1fr}.toolbar-actions{justify-content:flex-end}}
    @media(max-width:760px){.page-head{min-height:100px;align-items:flex-start;padding:14px}.page-head h1{font-size:18px}.page-head p{font-size:12px}.primary-btn{width:38px;padding:0}.primary-btn span{display:none}.detail-canvas{padding:12px}.tabs-row{padding:12px}.task-list-section{padding:16px 12px}.toolbar{grid-template-columns:1fr}.toolbar-actions .filter-btn{flex:1}.summary-grid{grid-template-columns:1fr;gap:12px}.summary-card:last-child{grid-column:auto}.lower-grid{gap:12px}.card-head{display:block}.card-actions{justify-content:flex-start;margin-top:14px}.config-card,.action-card{padding:16px 12px}.alert-drawer{width:100vw}.status-modal{padding:18px}}

/* Controller-rendered states */
.status-failed{color:var(--red);border-color:#f4cfcd;background:#fff5f4}.status-cancelled{color:#8d949c;border-color:#e1e5e8;background:#f7f8f9}.detail-loading-cell{height:112px!important;text-align:center}.detail-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.detail-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:detail-loading-spin .7s linear infinite}.detail-empty{text-align:center;color:var(--muted)}.config-loading{display:flex;align-items:center;justify-content:center;min-height:100px;color:var(--muted);font-size:12px}@keyframes detail-loading-spin{to{transform:rotate(360deg)}}
</style>
<style scoped>
.order-task-page { width: 100%; min-height: 100%; color: #122235; background: #f3f6f8; font-size: 14px; --blue: #1677c8; --blue-strong: #1677c8; --muted: #768392; --line: #dfe5ea; --ink: #122235; --canvas: #f3f6f8; --red: #d84343; --green: #1f9d63; --yellow: #d99b00; --orange: #d96522; }
.primary-btn { border: 1px solid #dfe3e7; color: #2c3947; background: #fff; font-weight: 500; }
.primary-btn:hover { border-color: #aebbc7; background: #f8fafb; }
.warning-note.error { color: #d84343; background: #fff5f4; }
.detail-empty { height: 112px; text-align: center; color: #768392; }
@media (max-width: 760px) { .primary-btn span:last-child { display: none; } }
</style>
