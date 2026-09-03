<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'

const nameFilter = ref('')
const statusFilter = ref('')
const refreshing = ref(false)
const detailVisible = ref(false)
const selectedDetail = ref(null)

const piles = ref([
  { code:'CHG-01', name:'一号充电桩', status:'充电中', tone:'charging', area:'实验室 A，东侧充电区', target:'AGV-03', rows:[['当前状态','为 AGV-03 充电中'],['额定功率','5.0 kW']], metric:'充电进度', value:'82%', progress:82 },
  { code:'CHG-02', name:'二号充电桩', status:'空闲', tone:'idle', area:'实验室 A，西侧充电区', target:'未占用', rows:[['当前状态','空闲，可接受预约'],['最近使用','AGV-08 · 09:42']], metric:'设备可用状态', value:'正常', progress:100 },
  { code:'CHG-03', name:'三号充电桩', status:'运行中', tone:'running', area:'实验室 A，东侧充电区', target:'AGV-07', rows:[['当前状态','为 AGV-03 充电中'],['额定功率','5.0 kW']], metric:'对接进度', value:'40%', progress:40 },
  { code:'CHG-04', name:'四号充电桩', status:'异常', tone:'danger', area:'实验室 B · 备用充电区', target:'暂停分配', rows:[['当前状态','为 AGV-03 充电中'],['影响范围','不可接受新预约']], metric:'充电进度', value:'03:08', progress:30 },
])

const batteries = ref([
  { code:'BAT-01', name:'动力电池', status:'使用中', tone:'charging', vendor:'宁德时代', model:'LFP-48V100Ah', agv:'AGV-01', value:'82%', progress:82 },
  { code:'BAT-02', name:'动力电池', status:'使用中', tone:'charging', vendor:'亿纬锂能', model:'EVE-48V80Ah', agv:'AGV-02', value:'57%', progress:57 },
  { code:'BAT-05', name:'动力电池', status:'低电量', tone:'warning', vendor:'国轩高科', model:'为 AGV-03 充电中', agv:'AGV-05', value:'19%', progress:19 },
  { code:'BAT-SP-01', name:'备用电池', status:'备用', tone:'idle', vendor:'宁德时代', model:'LFP-48V100Ah', agv:'—', serviceAgv:'AGV-03', value:'100%', progress:100 },
])

const shownPiles = computed(() => piles.value.filter(item =>
  (!nameFilter.value.trim() || `${item.code} ${item.name}`.toLowerCase().includes(nameFilter.value.trim().toLowerCase())) &&
  (!statusFilter.value.trim() || item.status.includes(statusFilter.value.trim()))
))

function resetFilters() {
  nameFilter.value = ''
  statusFilter.value = ''
}

function showDetail(item) {
  selectedDetail.value = item
  detailVisible.value = true
}

function refreshPage() {
  refreshing.value = true
  window.setTimeout(() => {
    refreshing.value = false
    ElMessage.success('充电桩状态已刷新')
  }, 600)
}
</script>

<template>
  <div class="page-view charging-pile-page">
    <PageHeader class="page-head" title="充电桩配置" description="查看充电桩实时状态、电池电量及其与 AGV 的绑定关系">
      <button class="primary-button" type="button" :disabled="refreshing" @click="refreshPage"><el-icon :class="{spinning:refreshing}"><Refresh /></el-icon>{{ refreshing ? '刷新中' : '刷新' }}</button>
    </PageHeader>

    <main class="page-canvas charging-content">
      <section class="filter-panel" aria-label="充电桩筛选">
        <div class="filters">
          <label><span>设备名称</span><input v-model="nameFilter" type="text" aria-label="设备名称" placeholder="请输入设备名称"></label>
          <label><span>设备状态</span><input v-model="statusFilter" type="text" aria-label="设备状态" placeholder="请输入设备状态"></label>
        </div>
        <div class="filter-actions"><button class="reset-button" type="button" @click="resetFilters"><el-icon><Refresh /></el-icon>重置</button><button class="search-button" type="button"><el-icon><Search /></el-icon>搜索</button></div>
      </section>

      <section class="resource-section">
        <header><h2>充电桩</h2><p>卡片展示充电桩外观、运行状态和正在服务的 AGV</p></header>
        <div class="card-grid">
          <article v-for="item in shownPiles" :key="item.code" :class="['resource-card',`tone-${item.tone}`]">
            <div class="card-title"><div class="identity"><span class="round-icon"><img src="/assets/charging-pile-figma.svg" alt=""></span><h3>{{ item.code }} {{ item.name }}</h3></div><span class="state-tag">{{ item.status }}</span></div>
            <div class="card-body"><div class="info-row location"><span>{{ item.area }}</span><b>{{ item.target }}</b></div><div v-for="row in item.rows" :key="row[0]" class="info-row"><span>{{ row[0] }}</span><b>{{ row[1] }}</b></div><div class="info-row metric"><strong>{{ item.metric }}</strong><b>{{ item.value }}</b></div><div class="progress"><i :style="{width:`${item.progress}%`}" /></div></div>
            <button class="detail-button" type="button" @click="showDetail(item)">查看详情</button>
          </article>
          <div v-if="!shownPiles.length" class="empty-state">没有符合条件的充电桩</div>
        </div>
      </section>

      <section class="resource-section battery-section">
        <header><h2>电池</h2><p>展示电池厂商、型号、当前电量和绑定 AGV；备用电池可以暂不绑定</p></header>
        <div class="card-grid">
          <article v-for="item in batteries" :key="item.code" :class="['resource-card',`tone-${item.tone}`]">
            <div class="card-title"><div class="identity"><span class="round-icon"><img src="/assets/battery-figma.svg" alt=""></span><h3>{{ item.code }}{{ item.name }}</h3></div><span class="state-tag">{{ item.status }}</span></div>
            <div class="card-body"><div class="info-row location"><span>电池厂商：{{ item.vendor }}</span><b>{{ item.serviceAgv || (item.agv === '—' ? '' : item.agv) }}</b></div><div class="info-row"><span>电池型号</span><b>{{ item.model }}</b></div><div class="info-row"><span>当前绑定 AGV</span><b>{{ item.agv }}</b></div><div class="info-row metric"><strong>当前电量</strong><b>{{ item.value }}</b></div><div class="progress"><i :style="{width:`${item.progress}%`}" /></div></div>
            <button class="detail-button" type="button" @click="showDetail(item)">查看详情</button>
          </article>
        </div>
      </section>
    </main>

    <div v-if="detailVisible" class="detail-overlay" @click.self="detailVisible=false">
      <section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="charging-detail-title">
        <header class="detail-header"><div class="detail-heading"><img src="/assets/charging-pile-figma.svg" alt=""><h2 id="charging-detail-title">充电桩详情 · {{ selectedDetail?.code || 'CHG-01' }}</h2><span class="state-tag tone-charging">充电中</span></div><button class="dialog-close" type="button" aria-label="关闭" @click="detailVisible=false">×</button></header>

        <div class="detail-scroll">
          <section class="charging-overview">
            <div class="pile-illustration"><img src="/assets/charging-pile-figma.svg" alt="充电桩"></div>
            <div class="service-card"><small>当前服务对象</small><strong>正在为 AGV-03 充电</strong><p>动力电池 BAT-03 · 预计 11:06 完成</p><div class="overview-meter"><span><b>当前电量</b><em>76%</em></span><i><b /></i></div></div>
            <div class="overview-stats"><article><small>当前服务对象</small><strong>今天 10:18</strong></article><article><small>预计剩余时间</small><strong>约23分钟</strong></article></div>
          </section>

          <section class="detail-block"><h3>基础信息与实时数据</h3><div class="fact-grid"><article><small>充电桩名称</small><strong>{{ selectedDetail?.name || '一号充电桩' }}</strong></article><article><small>所在位置</small><strong>{{ selectedDetail?.area || '实验室 A · 东侧充电区' }}</strong></article><article><small>厂商 / 型号</small><strong>星云智充 / NC-50</strong></article><article><small>连接状态</small><strong class="success-text">在线</strong></article><article><small>通信地址</small><strong>192.168.10.31</strong></article><article><small>额定功率</small><strong>5.0 kW</strong></article><article><small>实时电压 / 电流</small><strong>51.8 V / 62.4 A</strong></article><article><small>实时功率 / 温度</small><strong>3.23 kW / 38.6 °C</strong></article></div></section>

          <section class="detail-block"><h3>当前关联与预约队列</h3><div class="queue-grid"><article class="queue-card"><header><strong>当前充电任务</strong><span>执行中</span></header><p><span>关联 AGV</span><b>AGV-03</b></p><p><span>关联电池</span><b>BAT-03 · LFP_48V100Ah</b></p><p><span>关联订单</span><b>ORD-20260901-0018</b></p><p><span>进入充电条件</span><b>任务完成且电量低于25%</b></p></article><article class="queue-card"><header><strong>当前充电任务</strong><b>1 台等待V-03</b></header><p><span>下一台 AGV</span><b>AGV-07</b></p><p><span>当前电量</span><b>18%</b></p><p><span>预约优先级</span><b>P2 · 普通</b></p><p><span>预计开始</span><b>11:10</b></p></article></div></section>

          <section class="detail-block"><h3>最近充电记录</h3><div class="record-table-wrap"><table class="record-table"><thead><tr><th>AGV</th><th>开始时间</th><th>结束时间</th><th>电量变化</th><th>结果</th></tr></thead><tbody><tr><td>AGV-08</td><td>08:18</td><td>09:18</td><td>21% → 93%</td><td class="success-text">完成</td></tr><tr><td>2026-08-16 09:18:42</td><td>2026-08-16 09:18:42</td><td>2026-08-16 09:18:42</td><td>21% - 93%</td><td class="success-text">完成</td></tr></tbody></table></div></section>
        </div>

        <footer class="detail-footer"><button type="button" @click="detailVisible=false">关闭</button><button class="refresh-detail" type="button" @click="refreshPage"><el-icon :class="{spinning:refreshing}"><Refresh /></el-icon>刷新状态</button></footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.charging-pile-page{padding:0}.page-head{margin:0;padding:17px 24px}.charging-content{display:grid;grid-auto-rows:max-content;align-content:start;gap:20px;min-height:calc(100vh - 148px);padding:24px;background:var(--agv-canvas,#f5f6f7);box-sizing:border-box}
.primary-button,.reset-button,.search-button{height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 16px;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}.primary-button,.search-button{color:#fff;background:var(--agv-blue)}.reset-button{color:var(--agv-ink);background:rgba(8,24,41,.04)}
.filter-panel,.resource-section{box-sizing:border-box;border:1px solid rgba(8,24,41,.035);border-radius:12px;background:#fff;box-shadow:0 4px 14px rgba(8,24,41,.055)}.filter-panel{height:80px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px}.filters,.filter-actions{display:flex;align-items:center;gap:12px}.filters{flex:1;gap:16px}.filters label{height:40px;display:flex;align-items:center;flex:0 1 452px;box-sizing:border-box;padding:0 12px;border:1px solid rgba(8,24,41,.1);border-radius:8px}.filters label:focus-within{border-color:var(--agv-blue);box-shadow:0 0 0 2px rgba(21,119,210,.1)}.filters label span{flex:none;margin-right:12px;color:rgba(8,24,41,.48);font-size:14px}.filters input{height:100%;flex:1;min-width:0;padding:0;border:0;outline:0;color:#081829;background:transparent;font:inherit;font-size:14px}.filters input::placeholder{color:rgba(8,24,41,.28)}
.resource-section{min-height:407px;padding:20px}.resource-section header{margin-bottom:16px}.resource-section h2{margin:0;color:#081829;font-size:14px;line-height:20px}.resource-section header p{margin:4px 0 0;color:rgba(8,24,41,.48);font-size:12px;line-height:16px}.card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.resource-card{min-width:0;min-height:311px;display:flex;flex-direction:column;gap:24px;padding:20px;border:1px solid rgba(8,24,41,.06);border-radius:12px;background:#fff}.card-title,.identity,.info-row{display:flex;align-items:center}.card-title,.info-row{justify-content:space-between;gap:10px}.identity{min-width:0;gap:8px}.round-icon{width:36px;height:36px;display:grid;place-items:center;flex:none;border-radius:999px;background:rgba(21,119,210,.08)}.round-icon img{width:20px;height:20px;display:block}.card-title h3{overflow:hidden;margin:0;color:#081829;font-size:24px;line-height:32px;white-space:nowrap;text-overflow:ellipsis}.state-tag{min-height:22px;display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:none;box-sizing:border-box;padding:2px 10px 2px 7px;border:1px solid currentColor;border-radius:999px;font-size:12px;line-height:16px}.state-tag::before{width:5px;height:5px;border-radius:50%;background:currentColor;content:""}
.card-body{display:grid;gap:16px}.info-row{color:rgba(8,24,41,.48);font-size:14px;line-height:20px}.info-row span{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.info-row b{flex:none;color:#081829;font-weight:400}.info-row.metric strong{color:#081829;font-weight:600}.progress{height:6px;overflow:hidden;border-radius:999px;background:rgba(21,119,210,.15)}.progress i{display:block;height:100%;border-radius:inherit;background:#1577d2}.detail-button{padding:16px 0 0;border:0;border-top:1px solid #f5f6f7;color:#1577d2;background:transparent;text-align:right;font-size:14px;font-weight:600;cursor:pointer}
.tone-charging{color:#1577d2}.tone-idle{color:#28bd6b}.tone-running{color:#975aed}.tone-danger{color:#f24e3f}.tone-warning{color:#ff6a22}.resource-card .state-tag,.resource-card .info-row.location b,.resource-card .info-row.metric b{color:currentColor}.tone-idle .progress{background:rgba(40,189,107,.12)}.tone-idle .progress i{background:#28bd6b}.tone-running .progress{background:rgba(151,90,237,.1)}.tone-running .progress i{background:#975aed}.tone-danger .progress{background:rgba(242,78,63,.1)}.tone-danger .progress i{background:#f24e3f}.tone-warning .progress{background:rgba(255,106,34,.12)}.tone-warning .progress i{background:#ff6a22}.battery-section{margin-bottom:4px}.empty-state{grid-column:1/-1;padding:80px 20px;color:var(--agv-text-muted);text-align:center}.primary-button:disabled{cursor:wait;opacity:.72}.spinning{animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:1200px){.card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card-title h3{font-size:20px;line-height:28px}.resource-section{min-height:auto}}@media(max-width:760px){.charging-content{padding:14px}.filter-panel{height:auto;align-items:stretch;flex-direction:column}.filters{align-items:stretch;flex-direction:column}.filters label{flex-basis:auto;width:100%}.filter-actions{justify-content:flex-end}.card-grid{grid-template-columns:1fr}.resource-card{gap:18px}.card-title h3{font-size:18px}}
.detail-overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:28px;background:rgba(0,0,0,.6)}.detail-dialog{width:min(1029px,calc(100vw - 40px));max-height:calc(100vh - 56px);display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.22)}.detail-header{display:flex;align-items:center;justify-content:space-between;padding:20px}.detail-heading{display:flex;align-items:center;gap:16px}.detail-heading>img{width:20px;height:20px}.detail-heading h2{margin:0;color:#081829;font-size:16px;line-height:24px}.dialog-close{width:28px;height:28px;border:0;color:rgba(8,24,41,.55);background:transparent;font-size:25px;line-height:1;cursor:pointer}.detail-scroll{display:grid;gap:24px;overflow:auto;padding:0 20px 20px}.charging-overview{display:grid;grid-template-columns:156px minmax(0,1fr) 266px;align-items:center;gap:24px;padding:16px;border:1px solid rgba(8,24,41,.06);border-radius:16px}.pile-illustration{width:152px;height:152px;display:grid;place-items:center;border:1px solid rgba(8,24,41,.06);border-radius:50%}.pile-illustration img{width:120px;height:120px}.service-card{height:224px;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;padding:20px;border:1px solid rgba(8,24,41,.06);border-radius:12px}.service-card small,.overview-stats small,.fact-grid small{color:rgba(8,24,41,.48);font-size:12px}.service-card>strong,.overview-stats strong{display:block;margin-top:8px;color:#081829;font-size:24px;line-height:32px}.service-card>p{margin:8px 0 18px;color:rgba(8,24,41,.48);font-size:14px}.overview-meter span{display:flex;justify-content:space-between;font-size:14px}.overview-meter em{color:#1577d2;font-style:normal}.overview-meter>i{height:6px;display:block;overflow:hidden;margin-top:10px;border-radius:999px;background:rgba(21,119,210,.15)}.overview-meter>i b{width:76%;height:100%;display:block;border-radius:inherit;background:#1577d2}.overview-stats{display:grid;gap:24px}.overview-stats article{padding:20px;border:1px solid rgba(8,24,41,.06);border-radius:12px}.detail-block{display:grid;gap:16px}.detail-block h3{margin:0;color:#081829;font-size:20px;line-height:28px}.fact-grid{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid rgba(8,24,41,.06);border-radius:16px}.fact-grid article{display:grid;gap:8px;padding:12px 16px;border-right:1px solid #f5f6f7;border-bottom:1px solid #f5f6f7}.fact-grid article:nth-child(4n){border-right:0}.fact-grid article:nth-child(n+5){border-bottom:0}.fact-grid strong{color:#081829;font-size:14px;font-weight:500}.success-text{color:#28bd6b!important}.queue-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.queue-card{overflow:hidden;border:1px solid rgba(8,24,41,.06);border-radius:16px}.queue-card header,.queue-card p{min-height:56px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;margin:0;padding:0 16px;border-bottom:1px solid #f5f6f7;font-size:14px}.queue-card header{background:rgba(8,24,41,.02)}.queue-card header span{padding:2px 8px;border-radius:999px;color:#1577d2;background:rgba(21,119,210,.08);font-size:12px}.queue-card p:last-child{border-bottom:0}.queue-card p span{color:rgba(8,24,41,.48)}.queue-card p b,.queue-card header b{color:#081829;font-weight:400}.record-table-wrap{overflow:auto}.record-table{width:100%;border-collapse:collapse;font-size:14px}.record-table th,.record-table td{height:56px;padding:0 16px;border-bottom:1px solid #f5f6f7;text-align:left;white-space:nowrap}.record-table th{height:48px;background:rgba(8,24,41,.02);font-size:12px}.detail-footer{display:flex;justify-content:flex-end;gap:10px;padding:24px 12px 16px;border-top:1px solid rgba(8,24,41,.06)}.detail-footer button{height:36px;display:inline-flex;align-items:center;gap:6px;padding:0 16px;border:0;border-radius:8px;color:#081829;background:rgba(8,24,41,.04);cursor:pointer}.detail-footer .refresh-detail{color:#fff;background:#1577d2}@media(max-width:800px){.detail-overlay{padding:12px}.detail-dialog{width:100%;max-height:calc(100vh - 24px)}.charging-overview{grid-template-columns:1fr}.pile-illustration{margin:auto}.fact-grid{grid-template-columns:repeat(2,1fr)}.fact-grid article:nth-child(2n){border-right:0}.fact-grid article:nth-child(n+5){border-bottom:1px solid #f5f6f7}.queue-grid{grid-template-columns:1fr}}
</style>
