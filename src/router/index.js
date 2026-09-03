import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import OrdersView from '../views/OrdersView.vue'
import OrderDetailView from '../views/OrderDetailView.vue'
import StorageResourceView from '../views/StorageResourceView.vue'
import ConflictsView from '../views/ConflictsView.vue'
import DeviceDebugView from '../views/DeviceDebugView.vue'
import MapConfigView from '../views/MapConfigView.vue'
import ChargingView from '../views/ChargingView.vue'
import ChargingPileView from '../views/ChargingPileView.vue'
import TemplatesView from '../views/TemplatesView.vue'
import WorkflowEditorView from '../views/WorkflowEditorView.vue'
import ExceptionView from '../views/ExceptionView.vue'
import LogsView from '../views/LogsView.vue'
import CapacityView from '../views/CapacityView.vue'
import RolesView from '../views/RolesView.vue'
import LabConfigResourceView from '../views/LabConfigResourceView.vue'
import StationsView from '../views/StationsView.vue'
import RobotsView from '../views/RobotsView.vue'
import PeripheralResourcesView from '../views/PeripheralResourcesView.vue'
import ProcessesView from '../views/ProcessesView.vue'
import UsersView from '../views/UsersView.vue'
import ExceptionOperationsView from '../views/ExceptionOperationsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录', public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: '/login' },
      { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { title: '运行总览' } },
      { path: 'orders', name: 'orders', component: OrdersView, meta: { title: '订单管理' } },
      { path: 'orders/detail', name: 'order-detail', component: OrderDetailView, meta: { title: '订单任务详情' } },
      { path: 'dispatch/storage', name: 'storage', component: StorageResourceView, props: { resourceKey: 'locations' }, meta: { title: '库位与载具' } },
      { path: 'dispatch/carriers', name: 'carriers', component: StorageResourceView, props: { resourceKey: 'carriers' }, meta: { title: '载具记录' } },
      { path: 'dispatch/storage-types', name: 'storage-types', component: StorageResourceView, props: { resourceKey: 'storageTypes' }, meta: { title: '库位类型' } },
      { path: 'dispatch/carrier-types', name: 'carrier-types', component: StorageResourceView, props: { resourceKey: 'carrierTypes' }, meta: { title: '载具类型' } },
      { path: 'dispatch/conflicts', name: 'conflicts', component: ConflictsView, meta: { title: '冲突节点排程' } },
      { path: 'dispatch/device-debug', name: 'device-debug', component: DeviceDebugView, meta: { title: '设备调试' } },
      { path: 'config/robots', name: 'robots', component: RobotsView, meta: { title: '机器人与设备' } },
      { path: 'config/map', name: 'map', component: MapConfigView, meta: { title: '地图信息' } },
      { path: 'config/stations', name: 'stations', component: StationsView, meta: { title: '机台与点位' } },
      { path: 'config/peripherals', name: 'peripherals', component: PeripheralResourcesView, meta: { title: '外设设备' } },
      { path: 'config/charging', redirect: '/config/charging-piles' },
      { path: 'config/charging-piles', name: 'charging-piles', component: ChargingPileView, meta: { title: '充电桩配置' } },
      { path: 'config/batteries', name: 'batteries', component: ChargingView, props: { mode: 'batteries' }, meta: { title: '电池配置' } },
      { path: 'config/passage-rules', name: 'passage-rules', component: LabConfigResourceView, props: { mode: 'passageRules' }, meta: { title: '通行规则' } },
      { path: 'workflows/processes', name: 'processes', component: ProcessesView, meta: { title: '流程与动作' } },
      { path: 'workflows/templates', name: 'templates', component: TemplatesView, meta: { title: '流程模板' } },
      { path: 'workflows/editor', name: 'template-editor', component: WorkflowEditorView, meta: { title: '流程模板配置' } },
      { path: 'operations/exception-recovery', name: 'exception-recovery', component: ExceptionOperationsView, props: { mode: 'workorders' }, meta: { title: '异常与恢复' } },
      { path: 'operations/emergency-stop', name: 'emergency-stop', component: ExceptionOperationsView, props: { mode: 'procedures' }, meta: { title: '急停处置规程' } },
      { path: 'operations/anomalies', name: 'anomalies', component: ExceptionView, props: { mode: 'anomalies' }, meta: { title: '当前异常' } },
      { path: 'operations/alarms', name: 'alarms', component: ExceptionView, props: { mode: 'alarms' }, meta: { title: '告警记录' } },
      { path: 'operations/recovery', name: 'recovery', component: ExceptionView, props: { mode: 'recoveryTasks' }, meta: { title: '任务恢复与状态核对' } },
      { path: 'operations/logs', name: 'logs', component: LogsView, meta: { title: '系统日志' } },
      { path: 'analytics/capacity', name: 'capacity', component: CapacityView, meta: { title: 'AGV 产能' } },
      { path: 'system/users', name: 'users', component: UsersView, meta: { title: '用户管理' } },
      { path: 'system/roles', name: 'roles', component: RolesView, meta: { title: '角色权限管理' } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: '页面不存在', public: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

router.beforeEach((to) => {
  if (to.meta.public || sessionStorage.getItem('agv-session')) return true
  return { path: '/login', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `复合机器人调度系统 · ${to.meta.title}` : '复合机器人调度系统'
})

export default router
