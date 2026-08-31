(function installAgvMockApi() {
  'use strict'

  let enabled = true
  try {
    enabled = window.parent === window || window.parent.__AGV_USE_MOCK_API__ !== false
  } catch {
    enabled = true
  }
  if (!enabled || window.__AGV_MOCK_API_INSTALLED__) return
  window.__AGV_MOCK_API_INSTALLED__ = true

  const STORAGE_KEY = 'agv-vue-mock-api-v1'
  const now = () => new Date().toISOString().slice(0, 19)

  const seed = {
    orders: [
      { id: 1, upstreamOrderNo: 'ORD-20260827-001', systemOrderNo: 'SYS-20260827-1001', source: 'MES', status: 'RUNNING', priority: 1, taskCount: 3, completedTaskCount: 1, issuedAt: '2026-08-27T09:12:16' },
      { id: 2, upstreamOrderNo: 'ORD-20260827-002', systemOrderNo: 'SYS-20260827-1002', source: 'LIMS', status: 'QUEUED', priority: 2, taskCount: 2, completedTaskCount: 0, issuedAt: '2026-08-27T09:26:42' },
      { id: 3, upstreamOrderNo: 'ORD-20260827-003', systemOrderNo: 'SYS-20260827-1003', source: 'MES', status: 'SUCCEEDED', priority: 2, taskCount: 2, completedTaskCount: 2, issuedAt: '2026-08-27T08:41:09' },
      { id: 4, upstreamOrderNo: 'ORD-20260827-004', systemOrderNo: 'SYS-20260827-1004', source: 'MANUAL', status: 'RUNNING', priority: 1, taskCount: 1, completedTaskCount: 0, issuedAt: '2026-08-27T10:03:31' },
      { id: 5, upstreamOrderNo: 'ORD-20260827-005', systemOrderNo: 'SYS-20260827-1005', source: 'LIMS', status: 'FAILED', priority: 1, taskCount: 3, completedTaskCount: 1, issuedAt: '2026-08-27T07:58:22' },
      { id: 6, upstreamOrderNo: 'ORD-20260827-006', systemOrderNo: 'SYS-20260827-1006', source: 'MES', status: 'SUCCEEDED', priority: 3, taskCount: 2, completedTaskCount: 2, issuedAt: '2026-08-27T07:36:14' },
      { id: 7, upstreamOrderNo: 'ORD-20260827-007', systemOrderNo: 'SYS-20260827-1007', source: 'MES', status: 'QUEUED', priority: 2, taskCount: 1, completedTaskCount: 0, issuedAt: '2026-08-27T10:15:06' },
      { id: 8, upstreamOrderNo: 'ORD-20260827-008', systemOrderNo: 'SYS-20260827-1008', source: 'LIMS', status: 'CANCELLED', priority: 3, taskCount: 2, completedTaskCount: 0, issuedAt: '2026-08-27T06:52:48' },
      { id: 9, upstreamOrderNo: 'ORD-20260827-009', systemOrderNo: 'SYS-20260827-1009', source: 'MANUAL', status: 'SUCCEEDED', priority: 2, taskCount: 1, completedTaskCount: 1, issuedAt: '2026-08-27T06:24:33' },
      { id: 10, upstreamOrderNo: 'ORD-20260827-010', systemOrderNo: 'SYS-20260827-1010', source: 'MES', status: 'RUNNING', priority: 2, taskCount: 2, completedTaskCount: 1, issuedAt: '2026-08-27T10:22:51' },
      { id: 11, upstreamOrderNo: 'ORD-20260827-011', systemOrderNo: 'SYS-20260827-1011', source: 'LIMS', status: 'QUEUED', priority: 3, taskCount: 1, completedTaskCount: 0, issuedAt: '2026-08-27T10:31:27' },
      { id: 12, upstreamOrderNo: 'ORD-20260827-012', systemOrderNo: 'SYS-20260827-1012', source: 'MES', status: 'SUCCEEDED', priority: 2, taskCount: 2, completedTaskCount: 2, issuedAt: '2026-08-27T05:48:19' },
    ],
    workflows: [
      { id: 1, templateNumber: 'TPL-TRANSFER-001', templateName: '标准搬运流程', applicableObject: '复合机器人', actionSequenceText: '开始 → 移动 → 单次取料 → 移动 → 单次放料 → 结束', status: 'ENABLED', statusDescription: '已启用', version: 3, updatedAt: '2026-08-26T16:24:00', flowNumber: 'FLOW-001', flowName: '标准搬运' },
      { id: 2, templateNumber: 'TPL-LABEL-002', templateName: '智能仓储贴标流程', applicableObject: '贴标工作站', actionSequenceText: '开始 → 移动 → 复合取料 → 贴标机台 → 复合放料 → 结束', status: 'ENABLED', statusDescription: '已启用', version: 2, updatedAt: '2026-08-25T14:12:00', flowNumber: 'FLOW-002', flowName: '贴标作业' },
      { id: 3, templateNumber: 'TPL-VISION-003', templateName: '视觉检测流程', applicableObject: '检测工作站', actionSequenceText: '开始 → 移动 → 现场拍照 → 视觉检测 → 结束', status: 'DRAFT', statusDescription: '草稿', version: 1, updatedAt: '2026-08-27T09:42:00', flowNumber: 'FLOW-003', flowName: '视觉检测' },
      { id: 4, templateNumber: 'TPL-GLOVE-004', templateName: '手套箱上下料流程', applicableObject: '手套箱', actionSequenceText: '开始 → 自动门 → 移动 → 单次取料 → 单次放料 → 结束', status: 'ENABLED', statusDescription: '已启用', version: 4, updatedAt: '2026-08-24T11:05:00', flowNumber: 'FLOW-004', flowName: '手套箱上下料' },
    ],
    locationTypes: [
      { id: 1, typeCode: 'LOC-RACK', typeName: '立库货位', capacity: 1, compatibleCarrierTypes: '料箱 / 托盘', statusSource: '库位传感器', mutexRule: '同层互斥', status: 'ENABLED', remark: '' },
      { id: 2, typeCode: 'LOC-CACHE', typeName: '机器人缓存位', capacity: 1, compatibleCarrierTypes: '标准料箱', statusSource: '机器人反馈', mutexRule: '单车占用', status: 'ENABLED', remark: '' },
      { id: 3, typeCode: 'LOC-STATION', typeName: '机台操作位', capacity: 1, compatibleCarrierTypes: '全部载具', statusSource: 'PLC 信号', mutexRule: '设备联锁', status: 'ENABLED', remark: '' },
    ],
    carrierTypes: [
      { id: 1, typeCode: 'CT-BOX', typeName: '标准料箱', dimension: '600×400×320 mm', maxWeight: 30, barcodeRule: '^BOX-[0-9]{6}$', status: 'ENABLED', remark: '' },
      { id: 2, typeCode: 'CT-TRAY', typeName: '样品托盘', dimension: '480×320×80 mm', maxWeight: 12, barcodeRule: '^TRY-[0-9]{6}$', status: 'ENABLED', remark: '' },
      { id: 3, typeCode: 'CT-RACK', typeName: '试管载架', dimension: '300×220×120 mm', maxWeight: 8, barcodeRule: '^RCK-[0-9]{6}$', status: 'DRAFT', remark: '' },
    ],
    locations: [
      { id: 1, locationCode: 'A-01-01', locationName: '立库 A 一层 01', locationType: 1, typeCode: 'LOC-RACK', typeName: '立库货位', spaceName: '一期作业区', mapName: '大型实验室地图 V1', ownerName: '立库 A', coordinateType: 'MAP', mapX: 126.4, mapY: 82.6, mapYaw: 90, navPointCode: 'NAV-A0101', operationPoint: 'PICK-A0101', compatibleCarrierType: '标准料箱', statusSource: '库位传感器', occupancyStatus: 1, currentCarrierCode: 'CAR-0001', lastCheckTime: '2026-08-27 10:30:00', enabled: true, remark: '' },
      { id: 2, locationCode: 'A-02-03', locationName: '立库 A 二层 03', locationType: 1, typeCode: 'LOC-RACK', typeName: '立库货位', spaceName: '一期作业区', mapName: '大型实验室地图 V1', ownerName: '立库 A', coordinateType: 'MAP', mapX: 152.8, mapY: 104.2, mapYaw: 90, navPointCode: 'NAV-A0203', operationPoint: 'PICK-A0203', compatibleCarrierType: '标准料箱', statusSource: '库位传感器', occupancyStatus: 0, currentCarrierCode: '', lastCheckTime: '2026-08-27 10:28:00', enabled: true, remark: '' },
      { id: 3, locationCode: 'W-B01', locationName: '检测仪 B 进样位', locationType: 3, typeCode: 'LOC-STATION', typeName: '机台操作位', spaceName: '检测区', mapName: '大型实验室地图 V1', ownerName: '检测仪 B', coordinateType: 'MAP', mapX: 454, mapY: 194, mapYaw: 180, navPointCode: 'NAV-WB01', operationPoint: 'LOAD-B01', compatibleCarrierType: '样品托盘', statusSource: 'PLC 信号', occupancyStatus: 1, currentCarrierCode: 'CAR-0003', lastCheckTime: '2026-08-27 10:31:00', enabled: true, remark: '' },
      { id: 4, locationCode: 'C-01', locationName: '机器人缓存位 C01', locationType: 2, typeCode: 'LOC-CACHE', typeName: '机器人缓存位', spaceName: '缓存区', mapName: '大型实验室地图 V1', ownerName: 'AGV 调度', coordinateType: 'MAP', mapX: 566, mapY: 420, mapYaw: 0, navPointCode: 'NAV-C01', operationPoint: 'CACHE-C01', compatibleCarrierType: '标准料箱', statusSource: '机器人反馈', occupancyStatus: 1, currentCarrierCode: 'CAR-0002', lastCheckTime: '2026-08-27 10:29:00', enabled: true, remark: '' },
    ],
    carriers: [
      { id: 1, carrierCode: 'CAR-0001', barcode: 'BOX-100001', carrierTypeId: 1, typeCode: 'CT-BOX', typeName: '标准料箱', currentLocationId: 1, locationCode: 'A-01-01', locationName: '立库 A 一层 01', carrierStatus: 'IN_STORAGE', relatedOrderCode: '', lastScanTime: '2026-08-27 10:30:00', enabled: true, remark: '' },
      { id: 2, carrierCode: 'CAR-0002', barcode: 'BOX-100002', carrierTypeId: 1, typeCode: 'CT-BOX', typeName: '标准料箱', currentLocationId: 4, locationCode: 'C-01', locationName: '机器人缓存位 C01', carrierStatus: 'OCCUPIED', relatedOrderCode: 'ORD-20260827-001', lastScanTime: '2026-08-27 10:29:00', enabled: true, remark: '' },
      { id: 3, carrierCode: 'CAR-0003', barcode: 'TRY-200003', carrierTypeId: 2, typeCode: 'CT-TRAY', typeName: '样品托盘', currentLocationId: 3, locationCode: 'W-B01', locationName: '检测仪 B 进样位', carrierStatus: 'IN_USE', relatedOrderCode: 'ORD-20260827-004', lastScanTime: '2026-08-27 10:31:00', enabled: true, remark: '' },
      { id: 4, carrierCode: 'CAR-0004', barcode: 'TRY-200004', carrierTypeId: 2, typeCode: 'CT-TRAY', typeName: '样品托盘', currentLocationId: 2, locationCode: 'A-02-03', locationName: '立库 A 二层 03', carrierStatus: 'IDLE', relatedOrderCode: '', lastScanTime: '2026-08-27 09:46:00', enabled: true, remark: '' },
    ],
    lab: {
      id: 1,
      name: '智能制造中心一期',
      published: { configId: 1, id: 1, revision: 6, status: 'PUBLISHED', map: { name: '大型实验室地图', version: 'V1.6', imageUrl: '/legacy/assets/overview/lab-map.png' } },
      draft: { configId: 2, id: 2, revision: 7, status: 'DRAFT', map: { name: '大型实验室地图', version: 'V1.7-draft', imageUrl: '/legacy/assets/overview/lab-map.png' } },
    },
    labConfigs: {
      1: { id: 1, configId: 1, revision: 6, status: 'PUBLISHED' },
      2: { id: 2, configId: 2, revision: 7, status: 'DRAFT' },
    },
  }

  function completeLabConfig(base) {
    return {
      ...base,
      labName: '智能制造中心一期',
      spaceName: '一期作业区',
      map: base.map || { name: '大型实验室地图', version: base.status === 'DRAFT' ? 'V1.7-draft' : 'V1.6', imageUrl: '/legacy/assets/overview/lab-map.png' },
      nodes: base.nodes || [
        { id: 1, code: 'N-A01', name: '立库 A 入口', type: 'NAVIGATION', x: 126.4, y: 82.6, yaw: 90 },
        { id: 2, code: 'N-B01', name: '检测区入口', type: 'NAVIGATION', x: 454, y: 194, yaw: 180 },
        { id: 3, code: 'N-C01', name: '缓存区入口', type: 'NAVIGATION', x: 566, y: 420, yaw: 0 },
      ],
      links: base.links || [
        { id: 1, code: 'L-A-B', startNodeId: 1, endNodeId: 2, direction: 'BIDIRECTIONAL', speedLimit: 0.8 },
        { id: 2, code: 'L-B-C', startNodeId: 2, endNodeId: 3, direction: 'ONE_WAY', speedLimit: 0.6 },
      ],
      machines: base.machines || [
        { id: 1, code: 'M-RACK-A', name: '立库 A', type: 'STORAGE', anchorX: 126.4, anchorY: 82.6, anchorYaw: 90 },
        { id: 2, code: 'M-TEST-B', name: '检测仪 B', type: 'ANALYZER', anchorX: 454, anchorY: 194, anchorYaw: 180 },
      ],
      points: base.points || [
        { id: 1, machineId: 1, navNodeId: 1, code: 'PICK-A01', name: '立库取放点', type: 'ACTION_POINT', frame: 'MAP', x: 126.4, y: 82.6, z: 0, rx: 0, ry: 0, rz: 90 },
        { id: 2, machineId: 2, navNodeId: 2, code: 'LOAD-B01', name: '检测仪进样点', type: 'ACTION_POINT', frame: 'MACHINE', x: 0.42, y: 0.08, z: 0.9, rx: 0, ry: 0, rz: 180 },
      ],
    }
  }

  seed.labConfigs[1] = completeLabConfig(seed.labConfigs[1])
  seed.labConfigs[2] = completeLabConfig(seed.labConfigs[2])

  function loadState() {
    try {
      return { ...seed, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    } catch {
      return structuredClone(seed)
    }
  }

  let state = loadState()
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* storage may be unavailable */ }
  }
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const ok = (data, message = '成功') => json({ code: 200, message, data })
  const bodyOf = async (init) => {
    if (!init?.body || init.body instanceof FormData) return {}
    try { return JSON.parse(init.body) } catch { return {} }
  }
  const nextId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1

  function pageOf(records, url) {
    const pageNum = Math.max(1, Number(url.searchParams.get('pageNum')) || 1)
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 10)
    const start = (pageNum - 1) * pageSize
    return { records: records.slice(start, start + pageSize), total: records.length, pageNum, pageSize }
  }

  function workflowDetail(template) {
    return {
      ...template,
      editorData: JSON.stringify({
        zoom: 1,
        nodes: [
          { id: 1, name: '开始', type: '通用节点', icon: 'start', x: 40, y: 135, bpmnNodeId: 'StartEvent_1' },
          { id: 2, name: '移动', type: 'AGV 节点', icon: 'move', x: 310, y: 125, bpmnNodeId: 'Task_Move' },
          { id: 3, name: '单次取料', type: 'AGV 节点', icon: 'pick', x: 580, y: 125, bpmnNodeId: 'Task_Pick' },
          { id: 4, name: '单次放料', type: 'AGV 节点', icon: 'place', x: 580, y: 345, bpmnNodeId: 'Task_Place' },
          { id: 5, name: '结束', type: '通用节点', icon: 'end', x: 310, y: 345, bpmnNodeId: 'EndEvent_1' },
        ],
        connections: [{ id: 1, from: 1, to: 2 }, { id: 2, from: 2, to: 3 }, { id: 3, from: 3, to: 4 }, { id: 4, from: 4, to: 5 }],
      }),
      bpmnXml: '',
      deployedVersion: template.status === 'ENABLED' ? template.version : null,
    }
  }

  function orderDetail(order) {
    const tasks = Array.from({ length: order.taskCount || 1 }, (_, index) => ({
      id: order.id * 100 + index + 1,
      taskSeq: index + 1,
      taskNumber: `${order.systemOrderNo}-T${String(index + 1).padStart(2, '0')}`,
      taskName: index === 0 ? '取料并运送至检测区' : `工序任务 ${index + 1}`,
      flowNumber: index === 0 ? 'FLOW-001' : 'FLOW-002',
      status: index < order.completedTaskCount ? 'COMPLETED' : order.status === 'RUNNING' && index === order.completedTaskCount ? 'EXECUTING' : 'PENDING',
      currentStep: index < order.completedTaskCount ? '已完成' : index === order.completedTaskCount ? '移动至目标点位' : '等待前序任务',
      startedAt: order.issuedAt,
    }))
    return {
      order,
      tasks,
      currentTask: tasks.find((task) => task.status === 'EXECUTING') || tasks[0],
      executionConfig: {
        flowNumber: 'FLOW-001', flowName: '标准搬运', flowTemplateId: 1, flowTemplateName: '标准搬运流程',
        completePath: '立库 A → 检测区入口 → 检测仪 B', pointConfiguration: 'PICK-A01 / LOAD-B01', failureStrategy: '重试 3 次后挂起并通知操作员',
        actions: [
          { sort: 1, nodeName: '移动至取料位', nodeCode: 'MOVE-PICK', status: 'COMPLETED', completionCriteria: '到位反馈' },
          { sort: 2, nodeName: '单次取料', nodeCode: 'PICK-ONCE', status: 'COMPLETED', completionCriteria: '夹具传感器有料' },
          { sort: 3, nodeName: '移动至目标位', nodeCode: 'MOVE-TARGET', status: 'EXECUTING', completionCriteria: '导航到位' },
          { sort: 4, nodeName: '单次放料', nodeCode: 'PLACE-ONCE', status: 'PENDING', completionCriteria: '机台确认收料' },
        ],
      },
    }
  }

  async function handle(url, init) {
    const method = String(init?.method || 'GET').toUpperCase()
    const path = url.pathname
    const payload = await bodyOf(init)

    if (path === '/api/home-test/overview') return ok({
      agvStatus: { agvCode: 'AGV-01', online: true, executionStatus: 'RUNNING', batteryPercent: 78 },
      currentOrder: { executingCount: 5, queuedCount: 4, source: 'MES' },
      locationConsistency: { rate: 96, pendingConfirmationCount: 2 },
      todayTaskCompletion: { completedCount: 28, totalCount: 34, completionRate: 82 },
      hardwareModules: [
        { code: 'CHASSIS', name: '移动底盘', online: true }, { code: 'ROBOT_ARM', name: '协作机械臂', online: true },
        { code: 'VISION', name: '视觉相机', online: true }, { code: 'GRIPPER', name: '电动夹具', online: true }, { code: 'SCANNER', name: '扫码器', online: true },
      ],
    })

    if (path === '/api/orders' && method === 'GET') {
      let records = [...state.orders]
      const status = url.searchParams.get('status')
      const source = url.searchParams.get('source')
      const keyword = (url.searchParams.get('keyword') || '').toLowerCase()
      if (status) records = records.filter((item) => item.status === status)
      if (source) records = records.filter((item) => item.source === source)
      if (keyword) records = records.filter((item) => `${item.upstreamOrderNo} ${item.systemOrderNo}`.toLowerCase().includes(keyword))
      return ok(pageOf(records, url))
    }
    if (path === '/api/orders' && method === 'POST') {
      const id = nextId(state.orders)
      const record = { id, upstreamOrderNo: payload.upstreamOrderNo, systemOrderNo: `SYS-${Date.now()}`, source: payload.source || 'MANUAL', status: 'QUEUED', priority: payload.priority || 2, taskCount: payload.tasks?.length || 1, completedTaskCount: 0, issuedAt: now() }
      state.orders.unshift(record); save(); return ok(record, '订单创建成功')
    }
    if (path === '/api/orders/sync') return ok({ receivedCount: 3, createdCount: 1, updatedCount: 2 }, '订单同步成功')
    if (path === '/api/detail') {
      const order = state.orders.find((item) => String(item.id) === String(url.searchParams.get('id'))) || state.orders[0]
      return ok(orderDetail(order))
    }

    if (path === '/api/flow-templates/flows/page') return ok(pageOf(state.workflows, url))
    if (path === '/api/workflow-templates/page') return ok(pageOf(state.workflows, url))
    if (path === '/api/workflow-templates/deploy') {
      const item = state.workflows.find((entry) => String(entry.id) === String(url.searchParams.get('id')))
      if (item) { item.status = 'ENABLED'; item.statusDescription = '已启用'; item.version = Number(item.version || 0) + 1; save() }
      return ok(item || { version: 1 }, '模板发布成功')
    }
    if (path === '/api/workflow-templates' && method === 'POST') {
      const record = { id: nextId(state.workflows), ...payload, status: 'DRAFT', statusDescription: '草稿', version: 1, updatedAt: now() }
      state.workflows.unshift(record); save(); return ok(record, '模板保存成功')
    }
    const workflowMatch = path.match(/^\/api\/workflow-templates\/(\d+)$/)
    if (workflowMatch) {
      const item = state.workflows.find((entry) => String(entry.id) === workflowMatch[1]) || state.workflows[0]
      return ok(workflowDetail(item))
    }
    if (path === '/api/actions') return ok([
      { id: 1, actionKey: 'MOVE', revision: 3, status: 'ACTIVE', definition: { displayName: '移动', description: 'AGV 导航移动', downstreamActionType: 'MOVE' } },
      { id: 2, actionKey: 'ARM.PICK', revision: 2, status: 'ACTIVE', definition: { displayName: '单次取料', description: '机械臂执行单次取料', downstreamActionType: 'PICK' } },
      { id: 3, actionKey: 'ARM.PLACE', revision: 2, status: 'ACTIVE', definition: { displayName: '单次放料', description: '机械臂执行单次放料', downstreamActionType: 'PLACE' } },
      { id: 4, actionKey: 'VISION.CAPTURE', revision: 1, status: 'ACTIVE', definition: { displayName: '现场拍照', description: '视觉相机采集现场图像', downstreamActionType: 'VISION' } },
    ])

    const resources = { '/locations': 'locations', '/locationTypes': 'locationTypes', '/carrierTypes': 'carrierTypes', '/carriers': 'carriers' }
    const resourceRoot = Object.keys(resources).find((root) => path === root || path.startsWith(root + '/'))
    if (resourceRoot) {
      const key = resources[resourceRoot]
      const list = state[key]
      const idText = path.slice(resourceRoot.length + 1)
      if (method === 'GET' && idText) return ok(list.find((item) => String(item.id) === idText) || null)
      if (method === 'GET') {
        let records = [...list]
        for (const [filterKey, filterValue] of url.searchParams.entries()) {
          if (!filterValue) continue
          records = records.filter((item) => String(item[filterKey] ?? '').toLowerCase().includes(filterValue.toLowerCase()))
        }
        return ok(records)
      }
      if (method === 'POST') { const record = { id: nextId(list), ...payload, createTime: now(), updateTime: now() }; list.unshift(record); save(); return ok(record) }
      const index = list.findIndex((item) => String(item.id) === idText)
      if (method === 'PUT' && index >= 0) { list[index] = { ...list[index], ...payload, id: list[index].id, updateTime: now() }; save(); return ok(list[index]) }
      if (method === 'DELETE' && index >= 0) { const removed = list.splice(index, 1)[0]; save(); return ok(removed) }
    }

    if (path === '/api/lab') {
      if (method === 'PUT') { state.lab = { ...state.lab, ...payload }; save() }
      return ok(state.lab)
    }
    if (path === '/api/lab/drafts' && method === 'POST') {
      const id = Math.max(...Object.keys(state.labConfigs).map(Number)) + 1
      state.labConfigs[id] = completeLabConfig({ ...structuredClone(state.labConfigs[state.lab.published.configId]), id, configId: id, status: 'DRAFT', revision: Number(state.lab.published.revision || 0) + 1 })
      state.lab.draft = { configId: id, id, revision: state.labConfigs[id].revision, status: 'DRAFT', map: state.labConfigs[id].map }
      save(); return ok({ configId: id })
    }
    if (path === '/api/files/images' && method === 'POST') return ok({ url: '/legacy/assets/overview/lab-map.png', path: '/legacy/assets/overview/lab-map.png' })

    const configMatch = path.match(/^\/api\/lab-configs\/(\d+)(?:\/([^/]+))?(?:\/(\d+))?$/)
    if (configMatch) {
      const configId = Number(configMatch[1]); const collection = configMatch[2]; const itemId = configMatch[3]
      const config = state.labConfigs[configId] || state.labConfigs[2]
      if (!collection && method === 'GET') return ok(config)
      if (!collection && method === 'DELETE') { delete state.labConfigs[configId]; if (state.lab.draft?.configId === configId) state.lab.draft = null; save(); return ok(true) }
      if (collection === 'validate') return ok({ valid: true, issues: [] })
      if (collection === 'publish') { config.status = 'PUBLISHED'; state.lab.published = { configId, id: configId, revision: config.revision, status: 'PUBLISHED', map: config.map }; state.lab.draft = null; save(); return ok(config) }
      if (collection === 'map' && method === 'PUT') { config.map = { ...config.map, ...payload }; save(); return ok(config.map) }
      if (Array.isArray(config[collection])) {
        const list = config[collection]
        if (method === 'POST') { const record = { id: nextId(list), ...payload }; list.push(record); save(); return ok(record) }
        const index = list.findIndex((item) => String(item.id) === String(itemId))
        if (method === 'PUT' && index >= 0) { list[index] = { ...list[index], ...payload, id: list[index].id }; save(); return ok(list[index]) }
        if (method === 'DELETE' && index >= 0) { const removed = list.splice(index, 1)[0]; save(); return ok(removed) }
      }
    }

    return ok(payload || {})
  }

  const nativeFetch = window.fetch.bind(window)
  window.fetch = function agvMockFetch(input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href)
    const isMockPath = url.origin === window.location.origin && (/^\/api\//.test(url.pathname) || /^\/(locations|locationTypes|carrierTypes|carriers)(\/|$)/.test(url.pathname))
    if (!isMockPath) return nativeFetch(input, init)
    if (init?.signal?.aborted) return Promise.reject(init.signal.reason || new DOMException('Aborted', 'AbortError'))
    return Promise.resolve().then(() => handle(url, init))
  }

  window.__AGV_MOCK_API__ = {
    get state() { return state },
    reset() { localStorage.removeItem(STORAGE_KEY); state = structuredClone(seed); return state },
  }
})()
