<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { createResource, deleteResource, listResource } from '../api/agv'

const router = useRouter()
const keyword = ref('')
const status = ref('')
const page = ref(1)
const pageSize = ref(9)
const createVisible = ref(false)
const detailVisible = ref(false)
const selectedOrder = ref(null)
const loading = ref(false)
const workflowLoading = ref(false)
const workflowError = ref('')
const submitting = ref(false)
const createFeedback = ref('')
const createOrderInput = ref(null)
const detailCloseButton = ref(null)
const modalTrigger = ref(null)
const toastMessage = ref('')
let toastTimer
const rows = ref([])
const workflows = ref([])
const form = reactive({ upstreamOrderNo: '', source: 'MANUAL', priority: 1, tasks: [{ taskName: '任务 1', flowTemplateId: '' }] })

const statusMeta = {
  QUEUED: { label: '排队中', className: 'waiting' },
  RUNNING: { label: '执行中', className: 'executing' },
  SUCCEEDED: { label: '已完成', className: 'completed' },
  FAILED: { label: '失败', className: 'failed' },
  CANCELLED: { label: '已取消', className: 'cancelled' },
}

const filtered = computed(() => rows.value.filter((item) => {
  const value = keyword.value.trim().toLowerCase()
  return (!status.value || item.status === status.value)
    && (!value || `${item.upstreamOrderNo} ${item.systemOrderNo}`.toLowerCase().includes(value))
}))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const pageStart = computed(() => filtered.value.length ? (page.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => Math.min(page.value * pageSize.value, filtered.value.length))
const flowState = computed(() => workflowLoading.value
  ? '正在加载流程…'
  : workflowError.value
    ? '流程加载失败'
    : workflows.value.length ? `已加载 ${workflows.value.length} 个流程` : '暂无可用流程')

function statusInfo(value) {
  return statusMeta[value] || { label: value || '-', className: 'cancelled' }
}

function showToast(message) {
  toastMessage.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2300)
}

function formatPriority(value) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value).startsWith('P') ? String(value) : `P${value}`
}

function callbackStatusText(item) {
  const explicit = item.resultCallbackStatusDescription || item.callbackStatusDescription || item.resultCallbackStatus || item.callbackStatus
  if (explicit) return String(explicit)
  if (item.status === 'SUCCEEDED') return '任务已全部完成'
  if (item.status === 'FAILED') return '任务执行失败，等待处理'
  if (item.status === 'CANCELLED') return '订单已取消'
  return '等待任务全部完成'
}

function progressText(item) {
  return item.progress || `${item.completedTaskCount ?? 0} / ${item.taskCount ?? 0}`
}

function reset() {
  keyword.value = ''
  status.value = ''
  page.value = 1
}

function resetCreateForm() {
  form.upstreamOrderNo = ''
  form.source = 'MANUAL'
  form.priority = 1
  form.tasks = [{ taskName: '任务 1', flowTemplateId: '' }]
  createFeedback.value = ''
}

function openCreate(event) {
  modalTrigger.value = event?.currentTarget || document.activeElement
  resetCreateForm()
  createVisible.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => createOrderInput.value?.focus())
}

function closeCreate() {
  if (submitting.value) return
  createVisible.value = false
  createFeedback.value = ''
  document.body.style.overflow = ''
  nextTick(() => modalTrigger.value?.focus?.())
}

function addTask() {
  form.tasks.push({ taskName: `任务 ${form.tasks.length + 1}`, flowTemplateId: '' })
}

function changeTaskCount(event) {
  const value = typeof event === 'object' ? event.target.value : event
  const count = Math.max(1, Math.min(10, Number(value) || 1))
  while (form.tasks.length < count) addTask()
  if (form.tasks.length > count) form.tasks.splice(count)
}

async function loadOrders() {
  loading.value = true
  try {
    rows.value = await listResource('orders')
    if (page.value > pageCount.value) page.value = pageCount.value
  } catch (error) {
    rows.value = []
    showToast(`订单加载失败：${error.message}`)
  } finally {
    loading.value = false
  }
}

async function loadWorkflows() {
  workflowLoading.value = true
  workflowError.value = ''
  try {
    workflows.value = await listResource('processes')
  } catch (error) {
    workflows.value = []
    workflowError.value = error.message
    showToast(`流程加载失败：${error.message}`)
  } finally {
    workflowLoading.value = false
  }
}

async function submit() {
  createFeedback.value = ''
  if (!form.upstreamOrderNo.trim()) {
    createFeedback.value = '请填写订单号'
    return
  }
  if (!workflows.value.length) {
    createFeedback.value = workflowError.value ? `流程加载失败：${workflowError.value}` : '暂无可用流程，无法创建订单'
    return
  }
  if (form.tasks.some((task) => !task.taskName.trim() || !Number(task.flowTemplateId))) {
    createFeedback.value = '请完整填写每个任务的名称并选择流程'
    return
  }
  submitting.value = true
  try {
    await createResource('orders', {
      upstreamOrderNo: form.upstreamOrderNo.trim(),
      source: form.source,
      priority: Number(form.priority),
      tasks: form.tasks.map((task, index) => ({ taskName: task.taskName.trim(), taskSeq: index + 1, flowTemplateId: Number(task.flowTemplateId) })),
    })
    const orderNo = form.upstreamOrderNo.trim()
    submitting.value = false
    closeCreate()
    reset()
    await loadOrders()
    showToast(`订单 ${orderNo} 创建成功`)
  } catch (error) {
    createFeedback.value = `创建失败：${error.message}`
  } finally {
    submitting.value = false
  }
}

function openDetail(row, event) {
  modalTrigger.value = event?.currentTarget || document.activeElement
  selectedOrder.value = row
  detailVisible.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => detailCloseButton.value?.focus())
}

function closeDetail() {
  detailVisible.value = false
  selectedOrder.value = null
  document.body.style.overflow = ''
  nextTick(() => modalTrigger.value?.focus?.())
}

function openTasks(row) {
  if (!row) return
  closeDetail()
  router.push({ path: '/orders/detail', query: { id: row.id, order: row.upstreamOrderNo } })
}

function requestCancel() {
  if (selectedOrder.value) showToast(`请求上游取消功能待接入：${selectedOrder.value.upstreamOrderNo || selectedOrder.value.systemOrderNo || selectedOrder.value.id}`)
}

async function removeOrder(row) {
  try {
    await ElMessageBox.confirm(`确定删除订单“${row.upstreamOrderNo || row.systemOrderNo}”吗？`, '删除订单', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await deleteResource('orders', row.id)
    showToast('订单已删除')
    await loadOrders()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') showToast(error.message || '删除失败')
  }
}

function handleKeydown(event) {
  if (event.key !== 'Escape') return
  if (detailVisible.value) closeDetail()
  else if (createVisible.value) closeCreate()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadOrders()
  loadWorkflows()
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.clearTimeout(toastTimer)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="orders-canvas agv-list-page">
    <section class="orders-panel">
      <div class="tabs-row">
        <div class="tabs" role="tablist">
          <button class="tab-btn active" role="tab" aria-selected="true">订单列表</button>
          <button class="tab-btn" role="tab" aria-selected="false" aria-disabled="true" disabled>订单任务详情</button>
        </div>
      </div>

      <div class="list-content">
        <div class="list-heading">
          <div><h2>订单列表</h2><p>点击“详情”查看订单公共信息，点击“查看任务”进入任务与动作执行链</p></div>
          <button class="create-order-btn" type="button" @click="openCreate"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>新建</button>
        </div>

        <div class="filters agv-filter-bar" data-agv-list-filters>
          <label class="agv-filter-field"><span>状态选择</span><select v-model="status" aria-label="订单状态" @change="page = 1"><option value="">全部状态</option><option v-for="(meta, key) in statusMeta" :key="key" :value="key">{{ meta.label }}</option></select></label>
          <label class="agv-filter-field"><span>查询订单</span><input v-model="keyword" type="search" placeholder="订单号/系统订单号" aria-label="查询订单" @keyup.enter="page = 1"></label>
          <div class="agv-filter-actions"><button class="filter-btn" type="button" @click="reset"><img class="filter-action-icon" src="/assets/list-icons/refresh.svg" alt="">重置</button><button class="filter-btn primary" type="button" @click="page = 1"><img class="filter-action-icon" src="/assets/list-icons/search.svg" alt="">搜索</button></div>
        </div>

        <div class="table-wrap">
          <table class="agv-list-table" aria-label="订单列表">
            <colgroup><col style="width:13.65%"><col style="width:11.64%"><col style="width:11.64%"><col style="width:12.16%"><col style="width:11.64%"><col style="width:7.4%"><col style="width:11.21%"><col style="width:13.52%"><col style="width:7.14%"></colgroup>
            <thead><tr><th>订单号</th><th>系统订单号</th><th>来源</th><th>状态</th><th>优先级</th><th>任务数</th><th>完成进度</th><th>下发时间</th><th class="col-actions">操作</th></tr></thead>
            <tbody>
              <tr v-if="loading"><td class="order-loading-cell" colspan="9"><span class="order-loading">正在加载订单…</span></td></tr>
              <tr v-for="row in pageRows" v-else :key="row.id" @dblclick="openDetail(row, $event)">
                <td :title="row.upstreamOrderNo">{{ row.upstreamOrderNo || '-' }}</td><td :title="row.systemOrderNo">{{ row.systemOrderNo || '-' }}</td><td>{{ row.source || '-' }}</td>
                <td><span :class="['status-tag', `status-${statusInfo(row.status).className}`]">{{ statusInfo(row.status).label }}</span></td>
                <td>{{ formatPriority(row.priority) }}</td><td>{{ row.taskCount ?? 0 }}</td><td>{{ progressText(row) }}</td><td>{{ row.issuedAt || '-' }}</td>
                <td class="col-actions">
                  <div class="row-actions">
                    <TableActionButton kind="view" label="查看详情" @click="openDetail(row, $event)"/>
                    <TableActionButton kind="document" label="查看任务" @click="openTasks(row)"/>
                    <TableActionButton kind="delete" label="删除" danger @click="removeOrder(row)"/>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && !pageRows.length" class="empty-row"><td colspan="9">没有符合条件的订单</td></tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <div class="page-summary">共 {{ filtered.length }} 条，当前显示 {{ pageStart }}–{{ pageEnd }} 条</div>
          <div class="page-controls"><select v-model="pageSize" class="page-size" aria-label="每页条数" @change="page = 1"><option :value="9">9 条/页</option><option :value="10">10 条/页</option><option :value="15">15 条/页</option></select><button class="page-btn" :disabled="page <= 1" @click="page--">上一页</button><button v-for="item in pageCount" :key="item" :class="['page-btn', { active: page === item }]" @click="page = item">{{ item }}</button><button class="page-btn" :disabled="page >= pageCount" @click="page++">下一页</button></div>
        </div>
      </div>
    </section>

    <div v-if="createVisible" class="modal-overlay open" @click.self="closeCreate">
      <section class="create-order-modal" role="dialog" aria-modal="true" aria-labelledby="createOrderTitle" tabindex="-1">
        <header class="create-order-header"><h2 id="createOrderTitle">手动创建订单</h2><p>填写订单信息并为每个任务选择流程</p></header>
        <form @submit.prevent="submit">
          <div class="create-order-body">
            <div class="create-order-grid">
              <label class="create-field"><span>订单号</span><input ref="createOrderInput" v-model="form.upstreamOrderNo" maxlength="100" autocomplete="off" required placeholder="请输入订单号"></label>
              <label class="create-field"><span>来源</span><select v-model="form.source" required><option v-for="item in ['MANUAL','MES','LIMS','UPSTREAM']" :key="item" :value="item">{{ item }}</option></select></label>
              <label class="create-field"><span>优先级</span><select v-model="form.priority" required><option :value="1">1（最高）</option><option :value="2">2</option><option :value="3">3</option><option :value="4">4（最低）</option></select></label>
              <label class="create-field"><span>任务数</span><input :value="form.tasks.length" type="number" min="1" max="10" step="1" required @input="changeTaskCount"></label>
            </div>
            <section class="create-tasks" aria-labelledby="createTasksTitle">
              <div class="create-tasks-heading"><h3 id="createTasksTitle">任务明细</h3><span>{{ flowState }}</span></div>
              <div class="create-task-rows">
                <div v-for="(task, index) in form.tasks" :key="index" class="create-task-row">
                  <span class="task-sequence">#{{ index + 1 }}</span>
                  <label class="task-field"><span>任务名称</span><input v-model="task.taskName" maxlength="100" required></label>
                  <label class="task-field"><span>流程</span><select v-model="task.flowTemplateId" required :disabled="workflowLoading || !workflows.length"><option value="">{{ workflowLoading ? '正在加载流程…' : '请选择流程' }}</option><option v-for="workflow in workflows" :key="workflow.id" :value="workflow.id">{{ workflow.flowName || workflow.name || '未命名流程' }} · {{ workflow.flowNumber || workflow.number || '-' }}{{ workflow.templateName ? ` · ${workflow.templateName}` : '' }} · ID {{ workflow.id }}</option></select></label>
                </div>
              </div>
            </section>
            <p v-if="createFeedback" class="create-order-feedback" role="alert">{{ createFeedback }}</p>
          </div>
          <div class="modal-actions create-order-actions"><button class="modal-close" type="button" @click="closeCreate">取消</button><button class="create-order-submit modal-primary" type="submit" :disabled="submitting || workflowLoading || !workflows.length">{{ submitting ? '创建中…' : '创建订单' }}</button></div>
        </form>
      </section>
    </div>

    <div v-if="detailVisible && selectedOrder" class="modal-overlay open" @click.self="closeDetail">
      <section class="order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="orderDetailTitle" aria-describedby="orderDetailNotice" tabindex="-1">
        <header class="order-detail-header"><h2 id="orderDetailTitle">订单详情 · {{ selectedOrder.upstreamOrderNo || selectedOrder.systemOrderNo }}</h2><button ref="detailCloseButton" class="order-detail-x" type="button" aria-label="关闭订单详情" @click="closeDetail">×</button></header>
        <div class="order-detail-body">
          <div class="order-detail-grid">
            <article class="order-detail-item"><span>订单号</span><strong>{{ selectedOrder.upstreamOrderNo || '-' }}</strong></article>
            <article class="order-detail-item"><span>订单状态</span><div><span :class="['status-tag', `status-${statusInfo(selectedOrder.status).className}`]">{{ statusInfo(selectedOrder.status).label }}</span></div></article>
            <article class="order-detail-item"><span>系统订单号</span><strong>{{ selectedOrder.systemOrderNo || '-' }}</strong></article>
            <article class="order-detail-item"><span>优先级</span><strong>{{ formatPriority(selectedOrder.priority) }}</strong></article>
            <article class="order-detail-item"><span>订单来源</span><strong>{{ selectedOrder.source || '-' }}</strong></article>
            <article class="order-detail-item"><span>任务数量 / 完成进度</span><strong>{{ selectedOrder.taskCount ?? 0 }}个 / {{ selectedOrder.completedTaskCount ?? 0 }}/{{ selectedOrder.taskCount ?? 0 }}</strong></article>
            <article class="order-detail-item"><span>下发时间</span><strong>{{ selectedOrder.issuedAt || '-' }}</strong></article>
            <article class="order-detail-item"><span>结果回调状态</span><strong>{{ callbackStatusText(selectedOrder) }}</strong></article>
          </div>
          <p id="orderDetailNotice" class="order-detail-notice">订单只展示订单级公共信息。库位、载具、目标机台等可能随任务不同而变化的数据，请到“订单任务详情”逐条查看。</p>
          <div class="order-detail-actions"><button class="order-detail-primary" type="button" @click="openTasks(selectedOrder)">查看订单任务详情</button><button class="order-detail-secondary" type="button" @click="requestCancel">请求上游取消</button></div>
        </div>
        <footer class="order-detail-footer"><button class="modal-close" type="button" @click="closeDetail">关闭</button></footer>
      </section>
    </div>
    <div :class="['toast', { show: toastMessage }]" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
:root {color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif;}
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; color: var(--ink); background: var(--canvas); -webkit-font-smoothing: antialiased; }
    button,input,select { font: inherit; }
    button { color: inherit; }
    svg { display: block; }
    [hidden] { display: none !important; }
    .icon { width: 19px; height: 19px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

    .page-head { min-height: 75px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 20px; background: #fff; }
    .page-head h1 { margin: 0 0 6px; font-size: 19px; line-height: 1.25; letter-spacing: -.02em; }
    .page-head p { margin: 0; color: var(--muted); font-size: 13px; }
    .sync-btn { height: 37px; display: inline-flex; align-items: center; gap: 7px; padding: 0 15px; border: 0; border-radius: 8px; color: #fff; background: var(--blue); font-size: 13px; font-weight: 650; cursor: pointer; }
    .sync-btn:hover { background: #176fb5; }
    .sync-btn:disabled { opacity: .65; cursor: wait; }

    .orders-canvas { min-height: calc(100vh - 128px); padding: 20px; }
    .orders-panel { min-height: 760px; overflow: hidden; border-radius: 11px; background: #fff; }
    .tabs-row { padding: 16px 16px 20px; border-bottom: 1px solid var(--line); }
    .tabs { width: fit-content; display: inline-flex; padding: 2px; border-radius: 9px; background: #f3f5f7; }
    .tab-btn { height: 34px; padding: 0 15px; border: 0; border-radius: 8px; background: transparent; font-size: 13px; cursor: pointer; }
    .tab-btn.active { background: #fff; font-weight: 700; box-shadow: 0 2px 8px rgba(17,36,54,.08); }
    .list-content { padding: 20px 16px 18px; }
    .list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .list-heading h2 { margin: 0 0 6px; font-size: 15px; }
    .list-heading p { margin: 0; color: var(--muted); font-size: 11px; }
    .create-order-btn,.create-order-submit { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 16px; border: 0; border-radius: 8px; color: #fff; background: var(--blue); font-size: 13px; font-weight: 650; cursor: pointer; }
    .create-order-btn:hover,.create-order-submit:hover:not(:disabled) { background: #176fb5; }
    .create-order-submit:disabled { opacity: .58; cursor: not-allowed; }

    .filter-btn { height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border: 0; border-radius: 8px; background: #f3f5f7; font-size: 13px; font-weight: 650; cursor: pointer; }
    .filter-btn.primary { min-width: 74px; color: #fff; background: var(--blue); }
    .filter-btn:hover { filter: brightness(.97); }

    .table-wrap { overflow-x: auto; border: 1px solid #edf0f2; border-radius: 9px; }
    table { width: 100%; min-width: 1120px; border-collapse: separate; border-spacing: 0; font-size: 12px; }
    th,td { padding: 0 13px; height: 52px; text-align: left; white-space: nowrap; border-right: 1px solid #f0f2f4; border-bottom: 1px solid #edf0f2; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover { background: #f9fcfe; }
    .order-detail-modal .status-tag { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid currentColor; border-radius: 999px; line-height: 1; }
    .order-detail-modal .status-tag::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
    .row-actions { display: flex; gap: 6px; }
    .row-btn { height: 27px; padding: 0 10px; border: 1px solid #e2e5e8; border-radius: 14px; background: #f7f8f9; font-size: 11px; font-weight: 650; cursor: pointer; }
    .row-btn.tasks { color: var(--blue-strong); border-color: #cce3f5; background: #f1f8fd; }
    .row-btn:hover { filter: brightness(.97); }
    .empty-row td { height: 180px; color: var(--muted); text-align: center; }

    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 15px; }
    .page-summary { color: var(--muted); font-size: 11px; }
    .page-controls { display: flex; align-items: center; gap: 7px; }
    .page-size { height: 32px; padding: 0 8px; border: 1px solid #dde2e6; border-radius: 7px; color: #4f5862; background: #fff; font-size: 11px; }
    .page-btn { min-width: 32px; height: 32px; display: grid; place-items: center; padding: 0 9px; border: 1px solid #dde2e6; border-radius: 7px; background: #fff; font-size: 11px; cursor: pointer; }
    .page-btn:hover:not(:disabled),.page-btn.active { color: #fff; border-color: var(--blue); background: var(--blue); }
    .page-btn:disabled { color: #c2c7cc; background: #f6f7f8; cursor: not-allowed; }

    .modal-overlay,.alert-overlay { position: fixed; inset: 0; z-index: 70; background: rgba(0,0,0,.55); opacity: 0; transition: opacity .2s ease; }
    .modal-overlay.open,.alert-overlay.open { opacity: 1; }
    .modal-overlay { display: grid; place-items: center; padding: 24px; }
    .status-modal,.create-order-modal,.order-detail-modal { width: min(600px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; padding: 24px; border-radius: 16px; background: #f5f7f9; box-shadow: 0 22px 70px rgba(0,0,0,.22); transform: translateY(10px) scale(.985); transition: transform .18s ease; }
    .create-order-modal { width: min(760px, calc(100vw - 32px)); overflow: hidden; background: #fff; }
    .modal-overlay.open .status-modal,.modal-overlay.open .create-order-modal,.modal-overlay.open .order-detail-modal { transform: none; }
    .status-modal h2 { margin: 0 0 18px; font-size: 20px; }
    .create-order-header h2 { margin: 0 0 6px; font-size: 20px; }
    .create-order-header p { margin: 0 0 20px; color: var(--muted); font-size: 12px; }
    .create-order-body { max-height: 60vh; overflow-y: auto; padding-right: 5px; overscroll-behavior: contain; }
    .create-order-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
    .create-field { min-width: 0; display: grid; gap: 7px; color: #27384a; font-size: 12px; font-weight: 650; }
    .create-field input,.create-field select,.task-field input,.task-field select { width: 100%; height: 40px; padding: 0 11px; border: 1px solid #dfe4e8; border-radius: 8px; outline: 0; color: var(--ink); background: #fff; font-size: 13px; font-weight: 400; }
    .create-field input:focus,.create-field select:focus,.task-field input:focus,.task-field select:focus { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(21,119,210,.1); }
    .create-tasks { margin-top: 20px; }
    .create-tasks-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .create-tasks-heading h3 { margin: 0; font-size: 14px; }
    .create-tasks-heading span { color: var(--muted); font-size: 11px; }
    .create-task-rows { display: grid; gap: 10px; }
    .create-task-row { display: grid; grid-template-columns: 44px minmax(150px,.75fr) minmax(240px,1.25fr); gap: 10px; align-items: end; padding: 12px; border: 1px solid #e8ecef; border-radius: 10px; background: #fafbfc; }
    .task-sequence { align-self: center; color: var(--blue-strong); font-size: 13px; font-weight: 700; text-align: center; }
    .task-field { min-width: 0; display: grid; gap: 6px; color: var(--muted); font-size: 11px; }
    .create-order-feedback { margin: 14px 0 0; padding: 10px 12px; border-radius: 8px; color: var(--red); background: #fff5f4; font-size: 12px; }
    .create-order-actions { gap: 10px; }
    .order-detail-modal { width: min(720px, calc(100vw - 32px)); display: flex; flex-direction: column; overflow: hidden; padding: 0; background: #fff; }
    .order-detail-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 20px 12px; }
    .order-detail-header h2 { margin: 0; font-size: 17px; line-height: 24px; }
    .order-detail-x { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 7px; color: #87919a; background: transparent; font-size: 25px; line-height: 1; cursor: pointer; }
    .order-detail-x:hover { color: var(--ink); background: #f2f4f6; }
    .order-detail-body { max-height: 60vh; overflow-y: auto; padding: 0 20px 20px; overscroll-behavior: contain; }
    .order-detail-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
    .order-detail-item { min-width: 0; min-height: 62px; padding: 13px 14px; border: 1px solid #e8ecef; border-radius: 9px; background: #fff; }
    .order-detail-item > span { display: block; margin-bottom: 8px; color: #26384a; font-size: 12px; font-weight: 700; line-height: 16px; }
    .order-detail-item strong { display: block; overflow: hidden; color: #89939d; font-size: 11px; font-weight: 400; line-height: 17px; text-overflow: ellipsis; white-space: nowrap; }
    .order-detail-item .status-tag { min-width: 0; min-height: 20px; padding: 2px 8px; font-size: 10px; }
    .order-detail-notice { margin: 14px 0 0; padding: 12px 14px; border-radius: 8px; color: #f06b34; background: #fff1e9; font-size: 12px; line-height: 1.6; }
    .order-detail-actions { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
    .order-detail-primary,.order-detail-secondary { min-height: 36px; padding: 0 14px; border: 0; border-radius: 7px; font-size: 12px; font-weight: 650; cursor: pointer; }
    .order-detail-primary { color: #fff; background: var(--blue); }
    .order-detail-primary:hover { background: #176fb5; }
    .order-detail-secondary { color: #2a3a49; background: #f2f4f6; }
    .order-detail-secondary:hover { background: #e9edf0; }
    .order-detail-footer { display: flex; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid #eef0f2; background: #fff; }
    .status-list { display: grid; gap: 16px; }
    .status-item { padding: 17px 16px; border-radius: 7px; background: #fff; }
    .status-item strong { display: block; margin-bottom: 7px; font-size: 18px; }
    .status-item p { margin: 0; color: var(--muted); font-size: 13px; }
    .normal strong { color: #23c36b; } .limited strong { color: #ffb000; } .abnormal strong { color: #ff493d; } .maintenance strong { color: #59616a; }
    .modal-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
    .modal-close { height: 36px; padding: 0 16px; border: 0; border-radius: 8px; background: #e9edf1; font-size: 13px; font-weight: 650; cursor: pointer; }

    .alert-overlay { z-index: 75; }
    .alert-drawer { position: absolute; inset: 0 0 0 auto; width: min(444px,100vw); display: grid; grid-template-rows: auto minmax(0,1fr) auto; background: #f5f7f9; transform: translateX(100%); transition: transform .24s ease; outline: 0; }
    .alert-overlay.open .alert-drawer { transform: none; }
    .alert-header { padding: 22px 16px 16px; border-bottom: 1px solid #e6e9ec; }
    .alert-header h2 { margin: 0 0 5px; font-size: 20px; }
    .alert-header p { margin: 0; color: var(--muted); font-size: 12px; }
    .alert-feed { min-height: 0; overflow-y: auto; padding: 16px; }
    .alert-list { display: grid; gap: 12px; }
    .alert-card { padding: 14px; border-radius: 11px; background: #fff; }
    .alert-card strong { font-size: 13px; }
    .alert-card p { margin: 8px 0 0; color: #77808a; font-size: 11px; line-height: 1.5; }
    .severity { float: right; padding: 3px 7px; border: 1px solid #ffd8d5; border-radius: 13px; color: var(--red); background: #fff8f7; font-size: 10px; }
    .alert-footer { display: grid; place-items: center; min-height: 72px; border-top: 1px solid #e6e9ec; background: #fff; }
    .alert-primary { width: 240px; height: 37px; border: 0; border-radius: 8px; color: #fff; background: var(--blue); font-size: 13px; font-weight: 650; cursor: pointer; }

    .toast { position: fixed; left: 50%; bottom: 24px; z-index: 90; padding: 11px 16px; border-radius: 8px; color: #fff; background: rgba(12,29,47,.92); font-size: 13px; opacity: 0; pointer-events: none; transform: translate(-50%,20px); transition: .22s ease; }
    .toast.show { opacity: 1; transform: translate(-50%,0); }

    @media (max-width: 760px) {
      .page-head { align-items: flex-start; padding: 14px; }
      .page-head h1 { font-size: 18px; }
      .page-head p { font-size: 12px; }
      .sync-btn { width: 38px; padding: 0; justify-content: center; }
      .sync-btn span { display: none; }
      .orders-canvas { padding: 12px; }
      .orders-panel { min-height: calc(100vh - 152px); }
      .tabs-row { padding: 12px; }
      .list-content { padding: 16px 12px; }
      .list-heading { align-items: stretch; flex-direction: column; }
      .create-order-btn { align-self: flex-start; }
      .pagination { align-items: flex-start; flex-direction: column; }
      .page-controls { width: 100%; overflow-x: auto; padding-bottom: 4px; }
      .status-modal,.create-order-modal { padding: 18px; }
      .order-detail-modal { padding: 0; }
      .create-order-grid,.create-task-row { grid-template-columns: 1fr; }
      .order-detail-grid { grid-template-columns: 1fr; }
      .order-detail-header { padding: 17px 16px 10px; }
      .order-detail-body { padding: 0 16px 16px; }
      .order-detail-actions { align-items: stretch; flex-direction: column; }
      .order-detail-footer { padding: 12px 16px; }
      .task-sequence { text-align: left; }
      .status-list { gap: 10px; }
      .status-item { padding: 14px; }
      .status-item strong { font-size: 16px; }
      .alert-drawer { width: 100vw; }
    }

/* Controller-rendered states */
.order-loading-cell{height:120px!important;text-align:center}.order-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.order-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:order-loading-spin .7s linear infinite}@keyframes order-loading-spin{to{transform:rotate(360deg)}}

.tab-btn:disabled{color:#8d949c;cursor:default;opacity:.72}

/* The order list now uses the shared Figma list primitives. */
.orders-canvas.agv-list-page {
  min-height: calc(100vh - var(--agv-topbar-height));
  padding: 20px;
  background: #fff;
}
.agv-list-page .orders-panel { min-height: 0; overflow: visible; border-radius: 0; background: transparent; }
.agv-list-page .list-content { padding: 20px 0 0; }
.agv-list-page .list-heading h2 { margin: 0 0 4px; color: #081829; font-size: 14px; font-weight: 600; line-height: 20px; }
.agv-list-page .list-heading p { margin: 0; color: rgba(8,24,41,.48); font-size: 12px; line-height: 16px; }
.agv-list-page .pagination { display: none; }

@media (max-width: 760px) {
  .orders-canvas.agv-list-page { padding: 16px 12px; }
}
</style>
<style scoped src="../styles/forms.css"></style>
<style scoped src="../styles/tables.css"></style>
<style scoped src="../styles/components.css"></style>
<style scoped>
.orders-canvas { width: 100%; color: #081829; --blue: #1677c8; --blue-strong: #1677c8; --muted: #768392; --line: #dfe5ea; --ink: #122235; --canvas: #f3f6f8; --red: #d84343; --green: #1f9d63; --yellow: #d99b00; --orange: #d96522; }
.tabs-row { padding: 16px 16px 20px; }
.agv-list-table .status-tag { display: inline-flex; align-items: center; min-width: 78px; height: 24px; justify-content: center; gap: 6px; padding: 4px 12px; border: 1px solid currentColor; border-radius: 999px; font-size: 12px; font-weight: 500; line-height: 16px; white-space: nowrap; }
.status-tag::before { width: 4px; height: 4px; border-radius: 50%; background: currentColor; content: ''; flex: 0 0 auto; }
.status-executing { color: #28bd6b; border-color: #bfead3; background: rgb(40 189 107 / 8%); }
.agv-list-table .status-executing::before { background: #1577d2; }
.status-completed { color: #2f9d68; border-color: #c9ead9; background: #f3fbf7; }
.status-failed { color: #d84343; border-color: #f1cccc; background: #fff3f3; }
.status-cancelled { color: #7f8a95; border-color: #dfe4e8; background: #f6f8f9; }
.row-icon-button.danger { color: #d84343; }
.row-icon-button.danger:hover { background: #fff3f3; }
.order-detail-modal .status-tag { min-width: 0; min-height: 20px; padding: 2px 8px; font-size: 10px; }
.modal-overlay { font-size: 14px; }
</style>
