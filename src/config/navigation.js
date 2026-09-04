const menuIcon = name => `/assets/menu/${name}.svg`

export const navigation = [
  {
    items: [{ path: '/dashboard', label: '运行总览', icon: menuIcon('overview') }],
  },
  {
    label: '运行调度',
    items: [
      { path: '/orders', label: '订单管理', icon: menuIcon('orders') },
      { path: '/dispatch/storage', label: '库位与载具', icon: menuIcon('storage') },
      { path: '/dispatch/conflicts', label: '冲突节点排程', icon: menuIcon('conflicts') },
      { path: '/dispatch/device-debug', label: '设备调试', icon: menuIcon('debug') },
    ],
  },
  {
    label: '配置中心',
    items: [
      { path: '/config/robots', label: '机器人与设备', icon: menuIcon('robots') },
      { path: '/config/map', label: '地图信息', icon: menuIcon('map') },
      { path: '/config/stations', label: '机台与点位', icon: menuIcon('location') },
      { path: '/config/peripherals', label: '外设设备', icon: menuIcon('peripheral') },
      { path: '/config/charging-piles', label: '充电桩与电池配置', icon: menuIcon('charging') },
      { path: '/workflows/processes', label: '流程与动作', icon: menuIcon('process') },
    ],
  },
  {
    label: '运维与数据',
    items: [
      { path: '/operations/exception-recovery', label: '异常与恢复', icon: menuIcon('exception') },
      { path: '/operations/emergency-stop', label: '急停处置规程', icon: menuIcon('exception') },
      { path: '/operations/logs', label: '系统日志', icon: menuIcon('logs') },
      { path: '/analytics/capacity', label: 'AGV 产能', icon: menuIcon('capacity') },
    ],
  },
  {
    label: '系统管理',
    items: [
      { path: '/system/users', label: '用户管理', icon: menuIcon('settings') },
      { path: '/system/roles', label: '角色权限管理', icon: menuIcon('settings') },
    ],
  },
]

export const activeMenuForRoute = {
  '/config/charging': '/config/charging-piles',
  '/config/batteries': '/config/charging-piles',
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
