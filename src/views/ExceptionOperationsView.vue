<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { emergencyProcedures, exceptionWorkorders } from '../data/exception-operations'

const props = defineProps({ mode: { type: String, required: true } })
const route = useRoute()
const router = useRouter()
const selected = ref(null)
const dialogVisible = ref(false)
const toastText = ref('')
let toastTimer

const procedureKey = 'agv-emergency-procedure-status'
let stored = {}
try { stored = JSON.parse(localStorage.getItem(procedureKey) || '{}') } catch { stored = {} }
const enabled = reactive(Object.fromEntries(emergencyProcedures.map(item => [item.id, stored[item.id] !== false])))
const workorderStorageKey = 'agv-exception-workorder-session'
let storedWorkorders = {}
try { storedWorkorders = JSON.parse(sessionStorage.getItem(workorderStorageKey) || '{}') } catch { storedWorkorders = {} }
const workorderState = reactive(Object.fromEntries(exceptionWorkorders.map(item => [item.id, { checks:[], verified:false, route:'', released:false, ...(storedWorkorders[item.id] || {}) }])))

const proceduresMode = computed(() => props.mode === 'procedures')
const title = computed(() => proceduresMode.value ? '急停处置规程' : '异常与恢复')
const description = computed(() => proceduresMode.value
  ? '本页定义须急停的异常场景与处置规程（规则内容只读，可启用或停用）。异常实际发生时自动生成工单，处置操作统一在「异常与恢复」中进行，工单上标注对应规则编号。'
  : '核账 → 人工确认 → 选择恢复方式 → 放行续跑。点击异常查看详情并处置。')

const levelText = level => ({ L1:'自动降级', L2:'远程人工', L3:'现场人工', L4:'工程师' })[level]
const scopeClass = scope => scope === '全线急停' ? 'line' : scope === '机构急停' ? 'mechanism' : 'unit'

function toast(message) {
  toastText.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastText.value = '' }, 2200)
}

function open(item) { selected.value = item; dialogVisible.value = true }
function close() { dialogVisible.value = false }

function toggleProcedure(item) {
  enabled[item.id] = !enabled[item.id]
  try { localStorage.setItem(procedureKey, JSON.stringify(enabled)) } catch { /* 本次会话继续保留状态 */ }
  toast(`${item.id} 已${enabled[item.id] ? '启用' : '停用'}`)
}

function toggleCheck(index, checked) {
  const state = workorderState[selected.value.id]
  if (checked && !state.checks.includes(index)) state.checks.push(index)
  if (!checked) state.checks = state.checks.filter(item => item !== index)
  persistWorkorders()
}

function persistWorkorders() { try { sessionStorage.setItem(workorderStorageKey,JSON.stringify(workorderState)) } catch { /* 会话内响应式状态仍然有效 */ } }
function verify() { workorderState[selected.value.id].verified = true; persistWorkorders(); toast('归位与自检已完成') }
function release() { workorderState[selected.value.id].released = true; persistWorkorders(); toast(`${selected.value.id} 已放行并恢复自动化`) }
function selectRoute(value) { workorderState[selected.value.id].route=value; persistWorkorders() }
function toProcedure(rule) { close(); router.push({ path:'/operations/emergency-stop', query:{ rule } }) }
function toTicket(ticket) { close(); router.push({ path:'/operations/exception-recovery', query:{ ticket } }) }

function openRequested() {
  const key = proceduresMode.value ? route.query.rule : route.query.ticket
  const rows = proceduresMode.value ? emergencyProcedures : exceptionWorkorders
  const item = rows.find(row => row.id === key)
  if (item) open(item)
}

function onKeydown(event) { if (event.key === 'Escape' && dialogVisible.value) close() }

watch(() => [props.mode, route.query.ticket, route.query.rule], () => {
  selected.value = null
  dialogVisible.value = false
  openRequested()
})
watch(dialogVisible, value => { document.body.style.overflow = value ? 'hidden' : '' })
onMounted(() => { document.addEventListener('keydown', onKeydown); openRequested() })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeydown); document.body.style.overflow = ''; clearTimeout(toastTimer) })
</script>

<template>
  <div class="page-view operations-reference-page">
    <PageHeader class="page-head" :title="title" :description="description" />
    <main class="page-canvas">
      <section class="recovery-panel"><div class="module-content"><div class="table-wrap">
        <table v-if="!proceduresMode" class="data-table ops-table workorder-ops-table" aria-label="异常工单列表">
          <colgroup><col class="col-code"><col class="col-description"><col class="col-level"><col class="col-object"><col class="col-time"><col class="col-status"></colgroup>
          <thead><tr><th>异常编号</th><th>异常描述</th><th>处置级别</th><th>机器人 / 节点</th><th>发生时间</th><th>状态</th></tr></thead>
          <tbody><tr v-for="row in exceptionWorkorders" :key="row.id" class="clickable-row" tabindex="0" :aria-label="`查看异常工单 ${row.id}`" @click="open(row)" @keydown.enter="open(row)">
            <td class="ops-code">{{ row.id }}</td><td><strong class="table-primary">{{ row.title }}</strong><span class="table-secondary ops-description-meta"><span>{{ row.pattern }}</span><b v-if="row.rule" class="emergency-rule-chip"><i>!</i>急停规则 {{ row.rule }}</b></span></td><td><span :class="['level-chip',row.level.toLowerCase()]">{{ row.level }} {{ levelText(row.level) }}</span></td><td><strong class="table-primary">{{ row.robot }}</strong><span class="table-secondary">{{ row.node }}</span></td><td>{{ row.time }}</td><td><span :class="['status-tag',workorderState[row.id].released?'valid':row.status==='待处置'?'critical':'warning']">{{ workorderState[row.id].released ? '已恢复' : row.status }}</span></td>
          </tr></tbody>
        </table>

        <table v-else class="data-table ops-table procedure-ops-table" aria-label="急停处置规程列表">
          <colgroup><col class="col-rule"><col class="col-scene"><col class="col-scope"><col class="col-duty"><col class="col-ticket"><col class="col-action"></colgroup>
          <thead><tr><th>规则编号</th><th>异常场景</th><th>急停范围</th><th>处置责任</th><th>当前关联工单</th><th class="col-actions">操作</th></tr></thead>
          <tbody><tr v-for="row in emergencyProcedures" :key="row.id" class="clickable-row" tabindex="0" :aria-label="`查看急停规则 ${row.id}`" @click="open(row)" @keydown.enter="open(row)">
            <td class="ops-code">{{ row.id }}</td><td><strong class="table-primary">{{ row.title }}</strong><span class="table-secondary">{{ row.signal }}</span></td><td><span :class="['scope-chip',scopeClass(row.scope)]">{{ row.scope }}</span></td><td>{{ row.duty }}</td><td><button v-for="ticket in row.tickets" :key="ticket" class="ticket-chip procedure-ticket-link" type="button" :title="`前往异常与恢复查看 ${ticket}`" @click.stop="toTicket(ticket)">{{ ticket }}<span>→</span></button><span v-if="!row.tickets.length" class="table-secondary">—</span></td><td class="procedure-status-cell col-actions"><TableActionButton kind="toggle" :label="enabled[row.id]?'停用规则':'启用规则'" :active="enabled[row.id]" :danger="enabled[row.id]" @click.stop="toggleProcedure(row)"/></td>
          </tr></tbody>
        </table>
      </div></div></section>
    </main>

    <div v-if="dialogVisible && selected" class="modal-overlay open" @click.self="close">
      <section class="exception-modal ops-modal" role="dialog" aria-modal="true">
        <header class="modal-header"><div><h2>{{ proceduresMode ? `${selected.id} · ${selected.title}` : '异常详情与恢复处置' }}</h2><p>{{ proceduresMode ? `急停范围：${selected.scope} · 处置责任：${selected.duty}` : `${selected.id} · ${selected.time} · 负责人：${selected.owner}` }}</p></div><button class="modal-x" type="button" aria-label="关闭" @click="close">×</button></header>
        <div class="modal-body">
          <template v-if="!proceduresMode">
            <div class="ops-summary"><article class="ops-summary-item wide"><span>异常场景</span><strong>{{ selected.title }}</strong></article><article class="ops-summary-item"><span>处置级别</span><span :class="['level-chip',selected.level.toLowerCase()]">{{ selected.level }} {{ levelText(selected.level) }}</span></article><article class="ops-summary-item"><span>当前状态</span><strong>{{ workorderState[selected.id].released ? '已恢复' : selected.status }}</strong></article><article class="ops-summary-item wide"><span>机器人 / 失败节点</span><strong>{{ selected.robot }}<br>{{ selected.node }}</strong></article><article class="ops-summary-item wide"><span>影响范围</span><strong>{{ selected.impact }}</strong></article></div>
            <div v-if="selected.rule" class="warning-note">本工单由急停规则 <strong>{{ selected.rule }}</strong> 触发。<button class="link-inline link-button" type="button" @click="toProcedure(selected.rule)">查看对应处置规程 →</button></div>
            <section class="ops-section"><div class="ops-section-title"><h3>系统已执行的保护</h3><span>处置完成前保持生效</span></div><ul class="protection-list"><li v-for="item in selected.protections" :key="item" class="protection-item">{{ item }}</li></ul></section>
            <section class="ops-section"><div class="ops-section-title"><h3>1. 核账对照</h3><span>系统台账与现场实况比对</span></div><table class="reconcile-table"><thead><tr><th>位置</th><th>系统台账</th><th>现场实况</th><th>结果</th></tr></thead><tbody><tr v-for="row in selected.recon" :key="row[0]"><td>{{ row[0] }}</td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td :class="row[3]?'match-ok':'match-bad'">{{ row[3] ? '一致' : '不一致' }}</td></tr></tbody></table></section>
            <section class="ops-section"><div class="ops-section-title"><h3>2. 人工确认项</h3><span>现场处置完成后逐项确认</span></div><div class="confirm-list"><label v-for="(row,index) in selected.checks" :key="row[0]" class="confirm-item"><input type="checkbox" :checked="workorderState[selected.id].checks.includes(index)" :disabled="workorderState[selected.id].verified||workorderState[selected.id].released" @change="toggleCheck(index,$event.target.checked)"><span>{{ row[0] }}</span><i class="role-chip">{{ row[1] }}</i></label></div><div class="verify-row"><button class="primary-action" type="button" :disabled="workorderState[selected.id].checks.length!==selected.checks.length||workorderState[selected.id].verified" @click="verify">{{ workorderState[selected.id].verified ? '归位与自检已完成' : '人工确认完成，执行归位与自检' }}</button><small>{{ workorderState[selected.id].verified ? '全部恢复检查点已通过' : '完成全部确认项后可执行' }}</small></div></section>
            <section class="ops-section"><div class="ops-section-title"><h3>3. 恢复检查点</h3><span>由系统自动复核</span></div><ul class="checkpoint-list"><li v-for="item in selected.checkpoints" :key="item" :class="['checkpoint-item',{pending:!workorderState[selected.id].verified}]">{{ item }}</li></ul></section>
            <section class="ops-section"><div class="ops-section-title"><h3>4. 选择恢复方式</h3><span>{{ workorderState[selected.id].verified ? '请选择一种恢复方式' : '检查点通过后可选' }}</span></div><div class="recovery-options"><button v-for="item in selected.routes" :key="item[0]" :class="['recovery-option',{selected:workorderState[selected.id].route===item[0]}]" type="button" :disabled="!workorderState[selected.id].verified||workorderState[selected.id].released" @click="selectRoute(item[0])"><strong>{{ item[1] }}</strong><span>{{ item[2] }}</span></button></div></section>
          </template>

          <template v-else>
            <div class="procedure-meta"><span :class="['scope-chip',scopeClass(selected.scope)]">{{ selected.scope }}</span><span class="readonly-chip">只读规程</span></div>
            <div class="ops-summary"><article class="ops-summary-item wide"><span>检测信号</span><strong>{{ selected.signal }}</strong></article><article class="ops-summary-item wide"><span>当前关联工单</span><strong><button v-for="ticket in selected.tickets" :key="ticket" class="ticket-chip procedure-ticket-link" type="button" @click="toTicket(ticket)">{{ ticket }}<span>→</span></button><span v-if="!selected.tickets.length">暂无进行中的工单</span></strong></article></div>
            <section class="ops-section"><div class="ops-section-title"><h3>1. 系统自动执行</h3><span>急停触发后立即完成</span></div><ol class="procedure-list"><li v-for="item in selected.auto" :key="item" class="procedure-item">{{ item }}</li></ol></section>
            <section class="ops-section"><div class="ops-section-title"><h3>2. 人工处置步骤</h3><span>在异常工单中逐项确认</span></div><ol class="procedure-list"><li v-for="item in selected.manual" :key="item" class="procedure-item">{{ item }}</li></ol></section>
            <section class="ops-section"><div class="ops-section-title"><h3>3. 恢复放行条件</h3><span>归位后由系统复核</span></div><ul class="checkpoint-list"><li v-for="item in selected.gates" :key="item" class="checkpoint-item">{{ item }}</li></ul></section>
            <div class="warning-note">{{ selected.warning }}</div>
          </template>
        </div>
        <footer class="ops-modal-footer"><span v-if="proceduresMode" class="footer-hint">放行权限：{{ selected.duty }}</span><button class="modal-close" type="button" @click="close">关闭</button><button v-if="!proceduresMode" class="modal-primary" type="button" :disabled="workorderState[selected.id].released||!workorderState[selected.id].verified||!workorderState[selected.id].route" @click="release">{{ workorderState[selected.id].released ? '已放行' : '确认放行，恢复自动化' }}</button></footer>
      </section>
    </div>
    <div :class="['toast',{show:toastText}]" role="status" aria-live="polite">{{ toastText }}</div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
body {
  background: #f3f6f8;
}

.page-canvas {
  padding: 20px;
}

.recovery-panel,
.recovery-process,
.recovery-rules {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(18, 34, 53, .03);
}

.module-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid #edf0f2;
}

.module-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 54px;
  padding: 0 18px;
  color: #5d6977;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color .16s ease;
}

.module-tab:hover {
  color: #1677c8;
}

.module-tab.active {
  color: #1677c8;
  font-weight: 650;
}

.module-tab.active::after {
  position: absolute;
  right: 18px;
  bottom: -1px;
  left: 18px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: #1677c8;
  content: "";
}

.module-content {
  padding: 20px 16px 18px;
}

.list-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.list-heading h2,
.recovery-process-head h2,
.recovery-rules h2 {
  margin: 0;
  color: #122235;
  font-size: 17px;
  line-height: 24px;
}

.list-heading p,
.recovery-process-head p {
  margin: 5px 0 0;
  color: #768392;
  font-size: 13px;
  line-height: 20px;
}

.heading-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 14px;
  background: #fff1f0;
  color: #cf3f3f;
  font-size: 12px;
  font-weight: 650;
}

.primary-action,
.secondary-action,
.filter-btn,
.modal-primary,
.modal-close,
.route-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  padding: 0 15px;
  border-radius: 7px;
  font-size: 13px;
  line-height: 34px;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
}

.primary-action,
.modal-primary {
  border: 1px solid #1677c8;
  background: #1677c8;
  color: #fff;
}

.primary-action:hover,
.modal-primary:hover {
  border-color: #0f69b5;
  background: #0f69b5;
}

.secondary-action,
.modal-close,
.filter-btn {
  border: 1px solid #dfe5ea;
  background: #fff;
  color: #25364a;
}

.secondary-action:hover,
.modal-close:hover,
.filter-btn:hover {
  border-color: #93bde0;
  color: #1677c8;
}

.primary-action .icon {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 9px;
  background: #f7f9fa;
}

.field-shell {
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dfe5ea;
  border-radius: 7px;
  background: #fff;
}

.field-shell > span {
  flex: 0 0 auto;
  padding-left: 12px;
  color: #768392;
  font-size: 12px;
  white-space: nowrap;
}

.field-shell input,
.field-shell select {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 11px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #122235;
  font-size: 13px;
}

.field-shell input::placeholder {
  color: #a2acb7;
}

.field-shell:focus-within {
  border-color: #69aadb;
  box-shadow: 0 0 0 2px rgba(22, 119, 200, .09);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.filter-btn {
  min-width: 76px;
}

.filter-btn.primary {
  border-color: #1677c8;
  background: #1677c8;
  color: #fff;
}

.filter-action-icon {
  width: 15px;
  height: 15px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e5eaee;
  border-radius: 9px;
  background: #fff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.anomaly-table {
  min-width: 1120px;
}

.alarm-table {
  min-width: 1476px;
}

.recovery-table {
  min-width: 920px;
}

.data-table th,
.data-table td {
  padding: 13px 14px;
  border-bottom: 1px solid #edf0f2;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background: #f7f9fa;
  color: #586575;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.data-table td {
  color: #25364a;
  font-size: 13px;
  line-height: 19px;
  white-space: normal;
  word-break: break-word;
}

.table-wrap > table.data-table td {
  height: auto;
  min-height: 56px;
  padding: 13px 14px;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}

.table-wrap > table.data-table th {
  padding: 13px 14px;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.data-table tbody tr:last-child td {
  border-bottom: 0;
}

.clickable-row {
  cursor: pointer;
  transition: background .15s ease;
}

.clickable-row:hover,
.clickable-row.selected {
  background: #f3f8fd;
}

.clickable-row.selected td:first-child {
  box-shadow: inset 3px 0 #1677c8;
}

.table-primary {
  display: block;
  color: #122235;
  font-weight: 600;
  white-space: normal;
  word-break: break-word;
}

.table-secondary {
  display: block;
  margin-top: 3px;
  color: #84909d;
  font-size: 12px;
  line-height: 18px;
  white-space: normal;
  word-break: break-word;
}

.message-cell {
  overflow: hidden;
}

.message-cell strong {
  display: block;
  color: #25364a;
  font-weight: 550;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
}

.status-tag,
.severity-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}

.status-tag::before,
.severity-tag::before {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
  content: "";
}

.severity-danger,
.status-danger {
  border-color: #f2c9c6;
  background: #fff1f0;
  color: #cf3f3f;
}

.severity-warning,
.status-warning {
  border-color: #f3d9a6;
  background: #fff7e6;
  color: #c27600;
}

.severity-info,
.status-info {
  border-color: #bddbf2;
  background: #eaf4fd;
  color: #1677c8;
}

.status-success {
  border-color: #bfe4d2;
  background: #eaf8f1;
  color: #1f8b5c;
}

.status-neutral {
  border-color: #d8dde2;
  background: #f0f2f4;
  color: #687582;
}

.table-view-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #b8d8ef;
  border-radius: 6px;
  background: #f3f9fe;
  color: #1677c8;
  font-size: 12px;
  line-height: 26px;
  cursor: pointer;
}

.table-view-button:hover {
  border-color: #7db8df;
  background: #eaf4fd;
}

.table-view-button .icon {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
}

.table-wrap .severity-tag {
  border-color: currentColor;
}

.detail-item .status-tag {
  display: inline-flex;
}

.detail-item .status-danger {
  color: #cf3f3f;
}

.detail-item .status-warning {
  color: #c27600;
}

.detail-item .status-info {
  color: #1677c8;
}

.detail-item .status-success {
  color: #1f8b5c;
}

.detail-item .status-neutral {
  color: #687582;
}

.empty-state {
  padding: 48px 20px !important;
  color: #8995a1 !important;
  text-align: center !important;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  color: #768392;
  font-size: 12px;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 7px;
}

.page-button {
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border: 1px solid #dfe5ea;
  border-radius: 6px;
  background: #fff;
  color: #596675;
  cursor: pointer;
}

.page-button.active {
  border-color: #1677c8;
  background: #1677c8;
  color: #fff;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.recovery-process-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, .72fr);
  gap: 16px;
  margin-top: 16px;
}

.recovery-process,
.recovery-rules {
  padding: 20px;
}

.recovery-process-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f2;
}

.recovery-steps {
  padding-top: 4px;
}

.recovery-step {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 13px;
  align-items: flex-start;
  padding: 15px 0;
}

.recovery-step:not(:last-child)::after {
  position: absolute;
  top: 45px;
  bottom: -4px;
  left: 15px;
  width: 1px;
  background: #dfe5ea;
  content: "";
}

.step-number {
  position: relative;
  z-index: 1;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid #b9d7ee;
  border-radius: 50%;
  background: #eaf4fd;
  color: #1677c8;
  font-size: 13px;
  font-weight: 700;
}

.recovery-step h3,
.recovery-rule h3 {
  margin: 1px 0 4px;
  color: #25364a;
  font-size: 14px;
  line-height: 20px;
}

.recovery-step p,
.recovery-rule p {
  margin: 0;
  color: #6f7c8a;
  font-size: 13px;
  line-height: 20px;
}

.recovery-step .status-tag {
  margin-top: 4px;
}

.recovery-rules h2 {
  padding-bottom: 14px;
  border-bottom: 1px solid #edf0f2;
}

.recovery-rule {
  padding: 13px 0;
  border-bottom: 1px dashed #e5eaee;
}

.recovery-rule:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.modal-overlay,
.alert-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(8, 21, 35, .46);
  opacity: 0;
  transition: opacity .18s ease;
}

.modal-overlay.open,
.alert-overlay.open {
  opacity: 1;
}

.exception-modal,
.record-modal,
.launch-modal,
.status-modal {
  width: min(920px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: auto;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 52px rgba(8, 21, 35, .2);
  transform: translateY(8px) scale(.99);
  transition: transform .18s ease;
}

.record-modal {
  width: min(820px, calc(100vw - 48px));
}

.launch-modal,
.status-modal {
  width: min(620px, calc(100vw - 48px));
}

.modal-overlay.open > section {
  transform: translateY(0) scale(1);
}

.modal-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #edf0f2;
  background: #fff;
}

.modal-header h2 {
  margin: 0;
  color: #122235;
  font-size: 17px;
  line-height: 24px;
}

.modal-header p {
  margin: 4px 0 0;
  color: #768392;
  font-size: 12px;
  line-height: 18px;
}

.modal-x {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #758291;
  font-size: 22px;
  cursor: pointer;
}

.modal-x:hover {
  background: #f2f5f7;
  color: #122235;
}

.modal-body {
  padding: 20px 22px 22px;
}

.exception-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 13px;
  align-items: flex-start;
  padding: 15px;
  border: 1px solid #f1d3d0;
  border-radius: 9px;
  background: #fff8f7;
}

.exception-summary.warning {
  border-color: #f2dfb9;
  background: #fffaf0;
}

.exception-summary h3 {
  margin: 1px 0 4px;
  color: #25364a;
  font-size: 14px;
  line-height: 20px;
}

.exception-summary p {
  margin: 0;
  color: #667483;
  font-size: 13px;
  line-height: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 20px 0 10px;
}

.section-title h3 {
  margin: 0;
  color: #25364a;
  font-size: 14px;
  line-height: 20px;
}

.section-title span {
  color: #8995a1;
  font-size: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.detail-item {
  min-width: 0;
  padding: 12px 13px;
  border: 1px solid #edf0f2;
  border-radius: 8px;
  background: #fafbfc;
}

.detail-item.wide {
  grid-column: span 2;
}

.detail-item.full {
  grid-column: 1 / -1;
}

.detail-label {
  display: block;
  margin-bottom: 4px;
  color: #84909d;
  font-size: 12px;
  line-height: 18px;
}

.detail-value {
  display: block;
  overflow-wrap: anywhere;
  color: #25364a;
  font-size: 13px;
  font-weight: 550;
  line-height: 20px;
}

.protection-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.protection-item {
  min-height: 76px;
  padding: 12px 13px;
  border: 1px solid #dbe9f4;
  border-radius: 8px;
  background: #f5fafe;
}

.protection-item strong {
  display: block;
  margin-bottom: 4px;
  color: #216693;
  font-size: 12px;
}

.protection-item p {
  margin: 0;
  color: #5f7080;
  font-size: 12px;
  line-height: 18px;
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.route-card {
  position: relative;
  padding: 15px;
  border: 1px solid #dfe5ea;
  border-radius: 9px;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}

.route-card:hover,
.route-card.active {
  border-color: #69aadb;
  background: #f6fbff;
  box-shadow: 0 0 0 2px rgba(22, 119, 200, .06);
}

.route-card h4 {
  margin: 0 0 5px;
  color: #25364a;
  font-size: 14px;
}

.route-card p {
  margin: 0;
  color: #768392;
  font-size: 12px;
  line-height: 19px;
}

.route-panel {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #e5eaee;
  border-radius: 9px;
  background: #fafbfc;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-field.wide {
  grid-column: 1 / -1;
}

.form-field > span {
  color: #394b5e;
  font-size: 13px;
  font-weight: 550;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid #dfe5ea;
  border-radius: 7px;
  background: #fff;
  color: #25364a;
  outline: 0;
}

.form-field textarea {
  min-height: 82px;
  resize: vertical;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #69aadb;
  box-shadow: 0 0 0 2px rgba(22, 119, 200, .09);
}

.confirm-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  color: #596675;
  font-size: 12px;
  line-height: 18px;
}

.confirm-line input {
  margin: 2px 0 0;
}

.route-submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.route-action {
  border: 1px solid #1677c8;
  background: #1677c8;
  color: #fff;
}

.route-action:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.suggestion-list {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: recovery-step;
}

.suggestion-list li {
  position: relative;
  min-height: 30px;
  padding: 5px 0 5px 34px;
  color: #596675;
  font-size: 13px;
  line-height: 20px;
  counter-increment: recovery-step;
}

.suggestion-list li::before {
  position: absolute;
  top: 4px;
  left: 0;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eef5fb;
  color: #1677c8;
  font-size: 11px;
  font-weight: 700;
  content: counter(recovery-step);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #edf0f2;
}

.readonly-note {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 7px;
  background: #f5f7f9;
  color: #758291;
  font-size: 12px;
  line-height: 18px;
}

.alert-overlay {
  place-items: stretch;
  padding: 0;
}

.alert-drawer {
  width: min(390px, 92vw);
  height: 100%;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: -12px 0 36px rgba(8, 21, 35, .16);
  transform: translateX(100%);
  transition: transform .2s ease;
}

.alert-overlay.open .alert-drawer {
  transform: translateX(0);
}

.alert-header,
.alert-footer {
  padding: 18px 20px;
  border-bottom: 1px solid #edf0f2;
}

.alert-header h2 {
  margin: 0;
  font-size: 17px;
}

.alert-header p {
  margin: 4px 0 0;
  color: #768392;
  font-size: 12px;
}

.alert-feed {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.alert-card {
  margin-bottom: 8px;
  padding: 13px;
  border: 1px solid #e6eaee;
  border-radius: 8px;
  background: #fff;
}

.alert-card strong {
  color: #25364a;
  font-size: 13px;
  line-height: 20px;
}

.alert-card p {
  margin: 5px 0 0;
  color: #84909d;
  font-size: 12px;
}

.alert-footer {
  border-top: 1px solid #edf0f2;
  border-bottom: 0;
}

.alert-footer .primary-action {
  width: 100%;
}

.status-list {
  display: grid;
  gap: 10px;
}

.status-item {
  padding: 12px 13px;
  border: 1px solid #e6eaee;
  border-radius: 8px;
}

.status-item strong {
  color: #25364a;
  font-size: 13px;
}

.status-item p {
  margin: 4px 0 0;
  color: #758291;
  font-size: 12px;
  line-height: 18px;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 160;
  max-width: 360px;
  padding: 11px 15px;
  border-radius: 8px;
  background: rgba(18, 34, 53, .94);
  color: #fff;
  font-size: 13px;
  box-shadow: 0 12px 30px rgba(8, 21, 35, .2);
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition: opacity .18s ease, transform .18s ease;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 1180px) {
  .filters {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }

  .recovery-process-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .page-canvas {
    padding: 12px;
  }

  .module-tabs {
    overflow-x: auto;
    padding: 0 6px;
  }

  .module-tab {
    padding: 0 12px;
    white-space: nowrap;
  }

  .module-tab.active::after {
    right: 12px;
    left: 12px;
  }

  .module-content,
  .recovery-process,
  .recovery-rules {
    padding: 16px 12px;
  }

  .list-heading,
  .recovery-process-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filters,
  .form-grid,
  .route-grid,
  .detail-grid,
  .protection-strip {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: stretch;
  }

  .filter-btn {
    flex: 1;
  }

  .detail-item.wide,
  .detail-item.full,
  .form-field.wide {
    grid-column: auto;
  }

  .recovery-step {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .recovery-step .status-tag {
    grid-column: 2;
    justify-self: start;
  }

  .modal-overlay {
    padding: 12px;
  }

  .exception-modal,
  .record-modal,
  .launch-modal,
  .status-modal {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .modal-header,
  .modal-body {
    padding-right: 16px;
    padding-left: 16px;
  }

  .table-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
<style scoped>
.recovery-panel{overflow:hidden;border:1px solid #e8edf1;box-shadow:0 8px 28px rgba(25,49,74,.045)}.module-content{padding:22px 20px 18px}.list-heading{align-items:center;margin-bottom:16px}.list-heading h2{font-size:18px}.ops-filter{display:grid;grid-template-columns:minmax(260px,1.4fr) minmax(210px,.8fr) auto;gap:10px;margin-bottom:18px;padding:12px;border:1px solid #edf0f2;border-radius:10px;background:#fafbfc}.ops-filter .filter-actions{min-width:164px}.ops-table{min-width:1080px}.ops-table th{height:44px;padding:0 14px;color:#647181;background:#f7f9fb}.ops-table td{height:68px;padding:13px 14px}.ops-table tbody tr{transition:background .15s ease,box-shadow .15s ease}.ops-table tbody tr:hover{background:#f5f9fd;box-shadow:inset 3px 0 #1677c8}.ops-table .table-primary{font-size:13px;line-height:20px}.ops-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#25364a;font-size:12px;font-weight:650}.ops-description-meta{display:flex;align-items:center;gap:8px;min-height:24px;margin-top:5px}.emergency-rule-chip{display:inline-flex;align-items:center;gap:5px;min-height:22px;padding:2px 8px;border:1px solid #f3c8c4;border-radius:6px;color:#c33e37;background:#fff1f0;font-size:11px;font-weight:700;line-height:16px;white-space:nowrap}.emergency-rule-chip i{width:15px;height:15px;display:grid;place-items:center;border-radius:50%;color:#fff;background:#d94b44;font-size:10px;font-style:normal}.level-chip,.scope-chip,.readonly-chip,.ticket-chip{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}.level-chip.l1{color:#287b56;background:#e9f7f0}.level-chip.l2{color:#246fa8;background:#eaf4fd}.level-chip.l3{color:#a86b00;background:#fff5db}.level-chip.l4{color:#c8453e;background:#fff0ef}.scope-chip.line{color:#c8453e;background:#fff0ef}.scope-chip.mechanism{color:#a86b00;background:#fff5db}.scope-chip.unit{color:#246fa8;background:#eaf4fd}.readonly-chip{color:#687482;background:#f1f3f5}.ticket-chip{margin-right:5px;color:#246fa8;background:#eaf4fd;text-decoration:none}.ops-modal{width:min(920px,calc(100vw - 40px));max-height:calc(100vh - 48px)}.ops-modal .modal-body{padding:20px 22px;overflow:auto}.ops-modal-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid #edf0f2;background:#fff}.footer-hint{margin-right:auto;color:#768392;font-size:12px}.ops-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:20px}.ops-summary-item{min-width:0;padding:13px 14px;border:1px solid #e6ebef;border-radius:9px;background:#fafbfc}.ops-summary-item.wide{grid-column:span 2}.ops-summary-item span{display:block;margin-bottom:6px;color:#84909d;font-size:11px}.ops-summary-item strong{display:block;color:#25364a;font-size:13px;line-height:1.55}.ops-section{margin-top:20px}.ops-section-title{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px}.ops-section-title h3{margin:0;color:#122235;font-size:14px}.ops-section-title span{color:#84909d;font-size:11px}.protection-list,.procedure-list,.checkpoint-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.protection-item,.procedure-item,.checkpoint-item{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;border:1px solid #e6ebef;border-radius:8px;background:#fff;color:#405064;font-size:12px;line-height:1.6}.protection-item::before,.checkpoint-item::before{content:"✓";width:19px;height:19px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;color:#218657;background:#e9f7f0;font-size:11px;font-weight:700}.checkpoint-item.pending::before{content:"·";color:#7d8996;background:#eef1f3}.checkpoint-item.checking::before{content:"…";color:#246fa8;background:#eaf4fd}.procedure-item{counter-increment:procedure}.procedure-list{counter-reset:procedure}.procedure-item::before{content:counter(procedure);width:21px;height:21px;display:grid;place-items:center;flex:0 0 auto;border-radius:6px;color:#246fa8;background:#eaf4fd;font-size:11px;font-weight:700}.reconcile-table{width:100%;border-collapse:collapse;border:1px solid #e6ebef;border-radius:8px;overflow:hidden}.reconcile-table th,.reconcile-table td{padding:10px 12px;border-bottom:1px solid #edf0f2;text-align:left;font-size:12px}.reconcile-table th{color:#687482;background:#f7f9fa}.match-ok{color:#218657;font-weight:650}.match-bad{color:#c8453e;font-weight:650}.confirm-list{display:grid;gap:8px}.confirm-item{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;border:1px solid #e6ebef;border-radius:8px;color:#405064;font-size:12px;line-height:1.55;cursor:pointer}.confirm-item input{margin-top:3px}.role-chip{margin-left:auto;padding:2px 7px;border-radius:5px;color:#687482;background:#f1f3f5;font-size:10px;white-space:nowrap}.verify-row{display:flex;align-items:center;gap:10px;margin-top:10px}.verify-row small{color:#84909d}.recovery-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.recovery-option{padding:13px 14px;border:1px solid #dfe5ea;border-radius:9px;background:#fff;text-align:left;cursor:pointer}.recovery-option:hover,.recovery-option.selected{border-color:#69aadb;background:#f3f8fd}.recovery-option strong{display:block;color:#25364a;font-size:13px}.recovery-option span{display:block;margin-top:5px;color:#84909d;font-size:11px;line-height:1.5}.warning-note{margin-top:14px;padding:12px 14px;border-left:3px solid #e6a814;border-radius:6px;background:#fff8e7;color:#7e5b08;font-size:12px;line-height:1.65}.procedure-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px}.link-inline{color:#1677c8;text-decoration:none}.link-inline:hover{text-decoration:underline}@media(max-width:900px){.ops-filter{grid-template-columns:1fr}.ops-filter .filter-actions{justify-content:flex-start}.ops-summary{grid-template-columns:1fr 1fr}.recovery-options{grid-template-columns:1fr}}@media(max-width:600px){.ops-summary{grid-template-columns:1fr}.ops-summary-item.wide{grid-column:auto}.ops-modal{width:calc(100vw - 20px)}.procedure-filter{grid-template-columns:1fr}}

.module-content{padding:16px}
.recovery-panel{border-color:#e5eaee;border-radius:10px;box-shadow:0 4px 18px rgba(25,49,74,.04)}
.recovery-panel .table-wrap{overflow-x:auto;border-color:#e7ebef;border-radius:8px}
.ops-table{width:100%;table-layout:fixed}
.ops-table th{height:42px;padding:0 12px;font-size:12px;font-weight:600}
.ops-table td{height:66px;padding:11px 12px;vertical-align:middle}
.ops-table tbody tr:last-child td{border-bottom:0}
.workorder-ops-table{min-width:900px}
.workorder-ops-table .col-code{width:17%}
.workorder-ops-table .col-description{width:24%}
.workorder-ops-table .col-level{width:12%}
.workorder-ops-table .col-object{width:23%}
.workorder-ops-table .col-time{width:14%}
.workorder-ops-table .col-status{width:10%}
.workorder-ops-table td:first-child{white-space:nowrap;letter-spacing:-.02em}
.workorder-ops-table td:nth-child(5){font-size:12px;line-height:1.55;white-space:normal}
.workorder-ops-table td:last-child,.workorder-ops-table th:last-child{text-align:center}
.workorder-ops-table .status-tag{min-width:62px;padding:5px 9px;border:0;border-radius:999px;font-size:11px;font-weight:650;line-height:18px;white-space:nowrap}
.workorder-ops-table .status-tag.critical{color:#c8453e;background:#fff0ef}
.workorder-ops-table .status-tag.warning{color:#a86b00;background:#fff5db}
.workorder-ops-table .status-tag.valid{color:#287b56;background:#e9f7f0}
.procedure-ops-table{min-width:820px}
.procedure-ops-table .col-rule{width:10%}
.procedure-ops-table .col-scene{width:33%}
.procedure-ops-table .col-scope{width:13%}
.procedure-ops-table .col-duty{width:18%}
.procedure-ops-table .col-ticket{width:16%}
.procedure-ops-table .col-action{width:10%}
.procedure-ops-table td:first-child,.procedure-ops-table td:last-child{white-space:nowrap}
.procedure-ops-table td:nth-child(5){white-space:nowrap}
.procedure-ops-table th:last-child,.procedure-status-cell{text-align:center}
.procedure-ops-table th:last-child,.procedure-ops-table td:last-child{position:static!important;right:auto!important;z-index:auto!important;box-shadow:none!important}
.procedure-ops-table .table-secondary{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:1}
.procedure-ops-table td{height:64px}
.procedure-switch{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:2px;border:0;border-radius:999px;color:#7b8792;background:transparent;cursor:pointer}
.procedure-switch-track{position:relative;width:34px;height:18px;flex:0 0 34px;border-radius:999px;background:#c9d0d6;box-shadow:inset 0 0 0 1px rgba(8,24,41,.06);transition:background .18s ease}
.procedure-switch-track::after{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(8,24,41,.24);content:"";transition:transform .18s ease}
.procedure-switch strong{min-width:24px;color:inherit;font-size:11px;font-weight:600;line-height:18px}
.procedure-switch.is-on{color:#218657}
.procedure-switch.is-on .procedure-switch-track{background:#2f9d6a}
.procedure-switch.is-on .procedure-switch-track::after{transform:translateX(16px)}
.procedure-switch:hover{background:#f4f7f8}
.procedure-switch:focus-visible{outline:2px solid rgba(22,119,200,.28);outline-offset:2px}
.confirm-item{align-items:flex-start}.confirm-item input[type="checkbox"]{width:16px;height:16px;min-width:16px;min-height:16px;flex:0 0 16px;margin:1px 0 0;accent-color:#1677c8}.confirm-item>span{min-width:0;flex:1}.confirm-item .role-chip{flex:0 0 auto}
.procedure-ticket-link{max-width:100%;box-sizing:border-box;gap:7px;min-height:28px;padding:4px 8px;overflow:hidden;border:1px solid #cfe2f2;text-overflow:ellipsis;transition:border-color .15s ease,background .15s ease}.procedure-ticket-link:hover{border-color:#7db4dd;background:#dfedf9}.procedure-ticket-link span{margin:0;color:inherit;font-size:13px}
</style>
<style scoped>
.operations-reference-page { padding: 0; }
.operations-reference-page > .page-head { margin: 0; padding: 17px 20px; }
.link-button { padding: 0; border: 0; background: transparent; cursor: pointer; }
.clickable-row { cursor: pointer; }
.ops-section { padding-top: 0; border-top: 0; }
.warning-note { border-top: 0; border-right: 0; border-bottom: 0; }
.primary-action:disabled,.modal-primary:disabled,.recovery-option:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width:760px) { .operations-reference-page > .page-head { padding:14px; } }
</style>
