<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'

const tabs = [
  { key:'task', label:'任务执行' }, { key:'device', label:'设备通信' }, { key:'upstream', label:'上游接口' },
  { key:'alarm', label:'告警事件' }, { key:'external', label:'外设设备' }, { key:'system', label:'系统服务' }, { key:'user', label:'用户操作' },
]
const ids = Array.from({ length:7 }, (_,index) => `LOG-20260816-${1028-index}`)
const makeRows = (source,event,object,result,resultClass='info',level='信息',levelClass='gray') => ids.map(id => ({ id,time:'2026-08-16 09:18:42',level,levelClass,source,event,object,result,resultClass }))
const categoryData = {
  task:makeRows('任务引擎','运输任务进入等待机台许可','TRN-0031-01','已记录'),
  device:makeRows('机器人 AGV-01','运输任务进入等待机台许可','TRN-0031-01','成功','success'),
  upstream:makeRows('MES 接口','收到机台许可查询响应','MES-20260816-0031','等待','warning'),
  alarm:makeRows('任务引擎','库位状态记录与现场检测不一致','A-04-07','需人工确认','info','警告','warning'),
  external:makeRows('自动门 D-01','状态轮询完成','TRN-0031-01','正常','gray'),
  system:makeRows('数据库','运输任务进入等待机台许可','HEALTH-0915','正常','gray'),
  user:makeRows('操作员 陈工','登录系统','SESSION-091008','成功','success'),
}
categoryData.alarm[0].source = '库位服务'
categoryData.external[0].object = 'D-01'
categoryData.system[0].event = '运行状态健康检查'

const active = ref('task')
const start = ref('2026/08/16 00:00')
const end = ref('2026/08/16 23:59')
const level = ref('全部级别')
const source = ref('全部来源')
const keyword = ref('')
const current = ref(null)
const dialogVisible = ref(false)
const page = ref(1)
const pageSize = ref('20 条/页')
const jumpPage = ref('')
const toastText = ref('')
let toastTimer

const activeRows = computed(() => categoryData[active.value] || [])
const sources = computed(() => [...new Set(activeRows.value.map(row => row.source))])
const rows = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  return activeRows.value.filter(row => (level.value === '全部级别' || row.level === level.value)
    && (source.value === '全部来源' || row.source === source.value)
    && (!key || Object.values(row).join(' ').toLowerCase().includes(key)))
})

function toast(message) {
  toastText.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastText.value = '' },2200)
}
function selectTab(key) { active.value = key; level.value = '全部级别'; source.value = '全部来源'; keyword.value = ''; page.value = 1 }
function reset() { start.value='2026/08/16 00:00'; end.value='2026/08/16 23:59'; level.value='全部级别'; source.value='全部来源'; keyword.value=''; page.value=1; toast('查询条件已重置') }
function search() { page.value=1; toast(`当前筛选 ${rows.value.length} 条数据`) }
function open(row) { current.value=row; dialogVisible.value=true }
function close() { dialogVisible.value=false }
function changePage(value) { page.value=value; toast(`已切换到第 ${value} 页`) }
function nextPage() { page.value += 1; toast('已进入下一页') }
function jump() { if (!jumpPage.value) return; page.value=Math.max(1,Number(jumpPage.value)||1); toast(`已跳转到第 ${page.value} 页`) }
function onKeydown(event) { if(event.key==='Escape'&&dialogVisible.value)close() }

watch(dialogVisible,value=>{document.body.style.overflow=value?'hidden':''})
watch(pageSize,value=>toast(`每页显示：${value}`))
onMounted(()=>document.addEventListener('keydown',onKeydown))
onBeforeUnmount(()=>{document.removeEventListener('keydown',onKeydown);document.body.style.overflow='';clearTimeout(toastTimer)})
</script>

<template>
  <div class="page-view logs-reference-page">
    <PageHeader class="page-head" title="系统日志" description="按分类查询系统服务、任务、设备、接口、告警和用户操作日志" />
    <div class="page-canvas log-page"><section class="log-workspace">
      <div class="log-tabs"><div class="log-tablist" role="tablist"><button v-for="tab in tabs" :key="tab.key" :class="['log-tab',{active:active===tab.key}]" type="button" role="tab" :aria-selected="active===tab.key" @click="selectTab(tab.key)">{{ tab.label }}</button></div></div>
      <div class="log-body">
        <div class="log-heading-row title-status-bar"><div><div class="log-title-meta"><h2>系统日志</h2></div><p>先按日志类型切换页签，再查询该类型的级别、来源和关联业务</p></div><span class="title-status title-status--danger">{{ rows.length }} 项处理</span></div>
        <div class="log-filters agv-filter-bar">
          <label class="field agv-filter-field"><span>开始时间</span><input v-model="start"></label><label class="field agv-filter-field"><span>结束时间</span><input v-model="end"></label><label class="field agv-filter-field"><span>日志级别</span><select v-model="level"><option>全部级别</option><option>信息</option><option>警告</option><option>错误</option></select></label><label class="field agv-filter-field"><span>来源模块</span><select v-model="source"><option>全部来源</option><option v-for="item in sources" :key="item">{{ item }}</option></select></label><label class="field agv-filter-field"><span>关键词</span><input v-model="keyword" placeholder="日志号 / 事件 / 订单 / 任务" @keydown.enter="search"></label>
          <div class="agv-filter-actions"><button type="button" @click="reset"><img class="filter-action-icon" src="/assets/list-icons/refresh.svg" alt="">重置</button><button class="primary" type="button" @click="search"><img class="filter-action-icon" src="/assets/list-icons/search.svg" alt="">搜索</button></div>
        </div>
        <div class="table-wrap log-table"><table aria-label="系统日志列表"><thead><tr><th>发生时间</th><th>等级</th><th>来源模块</th><th>事件</th><th>关联对象</th><th>结果</th></tr></thead><tbody><tr v-for="row in rows" :key="`${active}-${row.id}`" tabindex="0" role="button" :aria-label="`查看日志详情：${row.id}`" data-log-index @click="open(row)" @keydown.enter="open(row)"><td>{{ row.time }}</td><td><span :class="['tag',row.levelClass]">{{ row.level }}</span></td><td>{{ row.source }}</td><td class="event-cell">{{ row.event }}</td><td>{{ row.object }}</td><td><span :class="['tag',row.resultClass]">{{ row.result }}</span></td></tr><tr v-if="!rows.length"><td class="no-log" colspan="6">没有符合当前条件的日志</td></tr></tbody></table></div>
        <div class="log-footer"><span>{{ level==='全部级别'&&source==='全部来源'&&!keyword ? '共计' : '当前筛选' }} {{ rows.length }} 条数据</span><div class="pagination-controls"><button class="page-btn" type="button" :disabled="page<=1" @click="changePage(page-1)">‹</button><button v-for="n in [1,2,3,4,5]" :key="n" :class="['page-btn',{active:page===n}]" type="button" @click="changePage(n)">{{ n }}</button><span>…</span><button :class="['page-btn',{active:page===98}]" type="button" @click="changePage(98)">98</button><button class="page-btn" type="button" @click="nextPage">›</button><select v-model="pageSize" class="page-size"><option>20 条/页</option><option>50 条/页</option></select><span>跳至</span><input v-model="jumpPage" class="jump-input" inputmode="numeric" @keydown.enter="jump"><span>页</span></div></div>
      </div>
    </section></div>

    <div v-if="dialogVisible && current" class="modal-overlay open" @click.self="close"><section class="modal-card" role="dialog" aria-modal="true"><div class="log-detail-title"><h2>日志详情</h2><span class="log-detail-id">{{ current.id }}</span></div><div class="detail-grid"><article class="detail-box"><strong>发生时间</strong><p>{{ current.time }}</p></article><article class="detail-box"><strong>等级 / 来源</strong><p>{{ current.level }} / {{ current.source }}</p></article><article class="detail-box"><strong>关联对象</strong><p>{{ current.object }}</p></article><article class="detail-box"><strong>处理结果</strong><p>{{ current.result }}</p></article><article class="detail-box wide"><strong>事件</strong><p>{{ current.event }}</p></article><article class="detail-box wide"><strong>审计上下文</strong><p>请求、状态、结果和审计链均已完整保存，可用于问题定位与恢复核对。</p></article></div><div class="modal-actions"><button class="modal-close" type="button" @click="close">关闭</button></div></section></div>
    <div :class="['toast',{show:toastText}]" role="status" aria-live="polite">{{ toastText }}</div>
  </div>
</template>

<style scoped>
:root{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif;color-scheme:light}*{box-sizing:border-box}body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}button{color:inherit}svg{display:block}[hidden]{display:none!important}.icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.page-head{min-height:92px;display:flex;align-items:center;justify-content:space-between;padding:17px 20px;background:#fff}.page-head h1{margin:0 0 7px;font-size:20px}.page-head p{margin:0;color:var(--muted);font-size:13px}.page-canvas{min-height:calc(100vh - 145px);padding:20px}.panel{padding:20px;border-radius:11px;background:#fff}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}.summary-card{padding:18px;border-radius:11px;background:#fff}.summary-card-head{display:flex;align-items:center;justify-content:space-between;color:#848c94;font-size:12px}.summary-card strong{display:block;margin-top:18px;font-size:28px}.summary-card small{display:block;margin-top:8px;color:var(--muted);font-size:11px}.trend-up{color:var(--green)!important}.trend-warn{color:var(--yellow)!important}.trend-bad{color:var(--red)!important}.dot{width:8px;height:8px;border-radius:50%;background:currentColor}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:15px}.section-head h2{margin:0;font-size:16px}.section-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.filters{display:grid;grid-template-columns:190px 210px minmax(260px,1fr) auto auto;gap:10px;margin-bottom:15px}.field{height:40px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #dfe4e8;border-radius:8px;background:#fff}.field span{color:#929aa2;font-size:12px;white-space:nowrap}.field input,.field select{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font-size:12px}.action-btn{height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border:0;border-radius:8px;background:#f2f4f6;font-size:13px;font-weight:650;cursor:pointer}.action-btn.primary{color:#fff;background:var(--blue)}.action-btn .icon{width:17px;height:17px}
.table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;min-width:1180px;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;text-align:left;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;white-space:nowrap;font-weight:700}td{height:60px}.click-row{cursor:pointer}.click-row:hover td{background:#f6fbff}.event-title{display:block;margin-bottom:6px;font-weight:650}.event-code{color:var(--muted);font-size:11px}.tag{display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border:1px solid currentColor;border-radius:17px;font-size:11px;white-space:nowrap}.tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.tag.info{color:var(--blue);border-color:#cde2f3;background:#f1f8fd}.tag.success{color:var(--green);border-color:#d1efdf;background:#f4fcf7}.tag.warning{color:var(--yellow);border-color:#f7e8b8;background:#fffaf0}.tag.error{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.tag.gray{color:#89939d;border-color:#e1e5e8;background:#fafbfc}.pager{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:17px;color:var(--muted);font-size:12px}.pages{display:flex;align-items:center;gap:6px}.page-btn{min-width:34px;height:34px;border:0;border-radius:7px;background:transparent;cursor:pointer}.page-btn.active{color:var(--ink);background:#eef0f2}.page-size{height:34px;border:1px solid #dfe3e7;border-radius:8px;background:#fff}
.analytics-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.8fr);gap:18px;margin-bottom:18px}.chart-card,.util-card{padding:20px;border-radius:11px;background:#fff}.chart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.chart-head h2,.util-card h2{margin:0;font-size:16px}.legend{display:flex;gap:15px;color:var(--muted);font-size:11px}.legend span{display:flex;align-items:center;gap:6px}.legend i{width:8px;height:8px;border-radius:50%;background:var(--blue)}.legend span:last-child i{background:var(--green)}.chart-svg{width:100%;height:235px;overflow:visible}.util-list{display:grid;gap:17px;margin-top:22px}.util-item-head{display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px}.progress{height:8px;overflow:hidden;border-radius:8px;background:#edf1f3}.progress i{display:block;height:100%;border-radius:8px;background:var(--blue)}.progress.green i{background:var(--green)}.progress.yellow i{background:var(--yellow)}
.modal-overlay,.drawer-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s}.modal-overlay.open,.drawer-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(660px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:14px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22)}.modal-card h2{margin:0 0 17px;font-size:19px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-box{padding:14px;border:1px solid #e4e8eb;border-radius:9px;background:#fff}.detail-box.wide{grid-column:1/-1}.detail-box strong{display:block;margin-bottom:8px;font-size:12px}.detail-box p{margin:0;color:#79828b;font-size:12px;line-height:1.65}.modal-actions{display:flex;justify-content:flex-end;margin-top:16px}.modal-close{height:36px;padding:0 16px;border:0;border-radius:8px;background:#e9edf1;font-weight:650;cursor:pointer}.status-list{display:grid;gap:10px}.status-item{padding:14px;border-radius:8px;background:#fff}.status-item strong{display:block;margin-bottom:7px}.status-item p{margin:0;color:var(--muted);font-size:12px}.status-item.normal strong{color:var(--green)}.status-item.limited strong{color:var(--yellow)}.status-item.abnormal strong{color:var(--red)}
.drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:.24s}.drawer-overlay.open .drawer{transform:none}.drawer header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.drawer header h2{margin:0 0 5px}.drawer header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{overflow:auto;padding:16px}.alert-card{padding:14px;border-radius:10px;background:#fff}.alert-card+.alert-card{margin-top:12px}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:var(--muted);font-size:11px}.drawer footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.drawer footer a{width:240px;height:38px;display:grid;place-items:center;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;text-decoration:none}.toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s}.toast.show{opacity:1;transform:translate(-50%,0)}
@media(max-width:1100px){.summary-grid{grid-template-columns:repeat(2,1fr)}.analytics-grid{grid-template-columns:1fr}.filters{grid-template-columns:1fr 1fr}.filters .field:nth-child(3){grid-column:1/-1}}@media(max-width:760px){.page-head{padding:14px}.page-head h1{font-size:18px}.page-canvas{padding:12px}.summary-grid{grid-template-columns:1fr}.filters{grid-template-columns:1fr}.filters .field:nth-child(3){grid-column:auto}.section-head{align-items:flex-start;flex-direction:column}.pager{align-items:flex-start;flex-direction:column}.pages{max-width:100%;overflow:auto}.detail-grid{grid-template-columns:1fr}.detail-box.wide{grid-column:auto}}

.page-canvas.log-page{padding:22px;background:#f5f7f9}.log-workspace{min-height:760px;overflow:hidden;border-radius:12px;background:#fff}.log-tabs{height:86px;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid #edf0f2}.log-tablist{display:inline-flex;align-items:center;padding:3px;border-radius:9px;background:#f4f5f7}.log-tab{position:relative;height:39px;padding:0 18px;border:0;border-radius:8px;background:transparent;color:#172638;font-size:13px;cursor:pointer}.log-tab.active{background:#fff;font-weight:700;box-shadow:0 1px 4px rgba(22,40,57,.08)}.log-tab:not(:first-child):before{content:"";position:absolute;left:-2px;top:12px;width:1px;height:16px;background:#dfe3e7}.log-tab.active:before,.log-tab.active+.log-tab:before{display:none}.log-body{padding:24px}.log-heading-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.log-heading-row h2{margin:0 0 7px;font-size:16px}.log-heading-row p{margin:0;color:var(--muted);font-size:12px}.log-actions{display:flex;align-items:center;gap:12px}.process-count{color:var(--red);border-color:#f4d5d3;background:#fff5f4}.log-filters{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:12px;margin-bottom:15px}.log-filters .field{height:43px}.log-filters .field span{font-size:12px}.log-table table{min-width:1100px}.log-table th{height:49px}.log-table td{height:64px}.log-table .event-cell{font-weight:500}.view-log{height:30px;padding:0 13px;border:1px solid #e4e8eb;border-radius:15px;background:#f6f7f8;font-size:11px}.log-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:17px;color:var(--muted);font-size:12px}.pagination-controls{display:flex;align-items:center;gap:7px;color:var(--ink)}.pagination-controls .page-size{margin-left:12px}.jump-input{width:45px;height:34px;border:1px solid #dfe3e7;border-radius:8px;text-align:center;outline:0}.log-detail-title{display:flex;align-items:center;justify-content:space-between;gap:16px}.log-detail-title h2{margin:0}.log-detail-id{color:var(--muted);font-size:12px}.no-log{height:320px;text-align:center;color:var(--muted)}
@media(max-width:1180px){.log-tabs{overflow:auto}.log-tablist{min-width:max-content}.log-filters{grid-template-columns:1fr 1fr}.log-filters .field:last-child{grid-column:1/-1}.log-heading-row{align-items:flex-start;flex-direction:column}.log-footer{align-items:flex-start;flex-direction:column}.pagination-controls{max-width:100%;overflow:auto}}
@media(max-width:760px){.page-canvas.log-page{padding:12px}.log-tabs{height:68px;padding:0 14px}.log-body{padding:14px}.log-filters{grid-template-columns:1fr}.log-filters .field:last-child{grid-column:auto}}

/* Order-list-aligned log filters. */
.log-title-meta{display:flex;align-items:center;gap:8px}.log-title-meta h2{margin:0!important}.log-title-meta .process-count{margin:0;font-size:12px;font-weight:500}.log-heading-row{align-items:flex-start;margin-bottom:16px}.log-filters.agv-filter-bar{margin:0 0 16px!important}.log-filters.agv-filter-bar .agv-filter-field{flex:1 1 200px!important;max-width:none}.log-filters.agv-filter-bar .agv-filter-actions{margin-left:auto}@media(max-width:1180px){.log-filters.agv-filter-bar .agv-filter-field{flex-basis:calc(50% - 8px)!important}.log-filters.agv-filter-bar .agv-filter-actions{margin-left:0}}@media(max-width:760px){.log-title-meta{align-items:flex-start;flex-direction:column;gap:5px}.log-filters.agv-filter-bar .agv-filter-field{flex-basis:100%!important}.log-filters.agv-filter-bar .agv-filter-actions{margin-left:0}}


/* Keep log status tags aligned with the rest of the configuration pages. */
.page-canvas.log-page :is(.tag,.title-status) {
  min-width: 0;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 3px 10px;
  border-width: 1px;
  border-style: solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}
.page-canvas.log-page :is(.tag,.title-status)::before {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
  content: "";
}

/* The full row is the detail action, including keyboard focus and feedback. */
.log-table tbody tr[data-log-index] {
  cursor: pointer;
  transition: background-color .15s ease;
}
.log-table tbody tr[data-log-index]:hover td { background: #f6fbff; }
.log-table tbody tr[data-log-index]:active td { background: #edf7ff; }
.log-table tbody tr[data-log-index]:focus-visible {
  outline: 2px solid rgba(21,119,210,.45);
  outline-offset: -2px;
}
</style>
<style scoped src="../styles/components.css"></style>
<style scoped>
.logs-reference-page { padding: 0; }
.logs-reference-page > .page-head { margin: 0; padding: 17px 20px; }
.page-btn:disabled { cursor: not-allowed; opacity: .45; }
@media (max-width:760px) { .logs-reference-page > .page-head { padding:14px; } }
</style>
