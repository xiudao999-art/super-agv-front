import {
  getDashboardOverview,
  getLaboratory,
  getLaboratoryConfig
} from './assets/data/dashboard-data.js';

(function () {
  'use strict';

  const root = document.getElementById('fleetDashboard');
  if (!root) return;

  const DIRECT_API_BASE_URL = 'http://121.196.164.163:8081';
  const apiBaseUrl = location.protocol === 'file:' ? DIRECT_API_BASE_URL : '';
  const colors = ['#2188ff', '#18a66a', '#8a5cf5', '#f39b24', '#ec5272'];
  const statusMeta = {
    RUNNING: { label: '运行中', color: '#2188ff' },
    WAITING: { label: '等待资源', color: '#f39b24' },
    IDLE: { label: '空闲', color: '#18a66a' },
    CHARGING: { label: '充电中', color: '#8a5cf5' },
    ERROR: { label: '异常', color: '#e64a62' }
  };
  const fallbackFleet = [
    ['AGV-01', 'RUNNING', 78, 'W-B01', 'TRN-0031-01', '检测仪 B'],
    ['AGV-02', 'RUNNING', 86, 'A-02-03', 'TRN-0032-01', '投料工作站'],
    ['AGV-03', 'RUNNING', 64, 'C-01', 'TRN-0033-02', '缓存位 C02'],
    ['AGV-04', 'RUNNING', 91, 'W-A03', 'TRN-0034-01', '贴标机台'],
    ['AGV-05', 'RUNNING', 55, 'D-01', 'TRN-0035-01', '检测区入口'],
    ['AGV-06', 'WAITING', 73, 'W-C01', 'TRN-0036-01', '自动门 D-01'],
    ['AGV-07', 'WAITING', 67, 'E-01', 'TRN-0037-01', '电梯 01W'],
    ['AGV-08', 'IDLE', 82, 'PARK-03', '--', '待命点'],
    ['AGV-09', 'CHARGING', 38, 'CHARGE-02', '--', '充电位 02'],
    ['AGV-10', 'ERROR', 21, 'W-D02', 'TRN-0038-01', '等待人工处理']
  ].map((item, index) => ({
    code: item[0], status: item[1], battery: item[2], point: item[3],
    task: item[4], target: item[5], online: item[1] !== 'ERROR', routeColor: colors[index % colors.length]
  }));

  const elements = {
    cards: document.getElementById('fleetCards'),
    empty: document.getElementById('fleetEmpty'),
    search: document.getElementById('fleetSearch'),
    filter: document.getElementById('fleetStatusFilter'),
    reset: document.getElementById('fleetReset'),
    searchButton: document.getElementById('fleetSearchButton'),
    resultCount: document.getElementById('fleetResultCount'),
    mapSelect: document.getElementById('fleetMapRobot'),
    mapCount: document.getElementById('fleetMapCount'),
    mapVersion: document.getElementById('fleetMapVersion'),
    mapSummary: document.getElementById('fleetMapSummary'),
    mapArt: document.getElementById('fleetMapArt'),
    mapState: document.getElementById('fleetMapState'),
    pointLayer: document.getElementById('fleetPointLayer'),
    tooltip: document.getElementById('fleetMapTooltip'),
    legend: document.getElementById('fleetRouteLegend'),
    orderMetrics: document.getElementById('orderMetrics'),
    agvMetrics: document.getElementById('agvMetrics')
  };

  let fleet = fallbackFleet.map(item => ({ ...item }));
  let selectedRobot = 'all';

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function normalizeStatus(value, online) {
    if (online === false) return 'ERROR';
    const status = String(value || '').toUpperCase();
    if (['EXECUTING', 'RUNNING', 'MOVING', 'WORKING'].includes(status)) return 'RUNNING';
    if (['STANDBY', 'WAITING', 'QUEUED', 'BLOCKED'].includes(status)) return 'WAITING';
    if (status === 'CHARGING') return 'CHARGING';
    if (['ERROR', 'FAULT', 'OFFLINE'].includes(status)) return 'ERROR';
    return 'IDLE';
  }

  function metric(label, value, options = {}) {
    const tone = options.tone || 'neutral';
    const badge = options.badge ? `<span class="fleet-metric-badge ${tone}">${options.badge}</span>` : '';
    const caption = options.caption ? `<small class="fleet-metric-caption ${tone}">${options.caption}</small>` : '';
    return `<article class="fleet-metric"><div class="fleet-metric-head"><span class="fleet-metric-label">${label}</span>${badge}</div><strong>${value}<em>${options.unit || ''}</em></strong>${caption}</article>`;
  }

  function renderMetrics(overview) {
    const order = overview?.currentOrder || {};
    const today = overview?.todayTaskCompletion || {};
    const executing = number(order.executingCount, 5);
    const queued = number(order.queuedCount, 4);
    const total = number(today.totalCount, executing + queued + 8);
    const abnormal = Math.max(0, number(order.abnormalCount, 0));
    const completed = Math.max(0, number(order.completedCount, total - executing - queued - abnormal));
    const received = Math.max(total, executing + queued + completed + abnormal);
    const counts = fleet.reduce((result, robot) => {
      result[robot.status] = (result[robot.status] || 0) + 1;
      return result;
    }, {});
    function countsOrZero(status) { return counts[status] || 0; }
    elements.orderMetrics.innerHTML = [
      metric('今日接收', received, { unit: '单', caption: '来自 MES / LIMS' }),
      metric('执行中', executing, { unit: '单', caption: `关联 ${countsOrZero('RUNNING')} 台运行中 AGV`, tone: 'blue' }),
      metric('排队中', queued, { unit: '单', caption: '等待 AGV 或共享资源', tone: 'warning' }),
      metric('已完成', completed, { unit: '单', caption: '已完成结果回传', tone: 'success' }),
      metric('异常', abnormal, { unit: '单', caption: '任务挂起或等待人工处理', tone: 'danger' })
    ].join('');

    elements.agvMetrics.innerHTML = [
      metric('AGV 总数', fleet.length, { unit: '台' }),
      metric('运行中', countsOrZero('RUNNING'), { unit: '台', badge: '正在执行任务', tone: 'blue' }),
      metric('空闲 / 等待', countsOrZero('IDLE') + countsOrZero('WAITING'), { unit: '台', badge: `空闲 ${countsOrZero('IDLE')} · 等待资源 ${countsOrZero('WAITING')}`, tone: 'warning' }),
      metric('充电中', countsOrZero('CHARGING'), { unit: '台', badge: '充电或维护', tone: 'orange' }),
      metric('异常', countsOrZero('ERROR'), { unit: '台', badge: '故障或离线', tone: 'danger' })
    ].join('');
  }

  function renderFleetCards() {
    const query = elements.search.value.trim().toLowerCase();
    const status = elements.filter.value;
    const visible = fleet.filter(robot => (!query || robot.code.toLowerCase().includes(query)) && (status === 'all' || robot.status === status));
    elements.cards.innerHTML = visible.map(robot => {
      const meta = statusMeta[robot.status] || statusMeta.IDLE;
      return `<article class="fleet-card${selectedRobot === robot.code ? ' selected' : ''}" data-robot-code="${robot.code}" tabindex="0" role="button" aria-label="查看 ${robot.code} 运行路线" style="--status:${meta.color}">
        <div class="fleet-card-head"><div class="fleet-card-id"><span class="fleet-card-icon"><img src="assets/images/AGV.svg" alt=""></span><span><strong>${robot.code}</strong><small>${robot.online ? '通信在线' : '通信异常'}</small></span></div><span class="fleet-status">${meta.label}</span></div>
        <div class="fleet-card-details"><div class="fleet-detail"><span>当前位置</span><b title="${robot.point}">${robot.point}</b></div><div class="fleet-detail"><span>当前任务</span><b title="${robot.task}">${robot.task}</b></div><div class="fleet-detail"><span>目标位置</span><b title="${robot.target}">${robot.target}</b></div></div>
        <div class="fleet-battery"><div class="fleet-battery-track"><i style="--battery:${robot.battery}%"></i></div><b>${robot.battery}%</b></div>
      </article>`;
    }).join('');
    elements.resultCount.textContent = `共 ${visible.length} 台`;
    elements.empty.hidden = visible.length > 0;
    elements.cards.hidden = visible.length === 0;
  }

  function renderMapOptions() {
    const running = fleet.filter(robot => robot.status === 'RUNNING');
    elements.mapSelect.innerHTML = '<option value="all">全部运行中 AGV</option>' + running.map(robot => `<option value="${robot.code}">${robot.code}</option>`).join('');
    if (selectedRobot !== 'all' && !running.some(robot => robot.code === selectedRobot)) selectedRobot = 'all';
    elements.mapSelect.value = selectedRobot;
    renderMapRoutes();
  }

  function renderMapRoutes() {
    const running = fleet.filter(robot => robot.status === 'RUNNING');
    const shown = selectedRobot === 'all' ? running : running.filter(robot => robot.code === selectedRobot);
    document.querySelectorAll('[data-fleet-robot]').forEach(route => {
      const visible = shown.some(robot => robot.code === route.dataset.fleetRobot);
      route.hidden = !visible;
      route.classList.toggle('is-filtered-out', !visible);
      route.setAttribute('aria-hidden', String(!visible));
    });
    elements.pointLayer.hidden = selectedRobot !== 'all';
    elements.mapCount.textContent = `${shown.length} 台显示`;
    elements.mapSummary.textContent = shown.length ? `${shown.map(robot => `${robot.code}（${robot.point}）`).join('、')} 的当前位置与规划路线` : '当前没有运行中的 AGV';
    elements.legend.innerHTML = shown.map(robot => `<span class="fleet-legend-item" style="--legend:${robot.routeColor}"><i></i>${robot.code}</span>`).join('');
  }

  function selectRobot(code) {
    const robot = fleet.find(item => item.code === code);
    if (!robot) return;
    selectedRobot = robot.status === 'RUNNING' ? code : 'all';
    elements.mapSelect.value = selectedRobot;
    renderMapRoutes();
    renderFleetCards();
    document.querySelector('.fleet-map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideTooltip() {
    elements.tooltip.hidden = true;
  }

  function showTooltip(label, anchor) {
    elements.tooltip.textContent = label;
    elements.tooltip.hidden = false;
    elements.tooltip.style.left = '0px';
    elements.tooltip.style.top = '0px';
    const mapRect = elements.mapArt.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const width = elements.tooltip.offsetWidth;
    const height = elements.tooltip.offsetHeight;
    const center = anchorRect.left + anchorRect.width / 2 - mapRect.left;
    const padding = 8;
    const left = Math.max(padding, Math.min(center - width / 2, mapRect.width - width - padding));
    const top = Math.max(padding, anchorRect.top - mapRect.top - height - 10);
    elements.tooltip.style.left = `${left}px`;
    elements.tooltip.style.top = `${top}px`;
    elements.tooltip.style.setProperty('--tooltip-arrow-x', `${Math.max(12, Math.min(center - left, width - 12))}px`);
  }

  function renderPoints(detail) {
    hideTooltip();
    elements.pointLayer.replaceChildren();
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const machines = new Map((Array.isArray(detail?.machines) ? detail.machines : []).map(machine => [machine.id, machine]));
    const points = (Array.isArray(detail?.points) ? detail.points : []).map(point => {
      let x = Number(point.x), y = Number(point.y), note = point.frame || 'MAP';
      if (point.frame === 'MACHINE') {
        const machine = machines.get(point.machineId);
        if (!machine) return null;
        const radians = number(machine.anchorYaw) * Math.PI / 180;
        const rotatedX = x * Math.cos(radians) - y * Math.sin(radians);
        const rotatedY = x * Math.sin(radians) + y * Math.cos(radians);
        x = number(machine.anchorX) + rotatedX;
        y = number(machine.anchorY) + rotatedY;
        note = 'MACHINE → MAP';
      }
      return Number.isFinite(x) && Number.isFinite(y) ? { ...point, x, y, note } : null;
    }).filter(Boolean);
    points.forEach(point => {
      const group = document.createElementNS(SVG_NS, 'g');
      const shape = document.createElementNS(SVG_NS, 'path');
      const y = 551 - point.y;
      const label = `点位 ID ${point.id} · ${point.name || point.code || point.id} · X ${point.x} / Y ${point.y} · ${point.note}`;
      group.setAttribute('class', 'fleet-point-node');
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'button');
      group.setAttribute('aria-label', label);
      shape.setAttribute('class', 'fleet-map-point');
      shape.setAttribute('d', `M ${point.x} ${y - 8} L ${point.x + 8} ${y} L ${point.x} ${y + 8} L ${point.x - 8} ${y} Z`);
      group.appendChild(shape);
      group.addEventListener('pointerenter', () => showTooltip(label, shape));
      group.addEventListener('pointerleave', hideTooltip);
      group.addEventListener('focus', () => showTooltip(label, shape));
      group.addEventListener('blur', hideTooltip);
      group.addEventListener('click', () => window.showToast?.(label));
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.showToast?.(label); }
      });
      elements.pointLayer.appendChild(group);
    });
  }

  async function loadMap() {
    elements.mapState.hidden = false;
    elements.mapState.textContent = '地图加载中…';
    try {
      const labResult = await getLaboratory({ baseUrl: apiBaseUrl, timeout: 30000 });
      const lab = labResult.data;
      const config = lab?.published || lab?.draft;
      const configId = config?.configId ?? config?.id;
      if (!configId) throw new Error('暂无可用实验室配置');
      const detailResult = await getLaboratoryConfig(configId, { baseUrl: apiBaseUrl, timeout: 30000 });
      const detail = detailResult.data;
      elements.mapVersion.textContent = `地图版本 ${detail?.revision || config?.revision || '--'}`;
      renderPoints(detail || {});
      elements.mapState.hidden = true;
    } catch (error) {
      console.error('加载多 AGV 地图失败', error);
      elements.mapState.textContent = '实时地图数据暂不可用，当前显示本地地图';
      setTimeout(() => { elements.mapState.hidden = true; }, 2400);
    }
  }

  async function loadOverview() {
    try {
      const result = await getDashboardOverview({ baseUrl: apiBaseUrl, timeout: 30000 });
      const overview = result.data || {};
      const agv = overview.agvStatus || {};
      if (agv.agvCode || agv.code) {
        fleet[0] = {
          ...fleet[0], code: agv.agvCode || agv.code, online: Boolean(agv.online),
          status: normalizeStatus(agv.executionStatus, agv.online),
          battery: Math.max(0, Math.min(100, number(agv.batteryPercent, fleet[0].battery))),
          point: agv.currentPointName || agv.currentPointCode || agv.currentLocation || fleet[0].point
        };
      }
      renderMetrics(overview);
    } catch (error) {
      console.error('加载车队总览失败', error);
      renderMetrics(null);
    }
    renderFleetCards();
    renderMapOptions();
  }

  elements.search.addEventListener('input', renderFleetCards);
  elements.filter.addEventListener('change', renderFleetCards);
  elements.searchButton.addEventListener('click', renderFleetCards);
  elements.reset.addEventListener('click', () => { elements.search.value = ''; elements.filter.value = 'all'; renderFleetCards(); elements.search.focus(); });
  elements.mapSelect.addEventListener('change', () => { selectedRobot = elements.mapSelect.value; renderMapRoutes(); renderFleetCards(); });
  elements.cards.addEventListener('click', event => { const card = event.target.closest('[data-robot-code]'); if (card) selectRobot(card.dataset.robotCode); });
  elements.cards.addEventListener('keydown', event => { const card = event.target.closest('[data-robot-code]'); if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectRobot(card.dataset.robotCode); } });
  root.querySelectorAll('[data-fleet-scroll]').forEach(button => button.addEventListener('click', () => elements.cards.scrollBy({ left: number(button.dataset.fleetScroll) * 580, behavior: 'smooth' })));
  window.addEventListener('resize', hideTooltip, { passive: true });
  renderMetrics(null);
  renderFleetCards();
  renderMapOptions();
  Promise.allSettled([loadOverview(), loadMap()]);
  window.__dashboardFleet = { get fleet() { return fleet; }, reload: () => Promise.allSettled([loadOverview(), loadMap()]) };
})();
