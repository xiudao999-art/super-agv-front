<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const activeTab = ref('hardware')
const activeModule = ref('chassis')
const debugMode = ref(false)
const selectedAgv = ref('AGV-01')
const armSpeed = ref(10)
const armSubTab = ref('关节点动')
const cameraAction = ref('单次拍照')
const gripperInitialized = ref(false)
const gripper = reactive({ opening: 72, force: 35, speed: 25 })
const selectedFlowNode = ref('移动至取料位')
const pendingRecovery = ref(null)
const toastMessage = ref('')
let toastTimer

const agvs = Array.from({ length: 9 }, (_, index) => `AGV-${String(index + 1).padStart(2, '0')}`)
const profiles = {
  'AGV-01': { x: 18.4, y: 3.2, yaw: 90, left: 47, top: 62 }, 'AGV-02': { x: 12.8, y: 5.6, yaw: 0, left: 35, top: 49 }, 'AGV-03': { x: 25.2, y: 7.1, yaw: 180, left: 64, top: 38 },
  'AGV-04': { x: 8.6, y: 2.4, yaw: 90, left: 24, top: 68 }, 'AGV-05': { x: 29.1, y: 4.8, yaw: -90, left: 72, top: 54 }, 'AGV-06': { x: 16.3, y: 8.2, yaw: 180, left: 43, top: 31 },
  'AGV-07': { x: 21.7, y: 6.4, yaw: 0, left: 56, top: 43 }, 'AGV-08': { x: 5.4, y: 7.8, yaw: 90, left: 17, top: 34 }, 'AGV-09': { x: 31.6, y: 1.8, yaw: 180, left: 78, top: 73 },
}
const position = reactive({ ...profiles['AGV-01'] })
const modules = [
  { key: 'chassis', title: '底盘', sub: '地图 / 方向控制' }, { key: 'arm', title: '机械臂', sub: '关节 / 坐标系点动' }, { key: 'camera', title: '相机', sub: '拍照 / 定位 / 识别' }, { key: 'gripper', title: '夹具', sub: '开度 / 力 / 速度' },
]
const recoveryConfig = {
  chassis: { module: '底盘', description: '覆盖通信中断、任务暂停、可恢复告警和运动异常 · 调试模式下可用', actions: [
    { name: '刷新底盘状态', label: '刷新底盘状态', detail: '重新读取位置、任务和主次告警', issue: '位置、任务状态或告警信息未及时刷新' },
    { name: '重连底盘通信', label: '重连底盘通信', detail: '重新建立通信并校验心跳', issue: '网络波动、心跳超时或设备短时离线' },
    { name: '清除可恢复告警', label: '清除可恢复告警', detail: '确认现场安全后清除异常状态', issue: '障碍解除后仍保留可恢复异常状态', confirm: true },
    { name: '停止底盘运动', label: '停止底盘运动', detail: '立即停止当前点动或调试运动', issue: '路径偏离、避障异常或运动状态不符合预期', danger: true },
  ] },
  arm: { module: '机械臂', description: '覆盖关节错误、保护停止、暂停和使能丢失 · 调试模式下可用', actions: [
    { name: '读取机械臂错误码', label: '读取错误码', detail: '读取机器人、关节和安全状态', issue: '关节、通信或安全回路状态不明确' },
    { name: '停止机械臂运动', label: '停止机械臂', detail: '停止当前点动或运行指令', issue: '运动轨迹或姿态异常，需要立即停止', danger: true },
    { name: '清除可恢复告警', label: '清除可恢复告警', detail: '不绕过急停、光栅等外部安全条件', issue: '碰撞物或外部保护条件已经解除', confirm: true },
    { name: '尝试恢复使能', label: '尝试恢复使能', detail: '恢复到可运行待命状态', issue: '控制器在线但机械臂处于暂停或未使能状态', confirm: true },
  ] },
  camera: { module: '相机', description: '覆盖未回复、拍照失败、成像异常和标定参数不同步 · 调试模式下可用', actions: [
    { name: '读取相机诊断状态', label: '读取诊断状态', detail: '读取连接、方案、曝光和最近结果', issue: '相机未回复、拍照状态或当前方案不明确' },
    { name: '重连相机', label: '重连相机', detail: '重新登录并检查当前方案', issue: '设备未回复或相机连接短时中断' },
    { name: '重新采集图像', label: '重新采集图像', detail: '沿用当前参数执行单次采集', issue: '拍照失败、图像模糊或亮度异常' },
    { name: '重新加载标定参数', label: '加载标定参数', detail: '加载所选 AGV 已发布的相机方案', issue: '切换电脑或方案后标定参数不同步', confirm: true },
  ] },
  gripper: { module: '夹具', description: '覆盖初始化失败、夹持不到位、力反馈异常和掉落告警 · 调试模式下可用', actions: [
    { name: '读取夹持状态', label: '读取夹持状态', detail: '读取开度、力反馈和到位信号', issue: '开度、夹持力或到位反馈不明确' },
    { name: '重新初始化夹具', label: '重新初始化', detail: '回到设备定义的初始化状态', issue: '上电后未初始化或初始化状态丢失', confirm: true },
    { name: '打开至安全位', label: '打开至安全位', detail: '确认承托物料后释放夹具', issue: '夹持不到位、物料卡住或掉落告警', confirm: true },
    { name: '停止夹具动作', label: '停止夹具动作', detail: '立即停止当前开合动作', issue: '开合超时、力反馈异常或运动受阻', danger: true },
  ] },
}
const joints = [{ name: 'J1', value: '0.0000' }, { name: 'J2', value: '-15.0000' }, { name: 'J3', value: '45.0000' }, { name: 'J4', value: '0.0000' }, { name: 'J5', value: '60.0000' }, { name: 'J6', value: '0.0000' }]
const cameraActions = [{ name: '单次拍照', detail: '获取当前视野图像' }, { name: '条码识别', detail: '读取载具或样本编码' }, { name: '目标定位', detail: '返回目标空间坐标' }, { name: '偏移测量', detail: '计算抓取补偿偏移' }]
const flowNodes = [{ name: '开始', detail: '流程入口', control: true }, { name: '移动至取料位', detail: '底盘移动 · 3 个子动作' }, { name: '机械臂取料', detail: '机械臂与夹具 · 4 个子动作' }, { name: '移动至放料位', detail: '底盘移动 · 3 个子动作' }, { name: '结束', detail: '流程出口', control: true }]
const suffix = computed(() => selectedAgv.value.slice(-2))

function showToast(message) {
  toastMessage.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 2200)
}
function toggleDebugMode() {
  debugMode.value = !debugMode.value
  showToast(debugMode.value ? '已进入设备调试模式' : '安全复位完成，已返回生产模式')
}
function selectAgv() {
  Object.assign(position, profiles[selectedAgv.value])
  showToast(`已切换到 ${selectedAgv.value}，各硬件模组已同步`)
}
function jog(action) {
  if (action === 'forward') { position.y += .1; position.top = Math.max(8, position.top - 1.2); position.yaw = 90 }
  if (action === 'back') { position.y -= .1; position.top = Math.min(92, position.top + 1.2); position.yaw = -90 }
  if (action === 'left') { position.x -= .1; position.left = Math.max(8, position.left - 1.2); position.yaw = 180 }
  if (action === 'right') { position.x += .1; position.left = Math.min(92, position.left + 1.2); position.yaw = 0 }
  showToast(action === 'stop' ? '底盘运动已停止' : '底盘点动指令已执行')
}
function debugAction(name) { showToast(`${name}已触发`) }
function recoveryAction(config, action) {
  if (!action.confirm) return showToast(`${selectedAgv.value} · ${action.name}指令已触发`)
  pendingRecovery.value = { ...action, module: config.module }
  document.body.style.overflow = 'hidden'
}
function closeRecovery() { pendingRecovery.value = null; document.body.style.overflow = '' }
function confirmRecovery() {
  const name = pendingRecovery.value?.name
  closeRecovery()
  if (name) showToast(`${selectedAgv.value} · ${name}指令已执行`)
}
function gripperAction(name) {
  if (name === '初始化') gripperInitialized.value = true
  showToast(`${name}指令已执行`)
}
function onKeydown(event) { if (event.key === 'Escape' && pendingRecovery.value) closeRecovery() }

watch(selectedAgv, () => Object.assign(position, profiles[selectedAgv.value]))
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => { document.removeEventListener('keydown', onKeydown); window.clearTimeout(toastTimer); document.body.style.overflow = '' })
</script>

<template>
  <div class="device-debug-view">
    <header class="page-head"><div><h1>设备调试</h1><p>调试 AGV 单个硬件模组，或按单个节点、完整流程运行</p></div></header>
    <div class="page-canvas debug-page"><section class="debug-card">
      <div class="debug-tabs" role="tablist" aria-label="设备调试类型"><button :class="['debug-tab', { active: activeTab === 'hardware' }]" type="button" role="tab" :aria-selected="activeTab === 'hardware'" @click="activeTab = 'hardware'">硬件模组调试</button><button :class="['debug-tab', { active: activeTab === 'flow' }]" type="button" role="tab" :aria-selected="activeTab === 'flow'" @click="activeTab = 'flow'">AGV 流程调试</button></div>
      <div class="debug-card-body">
        <section v-if="activeTab === 'hardware'" role="tabpanel">
          <div class="debug-callout">硬件模组调试只调用 <strong>{{ selectedAgv }}</strong> 上选定的一个模组。底盘支持地图方向控制，机械臂支持关节与坐标系点动，相机和夹具按独立控制参数运行。</div>
          <div class="debug-modebar"><div><strong>{{ debugMode ? '当前处于设备调试模式' : '当前处于生产模式' }}</strong><small>{{ debugMode ? '可使用当前页面的调试控制；退出时执行安全复位。' : '进入调试模式后启用控制按钮。' }}</small></div><div class="debug-mode-actions"><span :class="['status-chip', debugMode ? 'warning' : 'success']">{{ debugMode ? '调试模式' : '生产模式' }}</span><button :class="['debug-button', debugMode ? 'primary' : 'danger']" type="button" @click="toggleDebugMode">{{ debugMode ? '退出调试并安全复位' : '进入设备调试模式' }}</button></div></div>
          <div class="module-tabs" role="tablist" aria-label="硬件模组选择"><button v-for="module in modules" :key="module.key" :class="['module-tab', { active: activeModule === module.key }]" type="button" role="tab" :aria-selected="activeModule === module.key" @click="activeModule = module.key"><strong>{{ module.title }}</strong><small>{{ module.sub }}</small></button></div>

          <section v-if="activeModule === 'chassis'" class="module-panel">
            <div class="panel-title"><div><h2>底盘地图与方向控制</h2><p>方向控制叠加在当前地图上，操作后同步刷新 AGV 位置和空间坐标</p></div><div class="inline-actions"><span class="status-chip info">地图 V3.2</span><span class="status-chip success">实时定位</span></div></div>
            <div class="module-agv-selector"><label><span>选择调试 AGV</span><select v-model="selectedAgv" :disabled="debugMode" aria-label="选择底盘调试 AGV" @change="selectAgv"><option v-for="agv in agvs" :key="agv">{{ agv }}</option><option disabled>AGV-10（离线）</option></select></label><div><strong>{{ selectedAgv }}</strong><small>在线 · 切换后同步当前底盘和地图位置</small></div></div>
            <section class="recovery-panel" aria-label="底盘异常快捷处理"><div class="recovery-head"><div><h3>常见异常快捷处理</h3><p>{{ recoveryConfig.chassis.description }}</p></div><span>底盘</span></div><div class="recovery-actions"><button v-for="action in recoveryConfig.chassis.actions" :key="action.name" :class="['recovery-action', { danger: action.danger }]" type="button" :disabled="!debugMode" @click="recoveryAction(recoveryConfig.chassis, action)"><strong>{{ action.label }}</strong><small>{{ action.detail }}</small></button></div></section>
            <div class="debug-map-layout"><div class="debug-map"><img src="/assets/agvmap.png" alt="与运行总览一致的 AGV 调试地图"><span class="debug-robot" :style="{ left: `${position.left}%`, top: `${position.top}%` }" :data-label="selectedAgv" :aria-label="`${selectedAgv} 当前点位`" /><div class="map-controls"><strong>{{ selectedAgv }} 方向控制</strong><small>进入调试模式后启用点动</small><div class="dpad"><button class="forward" type="button" :disabled="!debugMode" aria-label="向前" @click="jog('forward')">↑</button><button class="left" type="button" :disabled="!debugMode" aria-label="向左" @click="jog('left')">←</button><button class="stop" type="button" :disabled="!debugMode" aria-label="停止" @click="jog('stop')">■</button><button class="right" type="button" :disabled="!debugMode" aria-label="向右" @click="jog('right')">→</button><button class="back" type="button" :disabled="!debugMode" aria-label="向后" @click="jog('back')">↓</button></div></div><div class="map-position"><span class="status-chip info">X {{ position.x.toFixed(3) }} m</span><span class="status-chip info">Y {{ position.y.toFixed(3) }} m</span><span class="status-chip info">θ {{ position.yaw.toFixed(1) }}°</span><span class="status-chip success">DOOR-A-01</span></div></div><aside class="coordinate-list"><div class="coordinate-card"><span>空间 X</span><strong>{{ position.x.toFixed(3) }} m</strong></div><div class="coordinate-card"><span>空间 Y</span><strong>{{ position.y.toFixed(3) }} m</strong></div><div class="coordinate-card"><span>朝向 θ</span><strong>{{ position.yaw.toFixed(1) }}°</strong></div><div class="coordinate-card"><span>定位点</span><strong>DOOR-A-01</strong></div><div class="device-info-card"><span>底盘设备</span><strong>CHASSIS-{{ suffix }}</strong><small>HIKROBOT · 在线</small></div><button class="debug-button" type="button" :disabled="!debugMode" @click="debugAction('读取实时位置')">重新读取实时位置</button></aside></div>
          </section>

          <section v-if="activeModule === 'arm'" class="module-panel">
            <div class="panel-title"><div><h2>机械臂调试</h2><p>设备信息、运动速度和点动控制均来自当前机械臂配置</p></div><span :class="['status-chip', debugMode ? 'warning' : 'info']">{{ debugMode ? '允许点动' : '点动已锁定' }}</span></div>
            <div class="module-agv-selector"><label><span>选择调试 AGV</span><select v-model="selectedAgv" :disabled="debugMode" aria-label="选择机械臂调试 AGV" @change="selectAgv"><option v-for="agv in agvs" :key="agv">{{ agv }}</option><option disabled>AGV-10（离线）</option></select></label><div><strong>{{ selectedAgv }}</strong><small>在线 · 仅控制所选 AGV 的机械臂</small></div></div>
            <section class="recovery-panel" aria-label="机械臂异常快捷处理"><div class="recovery-head"><div><h3>常见异常快捷处理</h3><p>{{ recoveryConfig.arm.description }}</p></div><span>机械臂</span></div><div class="recovery-actions"><button v-for="action in recoveryConfig.arm.actions" :key="action.name" :class="['recovery-action', { danger: action.danger }]" type="button" :disabled="!debugMode" @click="recoveryAction(recoveryConfig.arm, action)"><strong>{{ action.label }}</strong><small>{{ action.detail }}</small></button></div></section>
            <div class="device-info-grid"><div class="device-info-card"><span>设备名称</span><strong>协作机械臂 ARM-{{ suffix }}</strong><small>DOBOT CR10</small></div><div class="device-info-card"><span>IP 地址</span><strong>192.168.20.22</strong><small>控制端口 5000</small></div><div class="device-info-card"><span>连接状态</span><strong class="success-text">在线</strong><small>通信正常</small></div></div>
            <label class="range-setting"><span><strong>运动速度</strong><small>调试速度百分比</small></span><input v-model="armSpeed" type="range" min="1" max="50"><output>{{ armSpeed }}%</output></label><div class="sub-tabs"><button v-for="tab in ['关节点动','坐标系点动']" :key="tab" :class="['sub-tab', { active: armSubTab === tab }]" type="button" @click="armSubTab = tab; showToast(`已切换至${tab}`)">{{ tab }}</button></div><div class="jog-settings"><label>点动方式<select><option>定距点动</option><option>连续点动</option></select></label><label>单次角度（°）<select><option>0.1</option><option>0.5</option><option>1</option></select></label></div><div class="jog-list"><div v-for="joint in joints" :key="joint.name" class="jog-row"><button type="button" :disabled="!debugMode" @click="debugAction(`${joint.name} 反向点动`)">{{ joint.name }}−</button><span class="jog-value">{{ joint.value }}<small>°</small></span><button type="button" :disabled="!debugMode" @click="debugAction(`${joint.name} 正向点动`)">{{ joint.name }}＋</button></div></div><div class="panel-actions" style="margin-top:14px"><button class="debug-button" type="button" :disabled="!debugMode" @click="debugAction('机械臂回 HOME')">回 HOME</button><button class="debug-button danger" type="button" :disabled="!debugMode" @click="debugAction('停止机械臂运动')">停止运动</button></div>
          </section>

          <section v-if="activeModule === 'camera'" class="module-panel">
            <div class="panel-title"><div><h2>相机调试</h2><p>执行单次采集、条码识别、目标定位和偏移测量</p></div><span class="status-chip success"><span>CAMERA-{{ suffix }}</span>&nbsp;在线</span></div>
            <div class="module-agv-selector"><label><span>选择调试 AGV</span><select v-model="selectedAgv" :disabled="debugMode" aria-label="选择相机调试 AGV" @change="selectAgv"><option v-for="agv in agvs" :key="agv">{{ agv }}</option><option disabled>AGV-10（离线）</option></select></label><div><strong>{{ selectedAgv }}</strong><small>在线 · 使用当前 AGV 的相机方案与标定参数</small></div></div>
            <section class="recovery-panel" aria-label="相机异常快捷处理"><div class="recovery-head"><div><h3>常见异常快捷处理</h3><p>{{ recoveryConfig.camera.description }}</p></div><span>相机</span></div><div class="recovery-actions"><button v-for="action in recoveryConfig.camera.actions" :key="action.name" :class="['recovery-action', { danger: action.danger }]" type="button" :disabled="!debugMode" @click="recoveryAction(recoveryConfig.camera, action)"><strong>{{ action.label }}</strong><small>{{ action.detail }}</small></button></div></section>
            <div class="quick-actions"><button v-for="action in cameraActions" :key="action.name" :class="['quick-action', { active: cameraAction === action.name }]" type="button" @click="cameraAction = action.name"><strong>{{ action.name }}</strong><small>{{ action.detail }}</small></button></div><div class="parameter-grid"><label>曝光时间（ms）<input value="18"></label><label>识别超时（秒）<input type="number" value="5"></label><label>重试次数<input type="number" value="1"></label></div><div class="panel-actions" style="margin-top:16px"><button class="debug-button primary" type="button" :disabled="!debugMode" @click="debugAction('执行相机调试动作')">执行当前动作</button></div>
          </section>

          <section v-if="activeModule === 'gripper'" class="module-panel">
            <div class="panel-title"><div><h2>夹具调试</h2><p>滑杆用于快速设置目标开度、夹持力和运动速度</p></div><span :class="['status-chip', gripperInitialized ? 'success' : 'warning']">{{ gripperInitialized ? '已初始化' : '待初始化' }}</span></div>
            <div class="module-agv-selector"><label><span>选择调试 AGV</span><select v-model="selectedAgv" :disabled="debugMode" aria-label="选择夹具调试 AGV" @change="selectAgv"><option v-for="agv in agvs" :key="agv">{{ agv }}</option><option disabled>AGV-10（离线）</option></select></label><div><strong>{{ selectedAgv }}</strong><small>在线 · 仅控制所选 AGV 的末端夹具</small></div></div>
            <section class="recovery-panel" aria-label="夹具异常快捷处理"><div class="recovery-head"><div><h3>常见异常快捷处理</h3><p>{{ recoveryConfig.gripper.description }}</p></div><span>夹具</span></div><div class="recovery-actions"><button v-for="action in recoveryConfig.gripper.actions" :key="action.name" :class="['recovery-action', { danger: action.danger }]" type="button" :disabled="!debugMode" @click="recoveryAction(recoveryConfig.gripper, action)"><strong>{{ action.label }}</strong><small>{{ action.detail }}</small></button></div></section>
            <div class="device-info-grid"><div class="device-info-card"><span>设备名称</span><strong>电动夹具 GRIPPER-DH-{{ suffix }}</strong><small>DH · EG-20</small></div><div class="device-info-card"><span>连接状态</span><strong class="success-text">在线</strong><small>Modbus TCP</small></div><div class="device-info-card"><span>当前开度</span><strong>{{ gripper.opening }}%</strong><small>实时反馈值</small></div></div><div class="gripper-controls" style="margin-top:16px"><label class="gripper-control"><span><strong>目标开度</strong><small>0% 闭合 / 100% 打开</small></span><input v-model="gripper.opening" type="range" min="0" max="100"><output>{{ gripper.opening }}%</output></label><label class="gripper-control"><span><strong>夹持力</strong><small>按载具和安全限制设置</small></span><input v-model="gripper.force" type="range" min="1" max="100"><output>{{ gripper.force }}%</output></label><label class="gripper-control"><span><strong>运动速度</strong><small>夹具开合速度</small></span><input v-model="gripper.speed" type="range" min="1" max="100"><output>{{ gripper.speed }}%</output></label></div><div class="panel-actions" style="margin-top:16px"><button v-for="action in ['初始化','打开夹具','闭合夹具','确认夹持状态']" :key="action" :class="['debug-button', { primary: ['打开夹具','闭合夹具'].includes(action) }]" type="button" :disabled="!debugMode" @click="gripperAction(action)">{{ action }}</button></div>
          </section>
        </section>

        <section v-else role="tabpanel">
          <div class="debug-callout"><strong>{{ selectedAgv }}</strong> 流程调试读取“流程与动作”中的已有流程。可运行选中节点或整条流程，所有调试动作仅在进入设备调试模式后启用。</div><div class="debug-modebar"><div><strong>{{ debugMode ? '当前处于设备调试模式' : '当前处于生产模式' }}</strong><small>{{ debugMode ? '流程执行控制已启用。' : '流程执行控制已锁定。' }}</small></div><span :class="['status-chip', debugMode ? 'warning' : 'success']">{{ debugMode ? '调试模式' : '生产模式' }}</span></div>
          <div class="flow-agv-selector"><label><span>选择调试 AGV（必选）</span><select v-model="selectedAgv" :disabled="debugMode" aria-label="选择流程调试 AGV" @change="selectAgv"><option v-for="agv in agvs" :key="agv">{{ agv }}</option><option disabled>AGV-10（离线）</option></select></label><div><strong>{{ selectedAgv }}</strong><small>在线 · 选定后再选择该 AGV 要调试的流程</small></div></div><div class="flow-toolbar"><label>已有流程（必选）<select><option>FLOW-001 · 样本入库流程</option><option>FLOW-002 · AGV 自动回充流程</option></select></label><label>调试范围<select><option>运行选中节点</option><option>运行整条流程</option></select></label><button class="debug-button primary" type="button" :disabled="!debugMode" @click="debugAction('开始流程调试')">开始调试</button></div>
          <div class="flow-layout"><section class="flow-list"><h2>流程节点</h2><div class="flow-nodes"><button v-for="(node, index) in flowNodes" :key="node.name" :class="['flow-node', { active: selectedFlowNode === node.name }]" type="button" @click="selectedFlowNode = node.name"><span class="index">{{ index + 1 }}</span><span><strong>{{ node.name }}</strong><small>{{ node.detail }}</small></span><span :class="['status-chip', node.control ? 'info' : selectedFlowNode === node.name ? 'success' : 'info']">{{ node.control ? '控制节点' : selectedFlowNode === node.name ? '已选择' : '未选择' }}</span></button></div></section><section class="flow-editor"><div class="panel-title"><div><h2>{{ selectedFlowNode }}</h2><p>参数只影响本次调试，不修改已发布流程</p></div><span class="status-chip warning">本次调试参数</span></div><div class="parameter-grid"><label>目标导航点<select><option>PICK-A-01</option><option>WAIT-A-01</option></select></label><label>速度上限（m/s）<input type="number" value="0.6" step="0.1"></label><label>总超时（秒）<input type="number" value="30"></label></div><div class="debug-callout">节点执行顺序和参数会在开始调试时锁定，退出调试模式前必须完成安全复位。</div></section></div>
        </section>
      </div>
    </section></div>

    <div v-if="pendingRecovery" class="modal-overlay open" @click.self="closeRecovery"><section class="modal-card recovery-modal" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle"><div class="recovery-modal-head"><span>异常快捷处理</span><h2 id="recoveryTitle">确认{{ pendingRecovery.name }}</h2><p>适用情况：{{ pendingRecovery.issue }}</p></div><dl class="recovery-summary"><div><dt>目标 AGV</dt><dd>{{ selectedAgv }}</dd></div><div><dt>硬件模组</dt><dd>{{ pendingRecovery.module }}</dd></div><div><dt>执行动作</dt><dd>{{ pendingRecovery.name }}</dd></div></dl><div class="recovery-warning">执行前请确认设备周边无人、无障碍物，急停和外部安全条件未解除时系统不会强制绕过。</div><div class="modal-actions"><button class="modal-close" type="button" @click="closeRecovery">取消</button><button class="debug-button primary" type="button" @click="confirmRecovery">确认执行</button></div></section></div>
    <div :class="['toast', { show: toastMessage }]" role="status" aria-live="polite">{{ toastMessage }}</div>
  </div>
</template>

<style scoped>
.debug-page { display:grid; gap:16px; }
.debug-card { overflow:hidden; border-radius:var(--agv-radius-panel); background:var(--agv-panel); }
.debug-card-body { padding:20px; }

.debug-tabs { display:flex; gap:26px; min-height:52px; padding:0 20px; border-bottom:1px solid var(--agv-line-soft); }
.debug-tab { position:relative; padding:0 2px; border:0; color:var(--agv-text-muted); background:transparent; font-size:14px; font-weight:600; cursor:pointer; }
.debug-tab::after { position:absolute; right:0; bottom:0; left:0; height:3px; border-radius:3px 3px 0 0; background:transparent; content:""; }
.debug-tab:hover { color:var(--agv-blue); }
.debug-tab.active { color:var(--agv-blue); }
.debug-tab.active::after { background:var(--agv-blue); }

.debug-callout { padding:12px 14px; border-left:3px solid var(--agv-blue); border-radius:0 8px 8px 0; color:var(--agv-text-secondary); background:var(--agv-blue-soft); font-size:12px; line-height:1.65; }
.debug-modebar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:14px; padding:14px 16px; border:1px solid var(--agv-line); border-radius:10px; background:#fff; }
.debug-modebar strong,.debug-modebar small { display:block; }
.debug-modebar strong { font-size:14px; }
.debug-modebar small { margin-top:5px; color:var(--agv-text-muted); font-size:12px; }
.debug-mode-actions,.panel-actions,.inline-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }

.status-chip { display:inline-flex; align-items:center; gap:7px; min-height:26px; padding:4px 10px; border:1px solid currentColor; border-radius:999px; font-size:11px; font-weight:650; white-space:nowrap; }
.status-chip::before { width:6px; height:6px; border-radius:50%; background:currentColor; content:""; }
.status-chip.success { color:var(--agv-green); border-color:#caead9; background:#f3fbf7; }
.status-chip.warning { color:#c47d00; border-color:#f1dab0; background:#fff9ec; }
.status-chip.info { color:var(--agv-blue); border-color:#c9e1f4; background:#f1f8fd; }

.debug-button { min-height:36px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 14px; border:1px solid var(--agv-line); border-radius:8px; color:var(--agv-ink); background:#fff; font-size:12px; font-weight:650; cursor:pointer; }
.debug-button:hover:not(:disabled) { border-color:var(--agv-blue); color:var(--agv-blue); background:#f7fbff; }
.debug-button.primary { border-color:var(--agv-blue); color:#fff; background:var(--agv-blue); }
.debug-button.primary:hover:not(:disabled) { color:#fff; background:var(--agv-blue-hover); }
.debug-button.danger { border-color:#e16058; color:#fff; background:#e04b43; }
.debug-button.danger:hover:not(:disabled) { color:#fff; background:#ca3f38; }
.debug-button:disabled,.debug-control:disabled { cursor:not-allowed; opacity:.42; }

.module-tabs { display:grid; grid-template-columns:repeat(4,minmax(130px,1fr)); gap:6px; margin-top:14px; padding:5px; border:1px solid var(--agv-line); border-radius:10px; background:#f7f9fa; }
.module-tab { min-height:50px; padding:7px 12px; border:1px solid transparent; border-radius:7px; color:var(--agv-text-muted); background:transparent; cursor:pointer; }
.module-tab strong,.module-tab small { display:block; }
.module-tab strong { font-size:13px; }
.module-tab small { margin-top:4px; font-size:10px; }
.module-tab:hover { color:var(--agv-blue); background:#fff; }
.module-tab.active { border-color:var(--agv-blue); color:#fff; background:var(--agv-blue); box-shadow:0 4px 10px rgba(22,119,200,.18); }

.module-panel,.flow-panel { margin-top:14px; padding:18px; border:1px solid var(--agv-line-soft); border-radius:10px; background:#fff; }
.panel-title { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:14px; }
.panel-title h2,.panel-title h3 { margin:0; color:var(--agv-ink); font-size:16px; }
.panel-title h3 { font-size:14px; }
.panel-title p { margin:6px 0 0; color:var(--agv-text-muted); font-size:12px; line-height:1.5; }

.module-agv-selector,.flow-agv-selector { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:16px; padding:13px 14px; border:1px solid #cfe2f2; border-radius:9px; background:#f4f9fd; }
.module-agv-selector label,.flow-agv-selector label { min-width:300px; display:flex; align-items:center; gap:12px; color:var(--agv-text-secondary); font-size:12px; font-weight:650; }
.module-agv-selector select,.flow-agv-selector select { min-width:172px; min-height:38px; padding:0 34px 0 11px; border:1px solid var(--agv-line); border-radius:7px; outline:0; color:var(--agv-ink); background:#fff; font-size:12px; }
.module-agv-selector select:focus,.flow-agv-selector select:focus { border-color:var(--agv-blue); box-shadow:0 0 0 2px rgba(22,119,200,.12); }
.module-agv-selector>div,.flow-agv-selector>div { text-align:right; }
.module-agv-selector>div strong,.module-agv-selector>div small,.flow-agv-selector>div strong,.flow-agv-selector>div small { display:block; }
.module-agv-selector>div strong,.flow-agv-selector>div strong { color:var(--agv-blue); font-size:13px; }
.module-agv-selector>div small,.flow-agv-selector>div small { margin-top:4px; color:var(--agv-text-muted); font-size:11px; }
.module-agv-selector select:disabled,.flow-agv-selector select:disabled { cursor:not-allowed; opacity:.62; }

.debug-map-layout { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(260px,.7fr); gap:14px; }
.debug-map { position:relative; min-height:0; overflow:hidden; aspect-ratio:1672/941; border:1px solid var(--agv-line); border-radius:10px; background:#fff; }
.debug-map > img { width:100%; height:100%; display:block; object-fit:contain; opacity:.94; }
.debug-map::after { position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg,rgba(15,39,70,.02),rgba(15,39,70,.12)); content:""; }
.debug-robot { position:absolute; z-index:3; left:47%; top:62%; width:38px; height:38px; display:grid; place-items:center; border:4px solid #fff; border-radius:50%; color:#fff; background:var(--agv-blue); box-shadow:0 5px 16px rgba(15,67,121,.34); transform:translate(-50%,-50%); transition:left .2s ease,top .2s ease; }
.debug-robot::before { content:"▲"; font-size:14px; }
.debug-robot::after { position:absolute; top:calc(100% + 7px); left:50%; padding:4px 7px; border-radius:5px; color:#fff; background:rgba(15,39,70,.88); content:attr(data-label); font-size:10px; white-space:nowrap; transform:translateX(-50%); }
.map-controls { position:absolute; z-index:5; top:14px; right:14px; width:184px; padding:10px; border:1px solid rgba(203,216,230,.9); border-radius:9px; background:rgba(255,255,255,.95); box-shadow:0 8px 22px rgba(15,39,70,.16); }
.map-controls strong,.map-controls small { display:block; }
.map-controls strong { font-size:12px; }
.map-controls small { margin-top:3px; color:var(--agv-text-muted); font-size:10px; }
.dpad { width:142px; display:grid; grid-template-columns:repeat(3,44px); grid-template-rows:repeat(3,37px); gap:5px; margin:9px auto 0; }
.dpad button { display:grid; place-items:center; padding:0; border:1px solid var(--agv-line); border-radius:7px; background:#fff; font-size:16px; cursor:pointer; }
.dpad button:hover:not(:disabled) { border-color:var(--agv-blue); color:var(--agv-blue); background:var(--agv-blue-soft); }
.dpad .forward { grid-column:2; grid-row:1; }
.dpad .left { grid-column:1; grid-row:2; }
.dpad .stop { grid-column:2; grid-row:2; color:var(--agv-red); }
.dpad .right { grid-column:3; grid-row:2; }
.dpad .back { grid-column:2; grid-row:3; }
.map-position { position:absolute; z-index:4; bottom:14px; left:14px; display:flex; flex-wrap:wrap; gap:6px; padding:8px; border:1px solid rgba(203,216,230,.9); border-radius:8px; background:rgba(255,255,255,.93); box-shadow:0 6px 18px rgba(15,39,70,.14); }
.coordinate-list { display:grid; align-content:start; gap:10px; }
.coordinate-card,.device-info-card { padding:11px 12px; border:1px solid var(--agv-line); border-radius:9px; background:#f8fafb; }
.coordinate-card { min-height:58px; display:grid; grid-template-columns:70px 1fr; align-items:center; }
.coordinate-card span,.device-info-card span,.device-info-card small { color:var(--agv-text-muted); font-size:11px; }
.coordinate-card strong { font-size:17px; font-variant-numeric:tabular-nums; }
.coordinate-list .debug-button { width:100%; }

.recovery-panel { margin:-4px 0 16px; padding:14px; border:1px solid var(--agv-line-soft); border-radius:9px; background:#fbfcfd; }
.recovery-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:12px; }
.recovery-head h3 { margin:0; color:var(--agv-ink); font-size:14px; }
.recovery-head p { margin:5px 0 0; color:var(--agv-text-muted); font-size:11px; }
.recovery-head>span { min-height:24px; display:inline-flex; align-items:center; padding:0 9px; border-radius:6px; color:var(--agv-blue); background:var(--agv-blue-soft); font-size:11px; font-weight:650; }
.recovery-actions { display:grid; grid-template-columns:repeat(4,minmax(130px,1fr)); gap:9px; }
.recovery-action { min-height:76px; display:grid; align-content:center; justify-items:start; gap:5px; padding:11px 12px; border:1px solid var(--agv-line); border-radius:8px; color:var(--agv-ink); background:#fff; text-align:left; cursor:pointer; }
.recovery-action strong { font-size:12px; }
.recovery-action small { color:var(--agv-text-muted); font-size:10px; line-height:1.45; }
.recovery-action:hover:not(:disabled) { border-color:var(--agv-blue); color:var(--agv-blue); background:var(--agv-blue-soft); }
.recovery-action.danger { border-color:#f1cfcc; }
.recovery-action.danger strong { color:var(--agv-red); }

.device-info-grid { display:grid; grid-template-columns:1.3fr 1fr .8fr; gap:10px; }
.device-info-card strong { display:block; margin:6px 0 3px; font-size:13px; }
.success-text { color:var(--agv-green); }
.range-setting { display:grid; grid-template-columns:110px minmax(180px,1fr) 60px; align-items:center; gap:12px; margin-top:14px; padding:12px; border:1px solid var(--agv-line); border-radius:9px; background:#f8fafb; }
.range-setting span strong,.range-setting span small { display:block; }
.range-setting span small { margin-top:4px; color:var(--agv-text-muted); font-size:10px; }
.range-setting input { width:100%; accent-color:var(--agv-blue); }
.range-setting output { min-height:32px; display:grid; place-items:center; border-radius:6px; color:var(--agv-blue); background:var(--agv-blue-soft); font-size:12px; font-weight:700; }
.sub-tabs { display:grid; grid-template-columns:repeat(2,1fr); margin-top:16px; border-bottom:1px solid var(--agv-line); }
.sub-tab { min-height:40px; border:0; border-bottom:3px solid transparent; color:var(--agv-text-muted); background:transparent; cursor:pointer; }
.sub-tab.active { border-bottom-color:var(--agv-blue); color:var(--agv-blue); font-weight:650; }
.jog-settings { display:flex; align-items:flex-end; flex-wrap:wrap; gap:10px; margin:13px 0; }
.jog-settings label { display:grid; gap:5px; color:var(--agv-text-muted); font-size:11px; }
.jog-settings select { min-height:35px; padding:0 34px 0 10px; border:1px solid var(--agv-line); border-radius:7px; background:#fff; }
.jog-list { display:grid; gap:7px; }
.jog-row { display:grid; grid-template-columns:92px minmax(126px,1fr) 92px; gap:8px; }
.jog-row button,.jog-value { min-height:40px; border:1px solid var(--agv-line); border-radius:8px; }
.jog-row button { color:var(--agv-blue); background:#fff; font-weight:700; cursor:pointer; }
.jog-row button:hover:not(:disabled) { border-color:var(--agv-blue); background:var(--agv-blue-soft); }
.jog-value { display:grid; place-items:center; background:#f8fafb; font-size:13px; font-variant-numeric:tabular-nums; }
.jog-value small { margin-left:4px; color:var(--agv-text-muted); font-size:10px; }

.quick-actions { display:grid; grid-template-columns:repeat(4,minmax(120px,1fr)); gap:10px; }
.quick-action { min-height:88px; display:grid; justify-items:start; padding:14px; border:1px solid var(--agv-line); border-radius:9px; background:#fff; text-align:left; cursor:pointer; }
.quick-action strong { font-size:13px; }
.quick-action small { color:var(--agv-text-muted); font-size:11px; line-height:1.45; }
.quick-action:hover,.quick-action.active { border-color:var(--agv-blue); color:var(--agv-blue); background:var(--agv-blue-soft); }
.parameter-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:14px; }
.parameter-grid label { display:grid; gap:7px; color:var(--agv-text-muted); font-size:11px; }
.parameter-grid input,.parameter-grid select,.flow-toolbar select { min-height:38px; padding:0 10px; border:1px solid var(--agv-line); border-radius:7px; outline:0; background:#fff; color:var(--agv-ink); }
.parameter-grid input:focus,.parameter-grid select:focus,.flow-toolbar select:focus { border-color:var(--agv-blue); box-shadow:0 0 0 2px rgba(22,119,200,.12); }

.gripper-controls { display:grid; gap:12px; }
.gripper-control { display:grid; grid-template-columns:120px minmax(180px,1fr) 72px; align-items:center; gap:12px; padding:12px; border:1px solid var(--agv-line); border-radius:9px; background:#f8fafb; }
.gripper-control strong,.gripper-control small { display:block; }
.gripper-control small { margin-top:4px; color:var(--agv-text-muted); font-size:10px; }
.gripper-control input { width:100%; accent-color:var(--agv-blue); }
.gripper-control output { min-height:34px; display:grid; place-items:center; border-radius:6px; color:var(--agv-blue); background:var(--agv-blue-soft); font-weight:700; }

.flow-agv-selector { margin:14px 0 0; }
.flow-toolbar { display:grid; grid-template-columns:minmax(260px,1fr) minmax(220px,.65fr) auto; align-items:end; gap:12px; margin-top:10px; padding:16px; border:1px solid var(--agv-line); border-radius:9px; background:#f8fafb; }
.flow-toolbar label { display:grid; gap:7px; color:var(--agv-text-muted); font-size:11px; }
.flow-layout { display:grid; grid-template-columns:minmax(330px,.8fr) minmax(420px,1.2fr); gap:14px; margin-top:14px; }
.flow-list,.flow-editor { padding:16px; border:1px solid var(--agv-line); border-radius:10px; background:#fff; }
.flow-list h2,.flow-editor h2 { margin:0 0 14px; font-size:15px; }
.flow-nodes { display:grid; gap:8px; }
.flow-node { display:grid; grid-template-columns:30px 1fr auto; align-items:center; gap:10px; min-height:64px; padding:10px; border:1px solid var(--agv-line); border-radius:9px; background:#fff; cursor:pointer; }
.flow-node:hover,.flow-node.active { border-color:var(--agv-blue); background:var(--agv-blue-soft); }
.flow-node .index { width:28px; height:28px; display:grid; place-items:center; border-radius:50%; color:#fff; background:var(--agv-blue); font-size:11px; }
.flow-node strong,.flow-node small { display:block; }
.flow-node small { margin-top:4px; color:var(--agv-text-muted); font-size:10px; }
.flow-editor .debug-callout { margin-top:14px; }

.toast { position:fixed; left:50%; bottom:24px; z-index:90; padding:11px 16px; border-radius:8px; color:#fff; background:rgba(12,29,47,.92); font-size:13px; opacity:0; pointer-events:none; transform:translate(-50%,20px); transition:.22s ease; }
.toast.show { opacity:1; transform:translate(-50%,0); }

.modal-overlay,.alert-overlay { position:fixed; inset:0; z-index:70; background:rgba(0,0,0,.45); opacity:0; transition:opacity .2s; }
.modal-overlay.open,.alert-overlay.open { opacity:1; }
.modal-overlay { display:grid; place-items:center; padding:24px; }
.modal-card { width:min(560px,calc(100vw - 32px)); padding:24px; border-radius:8px; background:#fff; box-shadow:0 9px 28px 8px rgba(0,0,0,.08); }
.modal-card h2 { margin:0 0 18px; font-size:16px; }
.status-list { display:grid; gap:10px; }
.status-item { padding:13px; border:1px solid var(--agv-line-soft); border-radius:8px; }
.status-item strong { display:block; margin-bottom:5px; }
.status-item p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.modal-actions { display:flex; justify-content:flex-end; margin-top:20px; padding-top:14px; border-top:1px solid var(--agv-line-soft); }
.modal-actions { gap:9px; }
.modal-close { min-height:32px; padding:0 15px; border:1px solid var(--agv-line); border-radius:6px; background:#fff; cursor:pointer; }
.recovery-modal { width:min(620px,calc(100vw - 32px)); }
.recovery-modal-head>span { color:var(--agv-blue); font-size:11px; font-weight:700; }
.recovery-modal-head h2 { margin:7px 0 6px; }
.recovery-modal-head p { margin:0; color:var(--agv-text-muted); font-size:12px; line-height:1.6; }
.recovery-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; margin:18px 0 0; }
.recovery-summary>div { padding:11px 12px; border:1px solid var(--agv-line-soft); border-radius:8px; background:#f8fafb; }
.recovery-summary dt { color:var(--agv-text-muted); font-size:10px; }
.recovery-summary dd { margin:6px 0 0; color:var(--agv-ink); font-size:12px; font-weight:700; }
.recovery-warning { margin-top:12px; padding:11px 12px; border-left:3px solid #db9a22; border-radius:0 7px 7px 0; color:#7b5a1f; background:#fff8e8; font-size:11px; line-height:1.65; }
.alert-overlay { z-index:75; }
.alert-drawer { position:absolute; inset:0 0 0 auto; width:min(440px,100vw); display:grid; grid-template-rows:auto 1fr auto; background:#f5f7f9; transform:translateX(100%); transition:.24s; }
.alert-overlay.open .alert-drawer { transform:none; }
.alert-header,.alert-footer { padding:18px; background:#fff; }
.alert-header { border-bottom:1px solid var(--agv-line-soft); }
.alert-header h2 { margin:0 0 5px; font-size:18px; }
.alert-header p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.alert-feed { padding:16px; }
.alert-card { padding:14px; border-radius:10px; background:#fff; }
.alert-card + .alert-card { margin-top:10px; }
.alert-card strong { font-size:13px; }
.alert-card p { margin:7px 0 0; color:var(--agv-text-muted); font-size:11px; }
.alert-footer { border-top:1px solid var(--agv-line-soft); text-align:center; }
.alert-footer .debug-button { width:230px; }

@media (max-width:1000px) {
  .debug-map-layout,.flow-layout { grid-template-columns:1fr; }
  .device-info-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .quick-actions,.recovery-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }
}

@media (max-width:760px) {
  .debug-card-body,.module-panel,.flow-panel { padding:14px; }
  .debug-tabs { padding:0 14px; }
  .debug-modebar,.panel-title { align-items:flex-start; flex-direction:column; }
  .module-agv-selector,.flow-agv-selector { align-items:stretch; flex-direction:column; }
  .module-agv-selector label,.flow-agv-selector label { min-width:0; align-items:stretch; flex-direction:column; }
  .module-agv-selector select,.flow-agv-selector select { width:100%; }
  .module-agv-selector>div,.flow-agv-selector>div { text-align:left; }
  .module-tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .debug-map { min-height:0; }
  .map-controls { width:170px; }
  .device-info-grid,.parameter-grid { grid-template-columns:1fr; }
  .range-setting,.gripper-control { grid-template-columns:1fr; }
  .jog-row { grid-template-columns:72px minmax(90px,1fr) 72px; }
  .flow-toolbar { grid-template-columns:1fr; }
  .flow-toolbar .debug-button { width:100%; }
  .recovery-summary { grid-template-columns:1fr; }
}
</style>
<style scoped>
.device-debug-view{min-height:100%;color:#122235;background:#f3f6f8;--agv-blue:#1677c8;--agv-blue-hover:#0f69b5;--agv-blue-soft:#eaf4fd;--agv-green:#1f9d63;--agv-red:#d84343;--agv-ink:#122235;--agv-text-secondary:#596675;--agv-text-muted:#768392;--agv-line:#dfe5ea;--agv-line-soft:#e9edf1;--agv-panel:#fff;--agv-radius-panel:12px}.device-debug-view .page-head{min-height:92px;display:flex;align-items:center;padding:16px 20px;background:#fff}.device-debug-view .page-head h1{margin:0 0 8px;color:#122235;font-size:20px;line-height:26px}.device-debug-view .page-head p{margin:0;color:#596675;font-size:13px;line-height:20.15px}.device-debug-view .page-canvas{padding:20px}.device-debug-view button,.device-debug-view input,.device-debug-view select{font-family:inherit}.device-debug-view .status-chip::before{width:6px;height:6px}.device-debug-view .module-agv-selector select,.device-debug-view .flow-agv-selector select{width:92px;min-width:92px;min-height:40px}@media(max-width:760px){.device-debug-view .page-head{min-height:75px;padding:14px}.device-debug-view .page-head h1{margin-bottom:6px;font-size:18px;line-height:1.25}.device-debug-view .page-head p{font-size:12px;line-height:normal}.device-debug-view .page-canvas{padding:12px}.device-debug-view .module-agv-selector select,.device-debug-view .flow-agv-selector select{width:100%}}
</style>
<style scoped>
.device-debug-view .flow-node{position:static;width:auto;height:auto;grid-template-rows:none;box-shadow:none}
.device-debug-view .flow-node>span{overflow:visible;align-self:auto;font-size:inherit;font-weight:inherit;white-space:normal}
.device-debug-view .flow-node>.status-chip{white-space:nowrap}
.device-debug-view .flow-node .status-chip::before{flex:0 0 6px;width:6px;height:6px}
</style>
