<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'

const piles = ref([
  { code:'CHG-01', brand:'HIKROBOT', model:'CR-2400', space:'空间 B / 总览地图 V3.2', protocol:'Modbus TCP', power:'2.4 kW', navPoint:'CHG-B-01', status:'启用' },
  { code:'CHG-02', brand:'STANDARD ROBOTS', model:'SR-CHG-24', space:'空间 A / 总览地图 V3.2', protocol:'REST API', power:'2.0 kW', navPoint:'CHG-A-02', status:'禁用' },
])
const batteries = ref([
  { code:'BAT-01', brand:'CATL', model:'LFP-48-100', type:'磷酸铁锂', specification:'48 V / 100 Ah', lowThreshold:'20%', resumeThreshold:'80%', status:'启用' },
  { code:'BAT-02', brand:'EVE', model:'LF105', type:'磷酸铁锂', specification:'48 V / 105 Ah', lowThreshold:'25%', resumeThreshold:'85%', status:'禁用' },
])
const active = ref('piles')
const dialogVisible = ref(false)
const editingIndex = ref(-1)
const testing = ref(false)
const form = reactive({})
const rows = computed(() => active.value === 'piles' ? piles.value : batteries.value)
const pileMode = computed(() => active.value === 'piles')

function openEditor(index = -1) {
  editingIndex.value = index
  Object.keys(form).forEach((key) => delete form[key])
  const row = rows.value[index]
  if (row) Object.assign(form, structuredClone(row))
  else if (pileMode.value) Object.assign(form, { code:'', brand:'', model:'', space:'空间 A / 总览地图 V3.2', protocol:'Modbus TCP', power:'2.4 kW', navPoint:'', status:'启用' })
  else Object.assign(form, { code:'', brand:'', model:'', type:'磷酸铁锂', specification:'48 V / 100 Ah', lowThreshold:'20%', resumeThreshold:'80%', status:'启用' })
  dialogVisible.value = true
}

function save() {
  if (!form.code?.trim() || !form.brand?.trim() || !form.model?.trim()) return ElMessage.warning('请完整填写编号、品牌和型号')
  const updated = editingIndex.value >= 0
  if (updated) rows.value[editingIndex.value] = { ...form }
  else rows.value.unshift({ ...form })
  dialogVisible.value = false
  ElMessage.success(updated ? '配置已更新' : '配置已新增')
}

async function remove(index) {
  try { await ElMessageBox.confirm(`确认删除“${rows.value[index].code}”吗？`, '删除配置', { type:'warning' }); const code = rows.value[index].code; rows.value.splice(index,1); ElMessage.success(`${code} 已删除`) }
  catch (error) { if (!['cancel','close'].includes(error)) ElMessage.error(error?.message || '删除失败') }
}

function test() {
  testing.value = true
  window.setTimeout(() => { testing.value = false; ElMessage.success(`连接测试完成：${piles.value.filter(item => item.status === '启用').length} 个充电桩连接正常`) }, 700)
}
</script>

<template>
  <div class="page-view charging-reference-page">
    <PageHeader class="page-head" title="充电桩与电池配置" description="维护充电设备、电池参数及低电量调度策略">
      <button class="primary-btn" type="button" :aria-label="pileMode ? '新增充电桩' : '新增电池配置'" @click="openEditor()"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>{{ pileMode ? '新增充电桩' : '新增电池配置' }}</span></button>
    </PageHeader>
    <main class="page-canvas charging-page"><section class="config-panel">
      <header class="panel-toolbar"><div class="config-tabs" role="tablist" aria-label="配置类型"><button :class="['config-tab',{active:pileMode}]" type="button" role="tab" :aria-selected="pileMode" @click="active='piles'">充电桩配置</button><button :class="['config-tab',{active:!pileMode}]" type="button" role="tab" :aria-selected="!pileMode" @click="active='batteries'">电池配置</button></div><button v-if="pileMode" class="secondary-btn test-button" type="button" :disabled="testing" @click="test"><template v-if="testing">测试中…</template><template v-else><svg viewBox="0 0 24 24"><path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="9"/></svg>连接测试</template></button></header>
      <div v-if="pileMode" class="table-wrap" role="tabpanel"><table aria-label="充电桩配置列表"><thead><tr><th>桩编号</th><th>品牌</th><th>型号</th><th>所属空间（地图）</th><th>通信协议</th><th>额定功率</th><th>关联导航点</th><th>状态</th><th class="col-actions">操作</th></tr></thead><tbody><tr v-for="(row,index) in piles" :key="row.code"><td class="code-cell">{{ row.code }}</td><td>{{ row.brand }}</td><td>{{ row.model }}</td><td>{{ row.space }}</td><td>{{ row.protocol }}</td><td>{{ row.power }}</td><td>{{ row.navPoint }}</td><td><span :class="['status-tag',row.status==='禁用'?'disabled':'enabled']">{{ row.status }}</span></td><td class="col-actions"><div class="row-actions"><button class="row-btn" type="button" @click="openEditor(index)">编辑</button><button class="row-btn danger" type="button" @click="remove(index)">删除</button></div></td></tr></tbody></table></div>
      <div v-else class="table-wrap" role="tabpanel"><table aria-label="电池配置列表"><thead><tr><th>配置编号</th><th>电池品牌</th><th>电池型号</th><th>电池类型</th><th>额定电压 / 容量</th><th>低电量阈值</th><th>恢复任务阈值</th><th>状态</th><th class="col-actions">操作</th></tr></thead><tbody><tr v-for="(row,index) in batteries" :key="row.code"><td class="code-cell">{{ row.code }}</td><td>{{ row.brand }}</td><td>{{ row.model }}</td><td>{{ row.type }}</td><td>{{ row.specification }}</td><td>{{ row.lowThreshold }}</td><td>{{ row.resumeThreshold }}</td><td><span :class="['status-tag',row.status==='禁用'?'disabled':'enabled']">{{ row.status }}</span></td><td class="col-actions"><div class="row-actions"><button class="row-btn" type="button" @click="openEditor(index)">编辑</button><button class="row-btn danger" type="button" @click="remove(index)">删除</button></div></td></tr></tbody></table></div>
      <footer class="table-footer"><span>共 {{ rows.length }} 条数据</span><div class="pagination"><button type="button" disabled>‹</button><button class="active" type="button">1</button><button type="button" disabled>›</button></div></footer>
    </section></main>

    <div v-if="dialogVisible" class="modal-overlay open" @click.self="dialogVisible = false"><section class="modal-card" role="dialog" aria-modal="true"><div class="modal-title-row"><div><h2>{{ editingIndex >= 0 ? '编辑' : '新增' }}{{ pileMode ? '充电桩' : '电池配置' }}</h2><p>{{ pileMode ? '维护充电桩品牌、协议和运行状态' : '维护电池品牌、规格和调度阈值' }}</p></div><button class="modal-x" type="button" aria-label="关闭" @click="dialogVisible = false">×</button></div><form class="form-grid" @submit.prevent="save">
      <template v-if="pileMode"><label class="form-field"><span>桩编号</span><input v-model="form.code" required></label><label class="form-field"><span>品牌</span><input v-model="form.brand" required></label><label class="form-field"><span>型号</span><input v-model="form.model" required></label><label class="form-field"><span>通信协议</span><select v-model="form.protocol"><option>Modbus TCP</option><option>REST API</option><option>OPC UA</option></select></label><label class="form-field wide"><span>所属空间（地图）</span><input v-model="form.space" required></label><label class="form-field"><span>额定功率</span><input v-model="form.power" required></label><label class="form-field"><span>关联导航点</span><input v-model="form.navPoint" required></label><label class="form-field"><span>状态</span><select v-model="form.status"><option>启用</option><option>禁用</option></select></label></template>
      <template v-else><label class="form-field"><span>配置编号</span><input v-model="form.code" required></label><label class="form-field"><span>电池品牌</span><input v-model="form.brand" required></label><label class="form-field"><span>电池型号</span><input v-model="form.model" required></label><label class="form-field"><span>电池类型</span><select v-model="form.type"><option>磷酸铁锂</option><option>三元锂</option><option>钛酸锂</option></select></label><label class="form-field"><span>额定电压 / 容量</span><input v-model="form.specification" required></label><label class="form-field"><span>低电量阈值</span><input v-model="form.lowThreshold" required></label><label class="form-field"><span>恢复任务阈值</span><input v-model="form.resumeThreshold" required></label><label class="form-field"><span>状态</span><select v-model="form.status"><option>启用</option><option>禁用</option></select></label></template>
      <div class="modal-actions wide"><button class="modal-close" type="button" @click="dialogVisible = false">取消</button><button class="modal-primary" type="submit">保存</button></div>
    </form></section></div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
.primary-btn,.secondary-btn { min-height:36px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 16px; border-radius:7px; font-size:13px; font-weight:650; cursor:pointer; }
.primary-btn { border:1px solid var(--agv-blue); color:#fff; background:var(--agv-blue); }
.primary-btn:hover { border-color:var(--agv-blue-hover); background:var(--agv-blue-hover); }
.primary-btn svg,.secondary-btn svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.secondary-btn { border:1px solid var(--agv-line); color:var(--agv-ink); background:#fff; }
.secondary-btn:hover { border-color:var(--agv-blue); color:var(--agv-blue); }

.charging-page { min-height:calc(100vh - 148px); }

.config-panel { overflow:hidden; border:1px solid var(--agv-line-soft); border-radius:11px; background:#fff; }
.panel-toolbar { min-height:68px; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; border-bottom:1px solid var(--agv-line-soft); background:#fbfcfd; }
.config-tabs { display:inline-flex; padding:3px; border-radius:8px; background:#edf1f4; }
.config-tab { min-height:34px; padding:0 18px; border:0; border-radius:6px; color:var(--agv-text-secondary); background:transparent; font-size:12px; cursor:pointer; }
.config-tab.active { color:var(--agv-blue); background:#fff; box-shadow:0 2px 7px rgba(17,42,65,.09); font-weight:700; }
.test-button:disabled { cursor:wait; opacity:.62; }

.table-wrap { overflow-x:auto; }
table { width:100%; min-width:1220px; border-collapse:separate; border-spacing:0; }
th,td { padding:0 14px; text-align:left; white-space:nowrap; border-bottom:1px solid var(--agv-line-soft); }
th { height:48px; color:var(--agv-text-secondary); background:#fafbfc; font-size:12px; font-weight:650; }
td { height:64px; font-size:12px; }
tbody tr:hover td { background:#f8fbfd; }
.code-cell { font-weight:700; }
.brand-cell strong,.brand-cell small { display:block; }
.brand-cell strong { font-size:12px; letter-spacing:.02em; }
.brand-cell small { margin-top:4px; color:var(--agv-text-muted); font-size:10px; }
.status-tag { display:inline-flex; align-items:center; gap:6px; min-height:25px; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:700; }
.status-tag::before { width:5px; height:5px; border-radius:50%; background:currentColor; content:""; }
.status-tag.enabled { color:var(--agv-green); border-color:#cce9da; background:#effaf4; }
.status-tag.disabled { color:#7b8792; border-color:#dfe4e8; background:#f5f7f8; }
.row-actions { display:flex; gap:6px; }
.row-btn { min-height:29px; padding:0 10px; border:1px solid var(--agv-line); border-radius:6px; color:var(--agv-text-secondary); background:#fff; font-size:10px; cursor:pointer; }
.row-btn:hover { border-color:var(--agv-blue); color:var(--agv-blue); }
.row-btn.danger { color:var(--agv-red); border-color:#efd0ce; background:#fff7f6; }
.table-footer { min-height:56px; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 16px; color:var(--agv-text-muted); font-size:11px; }
.pagination { display:flex; gap:5px; }
.pagination button { width:30px; height:30px; border:1px solid var(--agv-line); border-radius:6px; background:#fff; }
.pagination button.active { border-color:var(--agv-blue); color:#fff; background:var(--agv-blue); }
.pagination button:disabled { opacity:.45; }

.modal-overlay,.alert-overlay { position:fixed; inset:0; z-index:70; background:rgba(0,0,0,.45); opacity:0; transition:opacity .2s; }
.modal-overlay.open,.alert-overlay.open { opacity:1; }
.modal-overlay { display:grid; place-items:center; padding:24px; }
.modal-card { width:min(680px,calc(100vw - 32px)); max-height:calc(100vh - 48px); overflow:auto; padding:24px; border-radius:8px; background:#fff; box-shadow:0 9px 28px 8px rgba(0,0,0,.08); }
.modal-card.small-modal { width:min(460px,calc(100vw - 32px)); }
.modal-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:20px; }
.modal-title-row h2,.modal-card > h2 { margin:0 0 4px; font-size:16px; }
.modal-title-row p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.modal-x { width:30px; height:30px; display:grid; place-items:center; padding:0; border:0; border-radius:6px; color:#7b8792; background:transparent; font-size:24px; cursor:pointer; }
.modal-x:hover { color:var(--agv-ink); background:#f1f3f5; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.form-field { display:grid; gap:8px; }
.form-field span { font-size:13px; }
.form-field input,.form-field select { min-height:38px; padding:0 10px; border:1px solid var(--agv-line); border-radius:7px; outline:0; background:#fff; }
.form-field input:focus,.form-field select:focus { border-color:var(--agv-blue); box-shadow:0 0 0 2px rgba(22,119,200,.1); }
.wide { grid-column:1/-1; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:16px; border-top:1px solid var(--agv-line-soft); }
.modal-close,.modal-primary { min-height:32px; padding:0 15px; border-radius:6px; font-size:13px; cursor:pointer; }
.modal-close { border:1px solid var(--agv-line); background:#fff; }
.modal-primary { border:1px solid var(--agv-blue); color:#fff; background:var(--agv-blue); }
.status-note { padding:14px; border-left:3px solid var(--agv-green); border-radius:0 8px 8px 0; background:#ecf8f2; }
.status-note strong { color:var(--agv-green); font-size:13px; }
.status-note p { margin:6px 0 0; color:var(--agv-text-secondary); font-size:12px; }
.alert-overlay { z-index:75; }
.alert-drawer { position:absolute; inset:0 0 0 auto; width:min(420px,100vw); display:grid; grid-template-rows:auto 1fr auto; background:#f5f7f9; transform:translateX(100%); transition:transform .24s; }
.alert-overlay.open .alert-drawer { transform:none; }
.alert-drawer header,.alert-drawer footer { padding:18px; background:#fff; }
.alert-drawer header { border-bottom:1px solid var(--agv-line-soft); }
.alert-drawer h2 { margin:0 0 5px; font-size:18px; }
.alert-drawer p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.alert-empty { display:grid; place-items:center; color:var(--agv-text-muted); font-size:12px; }
.alert-drawer footer { border-top:1px solid var(--agv-line-soft); text-align:center; }
.alert-drawer footer a { min-height:36px; display:inline-flex; align-items:center; justify-content:center; padding:0 24px; border-radius:7px; color:#fff; background:var(--agv-blue); text-decoration:none; }
.toast { position:fixed; left:50%; bottom:24px; z-index:90; padding:11px 16px; border-radius:8px; color:#fff; background:rgba(12,29,47,.92); font-size:13px; opacity:0; pointer-events:none; transform:translate(-50%,20px); transition:.22s; }
.toast.show { opacity:1; transform:translate(-50%,0); }

@media (max-width:600px) {
  .panel-toolbar { align-items:stretch; flex-direction:column; }
  .config-tabs,.test-button { width:100%; }
  .config-tab { flex:1; padding:0 8px; }
  .form-grid { grid-template-columns:1fr; }
  .wide { grid-column:auto; }
  .page-head .primary-btn { width:36px; padding:0; }
  .page-head .primary-btn span { display:none; }
}
</style>
