(function () {
  'use strict';

  const hardwareModules = [
    { module: '底盘', vendor: 'HIKROBOT', model: 'AMR-1200', id: 'CHASSIS-HIK-01', protocol: 'REST API', purpose: '导航、移动、回充', status: '在线' },
    { module: '底盘', vendor: 'STANDARD ROBOTS', model: 'AMR-1200', id: 'CHASSIS-SR-01', protocol: 'REST API', purpose: '导航、移动、回充', status: '在线' },
    { module: '机械臂', vendor: 'HUAYAN', model: 'CR10', id: 'ARM-HY-01', protocol: 'TCP/IP', purpose: '取料、放料、回安全位', status: '在线' },
    { module: '机械臂', vendor: 'DOBOT', model: 'CR10', id: 'ARM-DOBOT-01', protocol: 'TCP/IP', purpose: '取料、放料、回安全位', status: '在线' },
    { module: '相机', vendor: 'HIK', model: '3D-CAM-X', id: 'CAMERA-HIK-01', protocol: '厂商 SDK', purpose: '扫描条码、精确定位、偏移测量', status: '在线' },
    { module: '相机', vendor: 'HUAYAN', model: '3D-CAM-X', id: 'CAMERA-HY-01', protocol: '厂商 SDK', purpose: '扫描条码、精确定位、偏移测量', status: '在线' },
    { module: '相机', vendor: 'DOBOT', model: '3D-CAM-X', id: 'CAMERA-DOBOT-01', protocol: '厂商 SDK', purpose: '扫描条码、精确定位、偏移测量', status: '在线' },
    { module: '夹具', vendor: 'DH', model: 'EG-20', id: 'GRIPPER-DH-01', protocol: 'Modbus TCP', purpose: '打开、关闭、到位检测', status: '在线' },
    { module: '夹具', vendor: 'JD', model: 'EG-20', id: 'GRIPPER-JD-01', protocol: 'Modbus TCP', purpose: '打开、关闭、到位检测', status: '在线' }
  ];

  const robotSeed = [
    ['AGV-01', '运行中', '在线', 82, 'N09', 'MES-20260827-0001', 'TRN-3101-01', '智能仓储 → 贴标机台', '贴标机台', 0],
    ['AGV-02', '运行中', '在线', 76, 'N10', 'MES-20260827-0002', 'TRN-3102-01', '智能仓储 → 投料机台', '库位 A', 0],
    ['AGV-03', '运行中', '在线', 69, 'N11', 'MES-20260827-0003', 'TRN-3103-01', '智能仓储 → 反应取样机台', '手套箱', 0],
    ['AGV-04', '运行中', '在线', 63, 'N12', 'MES-20260827-0004', 'TRN-3104-01', '反应机台 → 后处理机台', '贴标机台', 0],
    ['AGV-05', '运行中', '在线', 58, 'N13', 'MES-20260827-0005', 'TRN-3105-01', '智能仓储 → 贴标机台', '库位 A', 0],
    ['AGV-06', '等待资源', '在线', 51, '等待区 W-07', 'MES-20260827-0006', 'TRN-3106-01', '智能仓储 → 投料机台', '手套箱', 0],
    ['AGV-07', '等待资源', '在线', 47, '等待区 W-08', 'MES-20260827-0007', 'TRN-3107-01', '智能仓储 → 反应取样机台', '贴标机台', 0],
    ['AGV-08', '空闲', '在线', 86, 'N16', '—', '—', '—', '—', 0],
    ['AGV-09', '充电中', '在线', 24, '充电区 CHG-04', '—', '—', '—', '充电桩 CHG-04', 0],
    ['AGV-10', '异常', '离线', 12, 'N18', '—', '—', '—', '维护工位', 2]
  ];

  const robots = robotSeed.map(function (item) {
    const robotNumber = Number(item[0].slice(-2));
    return {
      id: item[0], status: item[1], connection: item[2], battery: item[3], point: item[4], order: item[5],
      task: item[6], flow: item[7], target: item[8], abnormalModules: item[9],
      name: '复合机器人 ' + String(robotNumber).padStart(2, '0'),
      chassis: robotNumber % 2 ? 'HIKROBOT AMR-1200' : 'STANDARD ROBOTS AMR-1200',
      map: '大型实验室总览地图', mapVersion: 'V3.2', remark: ''
    };
  });

  const elements = {
    tableBody: document.getElementById('robotTableBody'),
    result: document.getElementById('robotResult'),
    empty: document.getElementById('emptyState'),
    search: document.getElementById('robotSearch'),
    status: document.getElementById('statusFilter'),
    detailTitle: document.getElementById('robotDetailTitle'),
    detailContent: document.getElementById('robotDetailContent'),
    toast: document.getElementById('toast')
  };
  let activeFilter = { keyword: '', status: 'all' };
  let toastTimer;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function robotIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M9 7V4h6v3M8.5 12h.01M15.5 12h.01M9 16h6"/></svg>';
  }

  function eyeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  }

  function statusClass(status) {
    const classes = {
      '在线': 'status-online', '离线': 'status-offline', '运行中': 'status-running', '等待资源': 'status-waiting',
      '空闲': 'status-idle', '充电中': 'status-charging', '异常': 'status-error'
    };
    return classes[status] || 'status-running';
  }

  function statusTag(status) {
    return '<span class="status-tag ' + statusClass(status) + '">' + escapeHtml(status) + '</span>';
  }

  function batteryClass(value) {
    if (value <= 15) return 'is-critical';
    if (value <= 30) return 'is-low';
    return '';
  }

  function renderStats() {
    document.getElementById('robotCountBadge').textContent = robots.length + ' 台已配置';
  }

  function filteredRobots() {
    return robots.filter(function (robot) {
      const keywordMatch = !activeFilter.keyword || robot.id.includes(activeFilter.keyword);
      const statusMatch = activeFilter.status === 'all' || robot.status === activeFilter.status;
      return keywordMatch && statusMatch;
    });
  }

  function robotRow(robot) {
    const normalModules = hardwareModules.length - robot.abnormalModules;
    const orderClass = robot.order === '—' ? ' class="empty-order"' : '';
    return '<tr data-robot-id="' + escapeHtml(robot.id) + '" tabindex="0" aria-label="查看 ' + escapeHtml(robot.id) + ' 详情">' +
      '<td><div class="robot-cell"><span class="robot-mark">' + robotIcon() + '</span><strong>' + escapeHtml(robot.id) + '</strong></div></td>' +
      '<td><div class="map-cell"><strong>' + escapeHtml(robot.map) + '</strong><small>版本 ' + escapeHtml(robot.mapVersion) + '</small></div></td>' +
      '<td>' + escapeHtml(robot.point) + '</td>' +
      '<td>' + statusTag(robot.connection) + '</td>' +
      '<td>' + statusTag(robot.status) + '</td>' +
      '<td><span class="module-health"><strong>' + normalModules + '</strong><em>/</em><strong class="' + (robot.abnormalModules ? 'has-error' : '') + '">' + robot.abnormalModules + '</strong></span></td>' +
      '<td><div class="battery-cell"><span class="battery-track"><i class="' + batteryClass(robot.battery) + '" style="width:' + robot.battery + '%"></i></span><span>' + robot.battery + '%</span></div></td>' +
      '<td' + orderClass + '>' + escapeHtml(robot.order) + '</td>' +
      '<td><button class="icon-action" type="button" data-view-robot="' + escapeHtml(robot.id) + '" aria-label="查看 ' + escapeHtml(robot.id) + '" title="查看详情">' + eyeIcon() + '</button></td>' +
      '</tr>';
  }

  function renderTable() {
    const visibleRobots = filteredRobots();
    elements.tableBody.innerHTML = visibleRobots.map(robotRow).join('');
    elements.result.textContent = '当前显示 ' + visibleRobots.length + ' 台 / 共 ' + robots.length + ' 台';
    elements.empty.hidden = visibleRobots.length !== 0;
    elements.tableBody.closest('.table-wrap').hidden = visibleRobots.length === 0;
  }

  function moduleDeviceId(moduleId, robotId) {
    const suffix = robotId.slice(-2);
    return moduleId.replace(/-01$/, '-' + suffix);
  }

  function detailStat(label, value, description) {
    return '<article class="detail-stat"><small>' + escapeHtml(label) + '</small><strong title="' + escapeHtml(value) + '">' + escapeHtml(value) + '</strong><span title="' + escapeHtml(description) + '">' + escapeHtml(description) + '</span></article>';
  }

  function renderRobotDetail(robot) {
    const moduleRows = hardwareModules.map(function (module, index) {
      const abnormal = robot.abnormalModules > 0 && index >= hardwareModules.length - robot.abnormalModules;
      return '<tr><td><strong>' + escapeHtml(module.module) + '</strong></td><td>' + escapeHtml(module.vendor) + '</td><td>' + escapeHtml(module.model) + '</td><td>' + escapeHtml(moduleDeviceId(module.id, robot.id)) + '</td><td>' + escapeHtml(module.protocol) + '</td><td>' + escapeHtml(module.purpose) + '</td><td>' + statusTag(abnormal ? '异常' : module.status) + '</td></tr>';
    }).join('');
    const moduleTone = robot.abnormalModules ? 'status-waiting' : 'status-online';
    elements.detailTitle.textContent = robot.id;
    elements.detailContent.innerHTML =
      '<section class="detail-hero"><div class="detail-identity"><span class="detail-robot-icon">' + robotIcon() + '</span><div><strong>' + escapeHtml(robot.name) + '</strong><p>' + escapeHtml(robot.id) + ' · ' + escapeHtml(robot.target) + ' · ' + escapeHtml(robot.point) + '</p></div></div><div class="detail-tags">' + statusTag(robot.connection) + statusTag(robot.status) + '<span class="status-tag ' + moduleTone + '">正常模组 ' + (hardwareModules.length - robot.abnormalModules) + ' / 异常 ' + robot.abnormalModules + '</span></div></section>' +
      '<section class="detail-stat-grid">' +
        detailStat('当前订单', robot.order, '当前任务 ' + robot.task) +
        detailStat('当前流程', robot.flow, robot.task === '—' ? '暂无执行流程' : '流程任务正常执行') +
        detailStat('当前位置', robot.point, '定位正常 · 电量 ' + robot.battery + '%') +
        detailStat('工作地图', robot.map, '版本 ' + robot.mapVersion) +
      '</section>' +
      '<section class="module-panel"><header class="module-panel-head"><div><h3>硬件模组列表</h3><p>显示 ' + escapeHtml(robot.id) + ' 当前配置的全部硬件模组</p></div><span class="module-count">' + hardwareModules.length + ' 个模组</span></header><div class="module-table-wrap"><table class="module-table" aria-label="' + escapeHtml(robot.id) + ' 硬件模组列表"><thead><tr><th>硬件模组</th><th>硬件厂商</th><th>设备型号</th><th>设备编号</th><th>通信协议</th><th>主要用途</th><th>状态</th></tr></thead><tbody>' + moduleRows + '</tbody></table></div></section>';
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      modal.classList.add('open');
      modal.querySelector('input:not([type="hidden"]), select, textarea')?.focus();
    });
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 200);
  }

  function openRobotDetail(robotId) {
    const robot = robots.find(function (item) { return item.id === robotId; });
    if (!robot) return;
    renderRobotDetail(robot);
    openModal('robotDetailModal');
  }

  function applyFilter() {
    activeFilter = {
      keyword: elements.search.value.trim().toUpperCase(),
      status: elements.status.value
    };
    renderTable();
  }

  function resetFilter() {
    elements.search.value = '';
    elements.status.value = 'all';
    activeFilter = { keyword: '', status: 'all' };
    renderTable();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elements.toast.classList.remove('show'); }, 2200);
  }

  elements.tableBody.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-view-robot]');
    const row = event.target.closest('[data-robot-id]');
    openRobotDetail((trigger && trigger.dataset.viewRobot) || (row && row.dataset.robotId));
  });
  elements.tableBody.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-robot-id]');
    if (!row) return;
    event.preventDefault();
    openRobotDetail(row.dataset.robotId);
  });

  document.getElementById('searchBtn').addEventListener('click', applyFilter);
  document.getElementById('resetFilterBtn').addEventListener('click', resetFilter);
  elements.search.addEventListener('keydown', function (event) { if (event.key === 'Enter') applyFilter(); });
  document.getElementById('addRobotBtn').addEventListener('click', function () {
    document.getElementById('addRobotForm').reset();
    openModal('addRobotModal');
  });

  document.getElementById('addRobotForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const id = document.getElementById('newRobotId').value.trim().toUpperCase();
    const name = document.getElementById('newRobotName').value.trim();
    const point = document.getElementById('newRobotPoint').value.trim();
    const status = document.getElementById('newRobotStatus').value;
    const chassis = document.getElementById('newRobotChassis').value;
    const remark = document.getElementById('newRobotRemark').value.trim();
    if (robots.some(function (robot) { return robot.id === id; })) {
      showToast(id + ' 已存在，请修改机器人编号');
      return;
    }
    robots.push({ id: id, name: name, status: status, connection: '在线', battery: status === '充电中' ? 20 : 100, point: point, order: '—', task: '—', flow: '—', target: '—', abnormalModules: 0, chassis: chassis, map: '大型实验室总览地图', mapVersion: 'V3.2', remark: remark });
    resetFilter();
    renderStats();
    closeModal('addRobotModal');
    showToast(id + ' 已加入机器人池');
  });

  document.querySelectorAll('[data-close]').forEach(function (button) {
    button.addEventListener('click', function () { closeModal(button.dataset.close); });
  });
  document.querySelectorAll('.modal-overlay').forEach(function (modal) {
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(modal.id); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const openModalElement = document.querySelector('.modal-overlay.open');
    if (openModalElement) closeModal(openModalElement.id);
  });

  document.getElementById('statusInfoBtn')?.addEventListener('click', function () { openModal('statusModal'); });
  const alertDrawer = document.getElementById('alertDrawer');
  document.getElementById('alertInfoBtn')?.addEventListener('click', function () {
    alertDrawer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { alertDrawer.classList.add('open'); });
  });
  alertDrawer?.addEventListener('click', function (event) {
    if (event.target !== alertDrawer) return;
    alertDrawer.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { alertDrawer.hidden = true; }, 220);
  });
  document.getElementById('recoveryBtn')?.addEventListener('click', function () { location.href = 'current-anomalies.html'; });

  renderStats();
  renderTable();
}());
