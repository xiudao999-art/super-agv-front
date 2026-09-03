import {
  AlarmClock,
  Lightning,
  Box,
  Calendar,
  Connection,
  DataAnalysis,
  Document,
  Grid,
  Key,
  Location,
  MapLocation,
  Operation,
  Warning,
  Setting,
  Tools,
  User,
  Van,
} from '@element-plus/icons-vue'

export const navigation = [
  {
    items: [{ path: '/dashboard', label: '运行总览', icon: Grid }],
  },
  {
    label: '运行调度',
    items: [
      { path: '/orders', label: '订单管理', icon: Document },
      { path: '/dispatch/storage', label: '库位与载具', icon: Box },
      { path: '/dispatch/conflicts', label: '冲突节点排程', icon: Connection },
      { path: '/dispatch/device-debug', label: '设备调试', icon: Tools },
    ],
  },
  {
    label: '配置中心',
    items: [
      { path: '/config/robots', label: '机器人与设备', icon: Van },
      { path: '/config/map', label: '地图信息', icon: MapLocation },
      { path: '/config/stations', label: '机台与点位', icon: Location },
      { path: '/config/peripherals', label: '外设设备', icon: Operation },
      { path: '/config/charging', label: '充电桩与电池配置', icon: Lightning },
      { path: '/workflows/processes', label: '流程与动作', icon: Setting },
    ],
  },
  {
    label: '运维与数据',
    items: [
      { path: '/operations/exception-recovery', label: '异常与恢复', icon: AlarmClock },
      { path: '/operations/emergency-stop', label: '急停处置规程', icon: Warning },
      { path: '/operations/logs', label: '系统日志', icon: Calendar },
      { path: '/analytics/capacity', label: 'AGV 产能', icon: DataAnalysis },
    ],
  },
  {
    label: '系统管理',
    items: [
      { path: '/system/users', label: '用户管理', icon: User },
      { path: '/system/roles', label: '角色权限管理', icon: Key },
    ],
  },
]

export const activeMenuForRoute = {
  '/orders/detail': '/orders',
  '/dispatch/carriers': '/dispatch/storage',
  '/dispatch/storage-types': '/dispatch/storage',
  '/dispatch/carrier-types': '/dispatch/storage',
  '/config/passage-rules': '/config/map',
  '/workflows/templates': '/workflows/processes',
  '/workflows/editor': '/workflows/processes',
  '/operations/anomalies': '/operations/exception-recovery',
  '/operations/alarms': '/operations/exception-recovery',
  '/operations/recovery': '/operations/exception-recovery',
}
