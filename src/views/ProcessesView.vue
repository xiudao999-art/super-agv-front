<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import PaginationBar from '../components/PaginationBar.vue'
import { createResource, getFlow, listResource, listResourcePage, updateFlow } from '../api/agv'

const rows = ref([])
const templates = ref([])
const keywordInput = ref('')
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const hydratingForm = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const form = reactive({ templateName:'', sourceTemplateId:'', applicableScope:'', status:1, description:'' })
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const statusLabel = (row) => row.statusLabel || ([1,'1',true,'ENABLED','ACTIVE'].includes(row.status) ? '启用' : [0,'0',false,'DISABLED','INACTIVE'].includes(row.status) ? '停用' : '未返回')

watch(pageCount, (count) => { if (page.value > count) page.value = count })
watch(() => form.sourceTemplateId, (id) => { if (hydratingForm.value) return; const item = templates.value.find(t => String(t.id) === String(id)); if (item?.applicableObject) form.applicableScope = item.applicableObject }, { flush:'sync' })

async function load() {
  loading.value = true
  try {
    const [result, templateRows] = await Promise.all([listResourcePage('processes', { pageNum:page.value, pageSize:pageSize.value }), listResource('workflows')])
    rows.value = result.records; total.value = result.total; templates.value = templateRows
  }
  catch (error) { rows.value = []; ElMessage.error(`流程加载失败：${error.message}`) }
  finally { loading.value = false }
}

function fillForm(row = null) {
  const source = templates.value.find(item => String(item.id) === String(row?.sourceTemplateId)) || templates.value.find(item => item.templateName === (row?.templateName || row?.template)) || templates.value[0]
  Object.assign(form, { templateName:row?.flowName || row?.name || '智能仓储->贴标机台', sourceTemplateId:row?.sourceTemplateId || source?.id || '', applicableScope:row?.applicableScope || source?.applicableObject || '贴标机台', status:row?.status != null ? Number(row.status) : ['停用','已停用'].includes(statusLabel(row || {})) ? 0 : 1, description:row?.description || '由上游业务订单触发，按照所选流程模板执行。' })
}

async function loadRows() {
  loading.value = true
  try { const result = await listResourcePage('processes', { pageNum:page.value, pageSize:pageSize.value, keyword:keyword.value || undefined }); rows.value = result.records; total.value = result.total }
  catch (error) { rows.value = []; ElMessage.error(`流程加载失败：${error.message}`) }
  finally { loading.value = false }
}

async function openForm(row = null) {
  hydratingForm.value = true
  try {
    if (row?.id != null) {
      const detail = await getFlow(row.id)
      editingId.value = row.id
      fillForm(detail)
    } else {
      editingId.value = null
      fillForm()
    }
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(`流程详情加载失败：${error.message}`)
  } finally {
    hydratingForm.value = false
  }
}

async function save() {
  if (!form.templateName.trim()) return ElMessage.warning('请填写流程名称')
  if (!Number(form.sourceTemplateId)) return ElMessage.warning('请选择来源流程模板')
  saving.value = true
  try {
    if (editingId.value == null) {
      await createResource('processes', { templateName:form.templateName.trim(), sourceTemplateId:Number(form.sourceTemplateId), description:form.description.trim(), status:Number(form.status), applicableScope:form.applicableScope.trim() })
      ElMessage.success('流程创建成功'); await load()
    } else {
      await updateFlow(editingId.value, { flowName:form.templateName.trim(), sourceTemplateId:Number(form.sourceTemplateId), status:Number(form.status), applicableScope:form.applicableScope.trim(), description:form.description.trim() })
      ElMessage.success('流程信息已保存')
      await load()
    }
    dialogVisible.value = false
  } catch (error) { ElMessage.error(`${editingId.value == null ? '创建' : '保存'}失败：${error.message}`) }
  finally { saving.value = false }
}

async function changePage(value) { page.value = value; await loadRows() }
async function changePageSize(value) { pageSize.value = value; page.value = 1; await loadRows() }
async function search() { keyword.value = keywordInput.value.trim(); page.value = 1; await loadRows() }
async function resetSearch() { keywordInput.value = ''; keyword.value = ''; page.value = 1; await loadRows() }

onMounted(load)
</script>

<template>
  <div class="page-view process-reference-page">
    <PageHeader class="page-head" title="流程与动作" description="维护业务流程名称、模板引用和执行节点；流程保存后直接生效，不设置审核和版本号"><button class="head-btn" type="button" @click="openForm()"><svg class="icon"><use href="#i-plus" /></svg>新建流程</button></PageHeader>
    <div class="page-canvas"><section class="page-panel"><div class="tabs-row"><nav class="tabs"><router-link class="tab-btn active" to="/workflows/processes">流程列表</router-link><i class="tab-divider"/><router-link class="tab-btn" to="/workflows/templates">流程模板</router-link></nav></div><div class="content">
      <div class="list-head"><div><h2>流程列表</h2></div></div>
      <form class="filter-bar" @submit.prevent="search"><label class="filter"><span>流程名称</span><input v-model="keywordInput" placeholder="请输入流程名称" @keydown.esc="resetSearch"></label><div class="filter-actions"><button class="filter-reset" type="button" @click="resetSearch">重置</button><button class="filter-query" type="submit">查询</button></div></form>
      <div class="table-wrap"><table aria-label="流程列表"><thead><tr><th>流程编号</th><th>流程名称</th><th>流程模板名称</th><th>模板节点数</th><th>状态</th><th>更新时间</th><th class="col-actions">操作</th></tr></thead><tbody><tr v-if="loading"><td colspan="7" class="api-empty">正在加载流程数据…</td></tr><tr v-else-if="!rows.length"><td colspan="7" class="api-empty">暂无流程数据</td></tr><tr v-for="row in rows" v-else :key="row.id"><td>{{ row.number || `FLOW-${row.id}` }}</td><td>{{ row.name || `流程 ${row.id}` }}</td><td>{{ row.template || `- · 模板 ID ${row.templateId}` }}</td><td>{{ row.steps ?? 0 }}</td><td><span :class="['status-tag',statusLabel(row)==='启用'?'valid':'standby']">{{ statusLabel(row) }}</span></td><td>{{ row.updatedAt || '-' }}</td><td class="col-actions"><div class="row-actions"><TableActionButton kind="edit" label="编辑流程" @click="openForm(row)"/></div></td></tr></tbody></table></div>
      <PaginationBar :page="page" :page-size="pageSize" :total="total" :loading="loading" @update:page="changePage" @update:page-size="changePageSize" />
    </div></section></div>

    <div v-if="dialogVisible" class="modal-overlay open" @click.self="dialogVisible=false"><section class="modal-card" role="dialog" aria-modal="true"><h2>{{ editingId == null ? '新建流程' : `编辑流程 · ${rows.find(item => item.id === editingId)?.number || editingId}` }}</h2><form @submit.prevent="save"><div class="form-grid"><label class="form-field wide"><span>流程名称</span><input v-model="form.templateName" maxlength="120" required></label><label class="form-field wide"><span>来源流程模板</span><select v-model="form.sourceTemplateId" required><option value="">请选择来源模板</option><option v-for="item in templates" :key="item.id" :value="item.id">{{ item.templateName }} · {{ item.templateNumber }}</option></select><small class="field-hint">实际提交后端模板 ID</small></label><label class="form-field"><span>适用范围</span><input v-model="form.applicableScope" maxlength="120"></label><label class="form-field"><span>启用状态</span><select v-model="form.status"><option :value="1">启用</option><option :value="0">停用</option></select></label><label class="form-field wide"><span>流程说明</span><textarea v-model="form.description" maxlength="500" /></label></div><div class="modal-actions"><button class="modal-close" type="button" @click="dialogVisible=false">取消</button><button class="modal-primary" type="submit" :disabled="saving">{{ saving ? (editingId == null ? '创建中…' : '保存中…') : editingId == null ? '创建流程' : '保存' }}</button></div></form></section></div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
:root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}button{color:inherit}svg{display:block}[hidden]{display:none!important}.icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.page-head{min-height:92px;display:flex;align-items:center;justify-content:space-between;padding:17px 20px;background:#fff}.page-head h1{margin:0 0 7px;font-size:20px}.page-head p{margin:0;color:var(--muted);font-size:13px}.page-canvas{min-height:calc(100vh - 145px);padding:20px}.page-panel{overflow:hidden;border-radius:11px;background:#fff}.tabs-row{padding:16px;border-bottom:1px solid var(--line)}.tabs{width:fit-content;display:inline-flex;align-items:center;padding:2px;border-radius:9px;background:#f3f5f7}.tab-btn{height:34px;display:inline-flex;align-items:center;padding:0 15px;border:0;border-radius:8px;color:var(--ink);background:transparent;font-size:13px;text-decoration:none;white-space:nowrap}.tab-btn.active{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(17,36,54,.08)}.tab-divider{width:1px;height:18px;margin:0 2px;background:#d8dde1}
.content{padding:20px 16px 18px}.list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 0 14px}.list-head h2{margin:0;font-size:15px}.list-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.tools{display:flex;gap:10px}.tool-btn,.head-btn{height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border:0;border-radius:8px;background:#f4f6f8;font-size:13px;font-weight:650;white-space:nowrap;cursor:pointer}.tool-btn.primary,.head-btn{color:#fff;background:var(--blue)}.tool-btn .icon,.head-btn .icon{width:18px;height:18px}.filter{width:min(460px,100%);height:40px;display:flex;align-items:center;margin:15px 0;padding:0 12px;border:1px solid #e0e4e8;border-radius:8px;background:#fff}.filter span{color:#9aa1a8;margin-right:12px}.filter input{min-width:0;flex:1;border:0;outline:0;color:var(--ink)}
.filter-bar{display:flex;align-items:center;gap:10px;margin:15px 0}.filter-bar .filter{margin:0}.filter-actions{display:flex;gap:8px}.filter-reset,.filter-query{width:76px;height:40px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid #dfe4e8;border-radius:8px;background:#fff;font:inherit;font-weight:650;line-height:1;cursor:pointer}.filter-query{color:#fff;border-color:var(--blue);background:var(--blue)}
.table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;min-width:1320px;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;text-align:left;white-space:nowrap;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;font-weight:700}td{height:55px}.truncate{display:block;max-width:235px;overflow:hidden;text-overflow:ellipsis}.status-tag{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:62px;padding:5px 9px;border:1px solid currentColor;border-radius:18px;font-size:11px}.status-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.valid{color:var(--green);border-color:#d1efdf;background:#f4fcf7}.draft,.standby{color:var(--yellow);border-color:#f7e8b8;background:#fffaf0}.row-actions{display:flex;gap:7px}.row-btn{height:27px;padding:0 10px;border:1px solid #cde2f3;border-radius:15px;color:var(--blue-strong);background:#f1f8fd;font-size:11px;font-weight:650;cursor:pointer}.row-btn.delete{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.total{margin-top:14px;color:var(--muted);font-size:12px}.pager-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px}.pagination{display:flex;align-items:center;gap:7px}.page-btn{min-width:34px;height:34px;border:0;border-radius:7px;background:transparent;cursor:pointer}.page-btn.active{background:#eef0f2}.page-size{height:34px;padding:0 10px;border:1px solid #dfe3e7;border-radius:8px;background:#fff}.jump{width:48px;height:34px;border:1px solid #dfe3e7;border-radius:8px}
.modal-overlay,.alert-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s}.modal-overlay.open,.alert-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(590px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:14px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22)}.modal-card h2{margin:0 0 17px;font-size:19px}.status-list{display:grid;gap:12px}.status-item{padding:15px;border-radius:7px;background:#fff}.status-item strong{display:block;margin-bottom:7px;font-size:16px}.status-item p{margin:0;color:var(--muted);font-size:12px}.normal strong{color:#23c36b}.limited strong{color:#ffb000}.abnormal strong{color:#ff493d}.maintenance strong{color:#59616a}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-field{display:grid;gap:7px}.form-field.wide{grid-column:1/-1}.form-field span{color:#7c858e;font-size:11px}.form-field input,.form-field select{height:39px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;background:#fff;font-size:12px}.modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}.modal-close,.modal-primary{height:36px;padding:0 15px;border:0;border-radius:8px;font-size:13px;font-weight:650;cursor:pointer}.modal-close{background:#e9edf1}.modal-primary{color:#fff;background:var(--blue)}
.alert-overlay{z-index:75}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:.24s}.alert-overlay.open .alert-drawer{transform:none}.alert-header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.alert-header h2{margin:0 0 5px;font-size:20px}.alert-header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{overflow-y:auto;padding:16px}.alert-card{padding:14px;border-radius:11px;background:#fff}.alert-card+.alert-card{margin-top:12px}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:#77808a;font-size:11px}.alert-footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.alert-primary{width:240px;height:37px;border:0;border-radius:8px;color:#fff;background:var(--blue)}.toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s}.toast.show{opacity:1;transform:translate(-50%,0)}
.clickable-row{cursor:pointer}.clickable-row:hover td{background:#f7fbff}.editor-shell{display:grid;gap:16px}.editor-meta{padding:20px}.editor-meta-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:18px}.editor-meta-head h2,.canvas-heading h2,.palette h2,.properties h2{margin:0;font-size:16px}.editor-meta-head p,.canvas-heading p,.palette>p,.properties>p{margin:7px 0 0;color:var(--muted);font-size:12px}.editor-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}.editor-field{height:42px;display:flex;align-items:center;gap:11px;padding:0 12px;border:1px solid #dfe4e8;border-radius:8px}.editor-field span{color:#969da5;font-size:12px;white-space:nowrap}.editor-field input,.editor-field select{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font-size:13px}.editor-layout{min-height:750px;display:grid;grid-template-columns:220px minmax(690px,1fr) 280px;overflow:hidden}.palette,.properties{padding:20px 16px;background:#fff}.palette{border-right:1px solid var(--line)}.properties{border-left:1px solid var(--line)}.palette-section{margin-top:18px}.palette-label{margin-bottom:8px;color:#87919a;font-size:12px}.palette-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.palette-card{min-height:74px;display:grid;place-items:center;gap:6px;padding:9px 6px;border:1px solid #e5e8eb;border-radius:9px;background:#fff;cursor:grab;font-size:12px;font-weight:650}.palette-card:hover{border-color:#bcdcf5;background:#f8fbfe}.palette-icon{width:36px;height:30px;display:grid;place-items:center;border-radius:7px;color:var(--blue);background:#edf6fd;font-size:18px}.palette-icon.start{color:#182c40;background:#c9dcf3}.palette-icon.end{color:#fff;background:#324b61}.canvas-column{min-width:0;padding:20px;background:#fff}.canvas-heading{margin-bottom:14px}.canvas-board{position:relative;min-height:650px;overflow:auto;border-radius:10px;background-color:#fafbfc;background-image:radial-gradient(#e6e9ec 1.4px,transparent 1.4px);background-size:18px 18px}.canvas-stage{position:relative;width:1000px;height:650px;transform-origin:0 0;transition:transform .18s}.flow-lines{position:absolute;inset:0;overflow:visible;pointer-events:none}.flow-node{position:absolute;width:180px;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 13px;border:1px solid #dce2e7;border-left:4px solid var(--blue);border-radius:10px;background:#fff;box-shadow:0 7px 18px rgba(22,48,71,.08);cursor:pointer;text-align:left}.flow-node strong{display:block;margin-bottom:5px;font-size:13px}.flow-node small{color:#8b949d;font-size:11px}.flow-node-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:8px;color:var(--blue);background:#eaf4fd;font-size:20px}.flow-node.start,.flow-node.end{justify-content:center;border:3px solid var(--blue);background:#c8d9ef;text-align:center}.flow-node.end{color:#fff;border-color:#324b61;background:#324b61}.flow-node.selected{outline:3px solid rgba(33,130,209,.22)}.canvas-controls{position:sticky;right:16px;bottom:14px;z-index:4;width:max-content;display:flex;align-items:center;gap:7px;margin:0 14px 14px auto;padding:7px 9px;border-radius:9px;background:#fff;box-shadow:0 6px 20px rgba(12,29,47,.12)}.canvas-control{height:28px;min-width:30px;border:0;border-radius:6px;background:#f4f6f8;cursor:pointer}.property-block{margin-top:18px}.property-block h3{margin:0 0 11px;font-size:13px}.property-input{width:100%;height:40px;margin-bottom:12px;padding:0 11px;border:1px solid #dfe4e8;border-radius:8px;background:#fff;font-size:12px}.property-input[disabled]{color:#8d949c;background:#fafbfc}.property-note{padding:12px;border:1px solid #cce2f4;border-radius:8px;color:var(--blue-strong);background:#eff8ff;font-size:12px}.property-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.property-actions .tool-btn{justify-content:center;padding:0 8px}.property-actions .danger{grid-column:1/-1;color:var(--red);background:#fff1ef}.link-card{margin-top:10px;padding:12px;border:1px solid #e5e8eb;border-radius:8px}.link-card small{display:block;margin-top:6px;color:#8b949d}.canvas-fullscreen{position:fixed;inset:12px;z-index:80;min-height:auto;border:1px solid #e4e8eb;border-radius:12px;background:#fff}.canvas-fullscreen .canvas-board{height:calc(100vh - 110px)}
.flow-node{cursor:grab;touch-action:none;user-select:none}.flow-node.dragging{cursor:grabbing;opacity:.94;box-shadow:0 12px 28px rgba(22,48,71,.18)}.node-handle{position:absolute;top:50%;z-index:3;width:14px;height:14px;padding:0;border:3px solid #fff;border-radius:50%;background:var(--blue);box-shadow:0 0 0 1px #8cc2eb;transform:translateY(-50%);cursor:crosshair}.node-handle.handle-in{left:-9px}.node-handle.handle-out{right:-9px}.flow-node.start .handle-in,.flow-node.end .handle-out{display:none}.flow-path{fill:none;stroke:#87919a;stroke-width:2.3;pointer-events:stroke;cursor:pointer}.flow-path:hover,.flow-path.selected{stroke:var(--blue);stroke-width:3.5}.flow-preview{fill:none;stroke:var(--blue);stroke-width:2.5;stroke-dasharray:7 5;pointer-events:none}.canvas-board.connecting{cursor:crosshair}.connection-delete{width:100%;margin-top:10px}.canvas-tip{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:6px 9px;border-radius:6px;color:#2478b8;background:#eef7ff;font-size:11px}.canvas-tip:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--blue)}
.recovery-tabs{padding:16px;border-bottom:1px solid var(--line)}.severity-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border:1px solid currentColor;border-radius:18px;font-size:11px}.severity-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.severity-critical{color:var(--red);border-color:#f3d2cf;background:#fff5f4}.severity-warning{color:var(--yellow);border-color:#f3e1ad;background:#fffaf0}.anomaly-count{color:var(--red);border-color:#f3d2cf;background:#fff5f4}.anomaly-message strong{display:block;font-size:12px}.anomaly-message small{display:block;margin-top:7px;color:var(--muted);font-size:11px;letter-spacing:.03em}.record-search{height:40px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #dfe4e8;border-radius:8px}.record-search input{min-width:0;flex:1;border:0;outline:0}.record-list{display:grid;gap:12px;margin-top:14px}.record-card{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px;border:1px solid #e5e8eb;border-radius:9px;background:#fff;cursor:pointer;text-align:left}.record-card:hover,.record-card.selected{border-color:#bfdcf2;background:#eef7ff}.record-card strong{display:block;margin-bottom:7px;font-size:13px}.record-card small{color:var(--muted);font-size:11px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-box{padding:14px;border:1px solid #e4e8eb;border-radius:9px;background:#fff}.detail-box.wide{grid-column:1/-1}.detail-box strong{display:block;margin-bottom:8px;font-size:12px}.detail-box p{margin:0;color:#79828b;font-size:12px;line-height:1.65}.record-modal .modal-card{width:min(720px,calc(100vw - 32px));background:#f7f9fb}
.recovery-process-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,.8fr);gap:20px;margin-top:20px}.recovery-process,.recovery-rules{padding:20px;border-radius:11px;background:#fff}.recovery-process-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.recovery-process-head h2,.recovery-rules h2{margin:0;font-size:16px}.recovery-process-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.recovery-step,.recovery-rule{margin-top:14px;padding:16px;border:1px solid #e5e9ec;border-radius:9px;background:#fff}.recovery-step{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:flex-start}.step-number{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;color:var(--blue);background:#eaf4fd;font-weight:700}.recovery-step h3,.recovery-rule h3{margin:2px 0 7px;font-size:13px}.recovery-step p,.recovery-rule p{margin:0;color:var(--muted);font-size:12px;line-height:1.65}.recovery-row.selected td{background:#eaf4fd}.blue-state{color:var(--blue);border-color:#cde2f3;background:#f1f8fd}.gray-state{color:#89939d;border-color:#e1e5e8;background:#fafbfc}.recovery-table table{min-width:1100px}.anomaly-table table{min-width:1420px}.recovery-launch{margin-left:auto}
@media(max-width:1000px){.list-head{align-items:flex-start;flex-direction:column}.tools{width:100%;overflow-x:auto}.pager-row{align-items:flex-start;flex-direction:column}}@media(max-width:760px){.page-head{padding:14px}.page-head h1{font-size:18px}.page-head p{font-size:12px}.page-canvas{padding:12px}.tabs-row{padding:12px;overflow-x:auto}.content{padding:16px 12px}.tool-btn{flex:0 0 auto}.form-grid{grid-template-columns:1fr}.form-field.wide{grid-column:auto}.alert-drawer{width:100vw}.recovery-process-grid{grid-template-columns:1fr}}
@media(max-width:1100px){.recovery-process-grid{grid-template-columns:1fr}}
@media(max-width:1200px){.editor-fields{grid-template-columns:1fr}.editor-layout{min-width:1190px}.editor-shell{overflow-x:auto}}

/* Controller-rendered states */
.form-field textarea{min-height:86px;resize:vertical;padding:10px 11px;border:1px solid #dfe3e6;border-radius:8px;background:#fff;font-size:12px;font-family:inherit}.modal-primary:disabled{opacity:.58;cursor:not-allowed}.field-hint{color:#8d949c;font-size:11px;line-height:1.45}


/* Figma action column · flow list */
.content .row-actions{align-items:center;gap:8px}.content .row-icon-button{display:inline-flex;width:16px;min-width:16px;height:16px;min-height:16px;align-items:center;justify-content:center;padding:0;border:0;border-radius:0;background:transparent}.content .row-icon-button img{display:block;width:16px;height:16px}.content .row-icon-button:hover{filter:brightness(.88)}

.content agv-action-menu[data-agv-action-menu-trigger="icon"] .agv-action-menu__trigger{width:16px;min-width:16px;height:16px;min-height:16px;padding:0;border:0;border-radius:0;background:transparent}.content .agv-action-menu__icon{display:block;width:16px;height:16px}.content agv-action-menu[data-agv-action-menu-trigger="icon"] .agv-action-menu__panel{min-width:88px}

.content .row-icon-button .icon{width:16px;height:16px;stroke:currentColor}
.content .status-tag.unknown{color:#89939d;border-color:#e1e5e8;background:#fafbfc}
</style>
<style scoped>
.process-reference-page { padding: 0; }
.process-reference-page > .page-head { margin: 0; }
</style>
