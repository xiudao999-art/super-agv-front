import { createRouter, createWebHistory } from 'vue-router'

const placeholderRoutes = [
  { path: 'dashboard', title: '运行总览', subtitle: '查看机器人、订单、资源与异常的实时状态' },
  { path: 'scheduling/orders', title: '订单管理', subtitle: '查询上游订单与任务执行进度' },
  { path: 'scheduling/locations', title: '库位与载具', subtitle: '维护库位、载具与占用一致性' },
  { path: 'configuration/robots', title: '机器人与设备', subtitle: '配置机器人与硬件模组' },
  { path: 'configuration/paths', title: '路径管理', subtitle: '定义、验证并发布 AGV 完整行进路径' },
  { path: 'configuration/flows', title: '流程与动作', subtitle: '维护业务流程与执行动作' },
  { path: 'operations/exceptions', title: '异常与恢复', subtitle: '处理当前异常并执行安全恢复' },
  { path: 'operations/logs', title: '系统日志', subtitle: '查询系统、设备与接口日志' },
  { path: 'operations/capacity', title: '实验室产能', subtitle: '分析任务量、等待时间与异常影响' },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', redirect: '/configuration/labs' },
        {
          path: 'configuration/labs',
          name: 'lab-configuration',
          component: () => import('@/views/lab-configuration/LabConfigurationView.vue'),
          meta: {
            title: '实验室配置',
            subtitle: '按“一张地图对应一个实验室空间”配置地图、通行规则、机台、点位和外围资源',
          },
        },
        ...placeholderRoutes.map((route) => ({
          path: route.path,
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: route.title, subtitle: route.subtitle },
        })),
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/configuration/labs' },
  ],
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '复合机器人调度系统'} · 复合机器人调度系统`
})

export default router
