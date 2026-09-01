<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { deleteRobotInfo, getRobotInfo, listRobots, saveRobotInfo } from '../api/agv'

const runningStatusLabels={0:'空闲',1:'运行中',2:'暂停',3:'充电中',4:'故障',5:'急停'}
const runningStatusValues={'空闲':0,'运行中':1,'暂停':2,'充电中':3,'故障':4,'急停':5,'等待资源':2,'异常':4}
const moduleStatusLabels={0:'离线',1:'在线',2:'故障'}
const keywordInput=ref(''),statusInput=ref('all'),applied=reactive({keyword:'',status:'all'})
const robotRows=ref([]),total=ref(0),loading=ref(false),selected=ref(null),detailVisible=ref(false),createVisible=ref(false),saving=ref(false),editingId=ref(null)
const form=reactive({robotCode:'',robotName:'',mapName:'',mapVersion:'',currentLocationCode:'',runningStatus:0,connectionStatus:1,batteryLevel:100,enabled:1,remark:''})

function normalizeModule(module){return{...module,module:module.deviceName||module.module||'-',vendor:module.manufacturer||module.vendor||'-',model:module.hardwareModel||module.model||'-',code:module.deviceCode||module.code||'-',protocol:module.communicationProtocol||module.protocol||'-',purpose:module.remark||module.purpose||'-',status:moduleStatusLabels[module.status]||module.status||'未知'}}
function normalizeRobot(robot){const legacy=typeof robot.id==='string'&&!robot.robotCode;const modules=(robot.modules||[]).map(normalizeModule);return{...robot,databaseId:legacy?null:robot.id,id:robot.robotCode||robot.id||'-',name:robot.robotName||robot.name||'-',map:robot.mapName||robot.map||'-',mapVersion:robot.mapVersion||'-',point:robot.currentLocationCode||robot.point||'-',connection:robot.connectionStatus==null?(robot.connection||'未知'):(Number(robot.connectionStatus)===1?'在线':'离线'),status:runningStatusLabels[robot.runningStatus]||robot.status||'未知',battery:Number(robot.batteryLevel??robot.battery??0),enabled:Number(robot.enabled??1),remark:robot.remark||'',modules,abnormalModules:modules.filter(item=>item.status==='故障').length,order:robot.order||'—',task:robot.task||'—',flow:robot.flow||'—',target:robot.target||'—'}}
const rows=computed(()=>robotRows.value.filter(robot=>(!applied.keyword||`${robot.id} ${robot.name}`.toUpperCase().includes(applied.keyword))&&(applied.status==='all'||robot.status===applied.status)))
const statusClass=value=>({在线:'status-online',离线:'status-offline',运行中:'status-running',暂停:'status-waiting',等待资源:'status-waiting',空闲:'status-idle',充电中:'status-charging',故障:'status-error',急停:'status-error',异常:'status-error'}[value]||'status-running')
const batteryClass=value=>value<=15?'is-critical':value<=30?'is-low':''

async function loadRobots(){loading.value=true;try{const page=await listRobots();robotRows.value=(page?.records||[]).map(normalizeRobot);total.value=Number(page?.total??robotRows.value.length)}catch(error){ElMessage.error(`机器人列表加载失败：${error.message}`)}finally{loading.value=false}}
function search(){applied.keyword=keywordInput.value.trim().toUpperCase();applied.status=statusInput.value}
function reset(){keywordInput.value='';statusInput.value='all';applied.keyword='';applied.status='all'}
async function showDetail(robot){selected.value=robot;detailVisible.value=true;if(robot.databaseId==null)return;try{selected.value=normalizeRobot({...robot,...await getRobotInfo(robot.databaseId)})}catch(error){ElMessage.error(`机器人详情加载失败：${error.message}`)}}
function resetForm(){Object.assign(form,{robotCode:'',robotName:'',mapName:'',mapVersion:'',currentLocationCode:'',runningStatus:0,connectionStatus:1,batteryLevel:100,enabled:1,remark:''})}
function openCreate(){editingId.value=null;resetForm();createVisible.value=true}
function openEdit(robot){editingId.value=robot.databaseId;Object.assign(form,{robotCode:robot.id,robotName:robot.name,mapName:robot.map,mapVersion:robot.mapVersion,currentLocationCode:robot.point,runningStatus:runningStatusValues[robot.status]??0,connectionStatus:robot.connection==='在线'?1:0,batteryLevel:robot.battery,enabled:robot.enabled,remark:robot.remark});createVisible.value=true}
async function submitRobot(){if(!form.robotCode.trim()||!form.robotName.trim())return ElMessage.warning('请填写机器人编号和名称');saving.value=true;try{await saveRobotInfo({...editingId.value&&{id:editingId.value},robotCode:form.robotCode.trim().toUpperCase(),robotName:form.robotName.trim(),mapName:form.mapName.trim(),mapVersion:form.mapVersion.trim(),currentLocationCode:form.currentLocationCode.trim(),connectionStatus:Number(form.connectionStatus),runningStatus:Number(form.runningStatus),batteryLevel:Number(form.batteryLevel),enabled:Number(form.enabled),remark:form.remark.trim()});createVisible.value=false;ElMessage.success(editingId.value?'机器人信息已更新':'机器人已新增');await loadRobots()}catch(error){ElMessage.error(`保存失败：${error.message}`)}finally{saving.value=false}}
async function removeRobot(robot){if(robot.databaseId==null)return ElMessage.warning('演示数据暂不支持删除');try{await ElMessageBox.confirm(`确认删除机器人 ${robot.id}？此操作不可撤销。`,'删除机器人',{type:'warning',confirmButtonText:'删除',cancelButtonText:'取消'});await deleteRobotInfo(robot.databaseId);ElMessage.success(`${robot.id} 已删除`);await loadRobots()}catch(error){if(error!=='cancel'&&error!=='close')ElMessage.error(`删除失败：${error.message}`)}}
onMounted(loadRobots)
</script>

<template>
  <div class="page-view robots-reference-page">
    <PageHeader class="page-head" title="机器人与设备">
      <button class="primary-btn" type="button" aria-label="新增机器人" @click="openCreate">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>新增机器人</span>
      </button>
    </PageHeader>

    <main class="page-canvas">
      <section class="robot-pool-panel">
        <header class="panel-head">
          <div><h2>机器人列表</h2><p>点击机器人所在行可查看基础信息和硬件模组</p></div>
          <span class="count-badge">{{ total }} 台已配置</span>
        </header>
        <div class="filters">
          <label class="field-shell"><span>运行状态</span><select v-model="statusInput"><option value="all">全部状态</option><option v-for="item in ['运行中','等待资源','空闲','充电中','异常']" :key="item">{{ item }}</option></select></label>
          <label class="field-shell"><span>查询机器人</span><input v-model="keywordInput" type="search" placeholder="请输入 AGV 编号" autocomplete="off" @keydown.enter="search"></label>
          <div class="filter-actions">
            <button class="filter-btn" type="button" @click="reset"><img class="filter-action-icon" src="/assets/list-icons/refresh.svg" alt="">重置</button>
            <button class="filter-btn primary" type="button" @click="search"><img class="filter-action-icon" src="/assets/list-icons/search.svg" alt="">搜索</button>
          </div>
        </div>
        <div v-if="loading" class="empty-state"><strong>正在加载机器人信息…</strong></div>
        <div v-else-if="rows.length" class="table-wrap">
          <table aria-label="机器人列表">
            <thead><tr><th>机器人编号</th><th>工作地图</th><th>当前位置</th><th>连接状态</th><th>运行状态</th><th>正常 / 异常模组</th><th>电量</th><th>当前订单</th><th class="col-actions">操作</th></tr></thead>
            <tbody>
              <tr v-for="robot in rows" :key="robot.id" tabindex="0" :aria-label="`查看 ${robot.id} 详情`" @click="showDetail(robot)" @keydown.enter="showDetail(robot)">
                <td><div class="robot-cell"><span class="robot-mark"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M9 7V4h6v3M8.5 12h.01M15.5 12h.01M9 16h6"/></svg></span><strong>{{ robot.id }}</strong></div></td>
                <td><div class="map-cell"><strong>{{ robot.map }}</strong><small>版本 {{ robot.mapVersion }}</small></div></td>
                <td>{{ robot.point }}</td>
                <td><span :class="['status-tag', statusClass(robot.connection)]">{{ robot.connection }}</span></td>
                <td><span :class="['status-tag', statusClass(robot.status)]">{{ robot.status }}</span></td>
                <td><span class="module-health"><strong>{{ robot.modules.length - robot.abnormalModules }}</strong><em>/</em><strong :class="{ 'has-error': robot.abnormalModules }">{{ robot.abnormalModules }}</strong></span></td>
                <td><div class="battery-cell"><span class="battery-track"><i :class="batteryClass(robot.battery)" :style="{ width: `${robot.battery}%` }" /></span><span>{{ robot.battery }}%</span></div></td>
                <td :class="{ 'empty-order': robot.order === '—' }">{{ robot.order }}</td>
                <td class="col-actions"><div class="row-actions"><TableActionButton kind="view" :label="`查看 ${robot.id}`" @click.stop="showDetail(robot)"/><TableActionButton kind="edit" :label="`编辑 ${robot.id}`" @click.stop="openEdit(robot)"/><TableActionButton kind="delete" :label="`删除 ${robot.id}`" danger @click.stop="removeRobot(robot)"/></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><strong>没有匹配的机器人</strong><span>请调整机器人编号或运行状态</span></div>
        <div class="table-footer">当前显示 {{ rows.length }} 台 / 共 {{ total }} 台</div>
      </section>
    </main>

    <div v-if="detailVisible" class="modal-overlay open" @click.self="detailVisible = false">
      <section class="modal-card robot-detail-modal" role="dialog" aria-modal="true" :aria-label="`${selected?.id} 机器人详情`">
        <div class="modal-title-row"><div><h2>{{ selected?.id }}</h2><p>机器人基础信息、运行任务与硬件模组</p></div><button class="modal-x" type="button" aria-label="关闭机器人详情" @click="detailVisible = false">×</button></div>
        <div v-if="selected" class="detail-content">
          <section class="detail-hero">
            <div class="detail-identity"><span class="detail-robot-icon"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M9 7V4h6v3M8.5 12h.01M15.5 12h.01M9 16h6"/></svg></span><div><strong>{{ selected.name }}</strong><p>{{ selected.id }} · {{ selected.target }} · {{ selected.point }}</p></div></div>
            <div class="detail-tags"><span :class="['status-tag', statusClass(selected.connection)]">{{ selected.connection }}</span><span :class="['status-tag', statusClass(selected.status)]">{{ selected.status }}</span><span :class="['status-tag', selected.abnormalModules ? 'status-waiting' : 'status-online']">正常模组 {{ selected.modules.length - selected.abnormalModules }} / 异常 {{ selected.abnormalModules }}</span></div>
          </section>
          <section class="detail-stat-grid">
            <article class="detail-stat"><small>当前订单</small><strong :title="selected.order">{{ selected.order }}</strong><span>当前任务 {{ selected.task }}</span></article>
            <article class="detail-stat"><small>当前流程</small><strong :title="selected.flow">{{ selected.flow }}</strong><span>{{ selected.task === '—' ? '暂无执行流程' : '流程任务正常执行' }}</span></article>
            <article class="detail-stat"><small>当前位置</small><strong>{{ selected.point }}</strong><span>定位正常 · 电量 {{ selected.battery }}%</span></article>
            <article class="detail-stat"><small>工作地图</small><strong>{{ selected.map }}</strong><span>版本 {{ selected.mapVersion }}</span></article>
          </section>
          <section class="module-panel"><header class="module-panel-head"><div><h3>硬件模组列表</h3><p>显示 {{ selected.id }} 当前配置的全部硬件模组</p></div><span class="module-count">{{ selected.modules.length }} 个模组</span></header><div v-if="selected.modules.length" class="module-table-wrap"><table class="module-table" :aria-label="`${selected.id} 硬件模组列表`"><thead><tr><th>硬件模组</th><th>硬件厂商</th><th>设备型号</th><th>设备编号</th><th>通信协议</th><th>主要用途</th><th>状态</th></tr></thead><tbody><tr v-for="module in selected.modules" :key="module.id||module.code"><td><strong>{{ module.module }}</strong></td><td>{{ module.vendor }}</td><td>{{ module.model }}</td><td>{{ module.code }}</td><td>{{ module.protocol }}</td><td>{{ module.purpose }}</td><td><span :class="['status-tag', module.status==='故障'?'status-error':module.status==='在线'?'status-online':'status-offline']">{{ module.status }}</span></td></tr></tbody></table></div><div v-else class="module-empty">暂无硬件模组数据</div></section>
        </div>
        <div class="modal-actions"><button class="modal-close" type="button" @click="detailVisible = false">关闭</button></div>
      </section>
    </div>

    <div v-if="createVisible" class="modal-overlay open" @click.self="createVisible = false">
      <section class="modal-card add-robot-modal" role="dialog" aria-modal="true" aria-labelledby="addRobotTitle">
        <div class="modal-title-row"><div><h2 id="addRobotTitle">{{ editingId ? '编辑机器人' : '新增机器人' }}</h2><p>机器人信息将保存至调度服务</p></div><button class="modal-x" type="button" aria-label="关闭机器人弹窗" @click="createVisible = false">×</button></div>
        <form class="form-grid" @submit.prevent="submitRobot">
          <label class="form-field"><span>机器人编号 <i>*</i></span><input v-model="form.robotCode" placeholder="例如：AGV-11" required></label>
          <label class="form-field"><span>机器人名称 <i>*</i></span><input v-model="form.robotName" placeholder="例如：复合机器人 11" required></label>
          <label class="form-field"><span>工作地图</span><input v-model="form.mapName" placeholder="例如：大型实验室总览地图"></label>
          <label class="form-field"><span>地图版本</span><input v-model="form.mapVersion" placeholder="例如：V3.2"></label>
          <label class="form-field"><span>当前位置</span><input v-model="form.currentLocationCode" placeholder="例如：N26"></label>
          <label class="form-field"><span>运行状态</span><select v-model.number="form.runningStatus"><option :value="0">空闲</option><option :value="1">运行中</option><option :value="2">暂停</option><option :value="3">充电中</option><option :value="4">故障</option><option :value="5">急停</option></select></label>
          <label class="form-field"><span>连接状态</span><select v-model.number="form.connectionStatus"><option :value="1">在线</option><option :value="0">离线</option></select></label>
          <label class="form-field"><span>剩余电量（%）</span><input v-model.number="form.batteryLevel" type="number" min="0" max="100"></label>
          <label class="form-field"><span>是否启用</span><select v-model.number="form.enabled"><option :value="1">启用</option><option :value="0">停用</option></select></label>
          <label class="form-field wide"><span>备注</span><textarea v-model="form.remark" rows="3" placeholder="填写机器人用途或配置说明（选填）" /></label>
          <div class="modal-actions wide"><button class="modal-close" type="button" @click="createVisible = false">取消</button><button class="modal-primary" type="submit" :disabled="saving">{{ saving ? '保存中…' : editingId ? '保存修改' : '确认新增' }}</button></div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
:root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; color: var(--agv-ink); background: var(--agv-canvas); -webkit-font-smoothing: antialiased; }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
[hidden] { display: none !important; }
svg { display: block; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icon { width: 17px; height: 17px; flex: 0 0 auto; }

.primary-btn, .secondary-btn { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 16px; border-radius: 7px; font-size: 13px; font-weight: 650; cursor: pointer; }
.primary-btn { border: 1px solid var(--agv-blue); color: #fff; background: var(--agv-blue); }
.primary-btn:hover { border-color: var(--agv-blue-hover); background: var(--agv-blue-hover); }
.secondary-btn { border: 1px solid var(--agv-line); color: var(--agv-ink); background: #fff; }
.secondary-btn:hover { border-color: var(--agv-blue); color: var(--agv-blue); }
.primary-btn.compact { min-width: 76px; }

.page-canvas { min-height: calc(100vh - 148px); }

.robot-pool-panel { overflow: hidden; padding: 20px 16px 18px; border-radius: 11px; background: #fff; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.panel-head h2 { margin: 0; font-size: 16px; }
.panel-head p { margin: 6px 0 0; color: var(--agv-text-muted); font-size: 12px; }
.count-badge { min-height: 26px; display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; color: var(--agv-blue); background: var(--agv-blue-soft); font-size: 11px; font-weight: 650; white-space: nowrap; }

.filters { display: grid; grid-template-columns: minmax(220px, .75fr) minmax(260px, 1fr) auto; gap: 12px; align-items: center; margin: 17px 0 13px; }
.field-shell { min-width: 0; height: 42px; display: flex; align-items: center; gap: 12px; padding: 0 12px; border: 1px solid #dfe3e6; border-radius: 8px; background: #fff; }
.field-shell > span { flex: 0 0 auto; color: #959ba2; font-size: 12px; }
.field-shell select, .field-shell input { min-width: 0; flex: 1; height: 100%; border: 0; outline: 0; color: var(--agv-ink); background: transparent; font-size: 13px; }
.field-shell select { cursor: pointer; }
.field-shell:focus-within { border-color: var(--agv-blue); box-shadow: 0 0 0 2px rgba(22, 119, 200, .08); }
.filter-actions { display: flex; gap: 10px; }
.filter-btn { height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border: 0; border-radius: 8px; color: var(--agv-ink); background: #f3f5f7; font-size: 13px; font-weight: 650; cursor: pointer; }
.filter-btn.primary { min-width: 74px; color: #fff; background: var(--agv-blue); }
.filter-btn:hover { filter: brightness(.97); }
.filter-action-icon { width: 17px; height: 17px; object-fit: contain; }

.table-wrap { overflow-x: auto; border: 1px solid #edf0f2; border-radius: 9px; }
table { width: 100%; min-width: 1180px; border-collapse: separate; border-spacing: 0; }
th, td { padding: 0 14px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--agv-line-soft); }
th { height: 48px; color: var(--agv-text-secondary); background: #fafbfc; font-size: 12px; font-weight: 650; }
td { height: 62px; color: var(--agv-ink); font-size: 12px; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr { cursor: pointer; }
tbody tr:hover td, tbody tr:focus td { background: #f8fbfd; }
tbody tr:focus { outline: none; }
.robot-cell { display: flex; align-items: center; gap: 10px; }
.robot-mark { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; color: var(--agv-blue); background: var(--agv-blue-soft); }
.robot-mark svg { width: 18px; height: 18px; }
.robot-cell strong { font-size: 13px; }
.map-cell strong, .map-cell small { display: block; }
.map-cell strong { font-size: 12px; font-weight: 500; }
.map-cell small { margin-top: 4px; color: var(--agv-text-muted); font-size: 10px; }
.status-tag { min-height: 24px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border: 1px solid currentColor; border-radius: 999px; font-size: 10px; font-weight: 650; }
.status-tag::before { width: 5px; height: 5px; flex: 0 0 auto; border-radius: 50%; background: currentColor; content: ""; }
.status-online, .status-idle { color: var(--agv-green); border-color: #cce9da; background: #effaf4; }
.status-running { color: var(--agv-blue); border-color: #cbdff0; background: var(--agv-blue-soft); }
.status-waiting, .status-charging { color: var(--agv-yellow); border-color: #f0ddb2; background: #fff8e8; }
.status-offline, .status-error { color: var(--agv-red); border-color: #efd0ce; background: #fff4f3; }
.module-health { display: inline-flex; align-items: center; gap: 5px; }
.module-health strong, .module-health .has-error, .module-health em { color: var(--agv-ink); font-style: normal; font-weight: 500; }
.battery-cell { min-width: 96px; display: flex; align-items: center; gap: 8px; }
.battery-track { width: 52px; height: 6px; overflow: hidden; border-radius: 999px; background: #edf0f3; }
.battery-track i { display: block; height: 100%; border-radius: inherit; background: #3caf7e; }
.battery-track i.is-low { background: #d99b00; }
.battery-track i.is-critical { background: #d84343; }
.battery-cell > span:last-child { color: var(--agv-text-secondary); font-variant-numeric: tabular-nums; }
.empty-order { color: #9ba5af; }
.icon-action { width: 30px; height: 30px; display: inline-grid; place-items: center; padding: 0; border: 0; border-radius: 6px; color: var(--agv-blue); background: transparent; cursor: pointer; }
.icon-action:hover { background: var(--agv-blue-soft); }
.icon-action svg { width: 17px; height: 17px; }
.row-actions { display:flex; align-items:center; gap:5px; }
.text-action { height:28px; padding:0 7px; border:0; border-radius:5px; color:var(--agv-blue); background:transparent; font-size:11px; cursor:pointer; }
.text-action:hover { background:var(--agv-blue-soft); }
.text-action.danger { color:var(--agv-red); }
.text-action.danger:hover { background:#fff1f0; }
.table-footer { display: flex; align-items: center; padding-top: 15px; color: var(--agv-text-muted); font-size: 11px; }
.empty-state { min-height: 190px; display: grid; place-items: center; align-content: center; gap: 7px; color: var(--agv-text-muted); }
.empty-state svg { width: 32px; height: 32px; margin-bottom: 3px; }
.empty-state strong { color: var(--agv-text-secondary); font-size: 13px; }
.empty-state span { font-size: 11px; }

.modal-overlay, .alert-overlay { position: fixed; inset: 0; z-index: 80; opacity: 0; transition: opacity .2s ease; }
.modal-overlay.open, .alert-overlay.open { opacity: 1; }
.modal-overlay { display: grid; place-items: center; }
.modal-card { overflow: auto; transform: translateY(8px); transition: transform .18s ease; }
.modal-overlay.open .modal-card { transform: none; }
.modal-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.modal-card .modal-title-row h2 { margin: 0 0 4px; }
.modal-title-row p { margin: 0; color: var(--agv-text-muted); font-size: 12px; }
.modal-x { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px; color: #7b8792; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; }
.modal-x:hover { color: var(--agv-ink); background: #f1f3f5; }

.robot-detail-modal { width: min(980px, calc(100vw - 32px)); }
.detail-content { display: grid; gap: 14px; }
.detail-hero { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 16px; border: 1px solid var(--agv-line-soft); border-radius: 8px; background: #fafbfc; }
.detail-identity { display: flex; align-items: center; gap: 11px; }
.detail-robot-icon { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; color: var(--agv-blue); background: var(--agv-blue-soft); }
.detail-robot-icon svg { width: 20px; height: 20px; }
.detail-identity strong { display: block; font-size: 14px; }
.detail-identity p { margin: 4px 0 0; color: var(--agv-text-muted); font-size: 11px; }
.detail-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.detail-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.detail-stat { min-width: 0; min-height: 84px; padding: 13px; border: 1px solid #f0f0f0; border-radius: 8px; background: #fafafa; }
.detail-stat small { display: block; color: rgba(0, 0, 0, .45); font-size: 11px; }
.detail-stat strong { display: block; margin-top: 10px; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.detail-stat span { display: block; margin-top: 5px; overflow: hidden; color: var(--agv-text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.module-panel { overflow: hidden; border: 1px solid var(--agv-line-soft); border-radius: 8px; background: #fff; }
.module-panel-head { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border-bottom: 1px solid var(--agv-line-soft); }
.module-panel-head h3 { margin: 0; font-size: 14px; }
.module-panel-head p { margin: 4px 0 0; color: var(--agv-text-muted); font-size: 11px; }
.module-count { color: var(--agv-blue); font-size: 11px; font-weight: 650; }
.module-table-wrap { max-height: 214px; overflow: auto; }
.module-table { min-width: 900px; }
.module-table th, .module-table td { height: 46px; padding: 0 12px; }
.module-table th { height: 42px; }
.module-table tbody tr { cursor: default; }
.module-table tbody tr:hover td { background: #fafcfd; }
.module-empty { min-height:100px; display:grid; place-items:center; color:var(--agv-text-muted); font-size:12px; }

.add-robot-modal { width: min(640px, calc(100vw - 32px)); }
.add-robot-modal .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.add-robot-modal .form-field { min-width: 0; display: grid; }
.add-robot-modal .form-field > span { font-size: 13px; font-weight: 500; }
.add-robot-modal .form-field i { color: var(--agv-red); font-style: normal; }
.add-robot-modal .form-field input, .add-robot-modal .form-field select, .add-robot-modal .form-field textarea { width: 100%; box-sizing: border-box; border: 1px solid #d9d9d9; border-radius: 6px; padding-right: 11px; padding-left: 11px; outline: 0; background: #fff; }
.add-robot-modal .form-field input, .add-robot-modal .form-field select { min-height: 40px; }
.add-robot-modal .form-field textarea { min-height: 92px; padding-top: 9px; padding-bottom: 9px; resize: vertical; line-height: 1.55; }
.add-robot-modal .wide { grid-column: 1 / -1; }
.add-robot-modal .modal-actions { margin-top: 2px; }

.status-modal { width: min(590px, calc(100vw - 32px)); overflow: auto; }
.status-list { display: grid; gap: 11px; }
.status-item { padding: 14px; border-radius: 7px; background: #f7f8fa; }
.status-item strong { display: block; margin-bottom: 6px; font-size: 14px; }
.status-item p { margin: 0; color: var(--agv-text-muted); font-size: 12px; }
.normal strong { color: var(--agv-green); }
.limited strong { color: var(--agv-yellow); }
.abnormal strong { color: var(--agv-red); }
.maintenance strong { color: #687483; }

.alert-overlay { z-index: 85; background: rgba(0, 0, 0, .45); }
.alert-drawer { position: absolute; inset: 0 0 0 auto; width: min(420px, 100vw); display: grid; grid-template-rows: auto 1fr auto; background: #f5f7f9; transform: translateX(100%); transition: transform .24s; }
.alert-overlay.open .alert-drawer { transform: none; }
.alert-header, .alert-footer { padding: 18px; background: #fff; }
.alert-header { border-bottom: 1px solid var(--agv-line-soft); }
.alert-header h2 { margin: 0 0 5px; font-size: 18px; }
.alert-header p, .alert-card p { margin: 0; color: var(--agv-text-muted); font-size: 12px; }
.alert-feed { overflow-y: auto; padding: 16px; }
.alert-list { display: grid; gap: 12px; }
.alert-card { padding: 14px; border-radius: 9px; background: #fff; }
.alert-card strong { font-size: 13px; }
.alert-card p { margin-top: 8px; }
.severity { float: right; padding: 3px 7px; border: 1px solid #efd0ce; border-radius: 999px; color: var(--agv-red); font-size: 10px; }
.alert-footer { display: grid; place-items: center; border-top: 1px solid var(--agv-line-soft); }
.alert-primary { width: 240px; min-height: 36px; border: 0; border-radius: 7px; color: #fff; background: var(--agv-blue); font-size: 13px; cursor: pointer; }
.toast { position: fixed; left: 50%; bottom: 24px; z-index: 100; padding: 11px 16px; border-radius: 8px; color: #fff; background: rgba(12, 29, 47, .92); font-size: 13px; opacity: 0; pointer-events: none; transform: translate(-50%, 20px); transition: .22s; }
.toast.show { opacity: 1; transform: translate(-50%, 0); }

@media (max-width: 1100px) {
  .filters { grid-template-columns: 1fr 1fr; }
  .filter-actions { grid-column: 1 / -1; justify-content: flex-end; }
  .detail-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .robot-pool-panel { padding: 16px 12px; }
  .panel-head { align-items: flex-start; }
  .filters { grid-template-columns: 1fr; margin: 15px 0 12px; }
  .filter-actions { width: 100%; }
  .filter-actions button { flex: 1; }
  .page-head .primary-btn { width: 36px; padding: 0; }
  .page-head .primary-btn span { display: none; }
  .detail-hero { align-items: flex-start; flex-direction: column; }
  .detail-tags { justify-content: flex-start; }
  .detail-stat-grid, .add-robot-modal .form-grid { grid-template-columns: 1fr; }
  .add-robot-modal .wide { grid-column: auto; }
  .add-robot-modal .modal-actions button { flex: 1; }
}
</style>
