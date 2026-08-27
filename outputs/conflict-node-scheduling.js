(function () {
  'use strict';

  const orders = [
    { id: 'ORD-20260826-001', agv: 'AGV-01', name: '贴标物料转运', route: '智能仓储 → 贴标机台', resource: '贴标机台 / 自动门-01', priority: '紧急', tone: 'urgent' },
    { id: 'ORD-20260826-002', agv: 'AGV-02', name: '手套箱取料', route: '手套箱 → 投料工作站', resource: '手套箱 / 投料工作站', priority: '高', tone: 'high' },
    { id: 'ORD-20260826-003', agv: 'AGV-03', name: '样本跨区转运', route: '东区 → 西区', resource: '窄通道C01 / 自动门-01', priority: '普通', tone: 'normal' },
    { id: 'ORD-20260826-004', agv: 'AGV-04', name: '跨层物料转运', route: '1F → 2F', resource: '电梯-01W / 窄通道C01', priority: '高', tone: 'high' },
    { id: 'ORD-20260826-005', agv: 'AGV-05', name: '反应样本投料', route: '缓存区 → 投料工作站', resource: '投料工作站 / 电梯-01W', priority: '普通', tone: 'normal' },
    { id: 'ORD-20260826-006', agv: 'AGV-06', name: '待检样本转运', route: '东区 → 西区', resource: '窄通道C01 / 自动门-01', priority: '低', tone: 'low' }
  ];
  const defaultStart = '2026-08-26T09:00';
  const defaultEnd = '2026-08-26T09:40';
  const maxRangeDuration = 12 * 60 * 60 * 1000;
  const toast = document.getElementById('toast');
  const rangeStart = document.getElementById('rangeStart');
  const rangeEnd = document.getElementById('rangeEnd');
  const timeline = document.getElementById('scheduleTimeline');
  const timeAxis = document.getElementById('timeAxis');
  const nowLine = document.querySelector('.now-line');
  const orderRows = document.getElementById('orderRows');
  const priorityList = document.getElementById('priorityList');
  const priorityEmpty = document.getElementById('priorityEmpty');
  const selectedOrderCount = document.getElementById('selectedOrderCount');
  const selectAllOrders = document.getElementById('selectAllOrders');
  const clearSelectedOrders = document.getElementById('clearSelectedOrders');
  const rescheduleOrders = document.getElementById('rescheduleOrders');
  const scheduleState = document.getElementById('scheduleState');
  const timelineResult = document.getElementById('timelineResult');
  const toggleOrderSchedule = document.getElementById('toggleOrderSchedule');
  const orderScheduleBody = document.getElementById('orderScheduleBody');
  let selectedOrderIds = [];
  let draggingOrderId = '';
  let toastTimer;
  let currentAxisStart = new Date(defaultStart);
  let currentAxisEnd = new Date(defaultEnd);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function openLayer(id) {
    const layer = document.getElementById(id);
    if (!layer) return;
    layer.hidden = false;
    requestAnimationFrame(function () { layer.classList.add('open'); });
  }

  function closeLayer(id) {
    const layer = document.getElementById(id);
    if (!layer) return;
    layer.classList.remove('open');
    setTimeout(function () { layer.hidden = true; }, 220);
  }

  function orderById(id) {
    return orders.find(function (order) { return order.id === id; });
  }

  function moveIcon(direction) {
    const path = direction === 'up' ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
  }

  function renderOrderRows() {
    orderRows.innerHTML = orders.map(function (order) {
      const checked = selectedOrderIds.includes(order.id);
      return '<label class="order-row' + (checked ? ' selected' : '') + '" data-order-id="' + order.id + '">' +
        '<input type="checkbox" value="' + order.id + '"' + (checked ? ' checked' : '') + ' aria-label="选择订单 ' + order.id + '">' +
        '<span class="order-main"><strong>' + order.id + '</strong><small>' + order.agv + ' · ' + order.name + ' · ' + order.route + '</small></span>' +
        '<span class="order-resource">' + order.resource + '</span>' +
        '<span class="order-priority ' + order.tone + '">' + order.priority + '</span>' +
      '</label>';
    }).join('');
    selectAllOrders.checked = selectedOrderIds.length === orders.length;
    selectAllOrders.indeterminate = selectedOrderIds.length > 0 && selectedOrderIds.length < orders.length;
  }

  function renderPriorityQueue() {
    const count = selectedOrderIds.length;
    selectedOrderCount.textContent = count + ' 个';
    priorityEmpty.hidden = count !== 0;
    priorityList.hidden = count === 0;
    priorityList.innerHTML = selectedOrderIds.map(function (id, index) {
      const order = orderById(id);
      return '<li draggable="true" data-priority-id="' + id + '">' +
        '<span class="drag-handle" title="拖拽调整顺序">⠿</span>' +
        '<b>' + (index + 1) + '</b>' +
        '<span><strong>' + order.id + '</strong><small>' + order.agv + ' · ' + order.name + '</small></span>' +
        '<div class="priority-move-actions"><button type="button" data-move-order="up" aria-label="上移 ' + order.id + '"' + (index === 0 ? ' disabled' : '') + '>' + moveIcon('up') + '</button><button type="button" data-move-order="down" aria-label="下移 ' + order.id + '"' + (index === count - 1 ? ' disabled' : '') + '>' + moveIcon('down') + '</button></div>' +
      '</li>';
    }).join('');
    clearSelectedOrders.disabled = count === 0;
    rescheduleOrders.disabled = count < 2;
    scheduleState.textContent = count < 2 ? (count ? '还需选择 1 个订单' : '等待选择订单') : '已选择 ' + count + ' 个订单';
    scheduleState.className = 'schedule-state' + (count >= 2 ? ' ready' : '');
    renderOrderRows();
  }

  function setOrderSelected(id, selected) {
    if (selected && !selectedOrderIds.includes(id)) selectedOrderIds.push(id);
    if (!selected) selectedOrderIds = selectedOrderIds.filter(function (item) { return item !== id; });
    renderPriorityQueue();
  }

  function moveSelectedOrder(id, direction) {
    const index = selectedOrderIds.indexOf(id);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedOrderIds.length) return;
    const nextIds = selectedOrderIds.slice();
    const swapped = nextIds[nextIndex];
    nextIds[nextIndex] = id;
    nextIds[index] = swapped;
    selectedOrderIds = nextIds;
    renderPriorityQueue();
  }

  function resetTimelineOrder() {
    document.querySelectorAll('.timeline-row[data-agv]').forEach(function (row) {
      row.classList.remove('rescheduled');
      row.removeAttribute('data-priority');
      row.querySelectorAll('.task').forEach(function (task) {
        if (task.dataset.originalStart) task.style.setProperty('--start', task.dataset.originalStart);
        task.classList.remove('is-rescheduled');
      });
    });
    timelineResult.textContent = '当前按系统默认优先级展示';
  }

  function applyReschedule() {
    if (selectedOrderIds.length < 2) {
      showToast('请至少选择 2 个订单后再排程');
      return;
    }
    const slots = [0.45, 1.75, 3.05, 4.35, 5.65, 6.95];
    resetTimelineOrder();
    selectedOrderIds.forEach(function (id, index) {
      const order = orderById(id);
      const row = document.querySelector('.timeline-row[data-agv="' + order.agv + '"]');
      if (!row) return;
      const tasks = Array.from(row.querySelectorAll('.task'));
      const originalStarts = tasks.map(function (task) { return Number(task.dataset.originalStart); });
      const firstStart = Math.min.apply(Math, originalStarts);
      tasks.forEach(function (task) {
        const relativeStart = Number(task.dataset.originalStart) - firstStart;
        task.style.setProperty('--start', String(Math.min(10.7, slots[index] + relativeStart)));
        task.classList.add('is-rescheduled');
      });
      row.classList.add('rescheduled');
      row.dataset.priority = String(index + 1);
    });
    scheduleState.textContent = '已重新排程 · ' + selectedOrderIds.length + ' 个订单';
    scheduleState.className = 'schedule-state done';
    timelineResult.textContent = '订单排程顺序：' + selectedOrderIds.map(function (id) { return orderById(id).agv; }).join(' → ');
    scheduleState.removeAttribute('title');
    showToast('已按当前优先级重新生成 AGV 时序');
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
  }

  function inputDateTime(value) {
    const offset = value.getTimezoneOffset();
    const local = new Date(value.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  function syncEndTimeLimit(adjustValue) {
    const start = new Date(rangeStart.value);
    if (!Number.isFinite(start.getTime())) return;
    const maximum = new Date(start.getTime() + maxRangeDuration);
    rangeEnd.min = rangeStart.value;
    rangeEnd.max = inputDateTime(maximum);
    const end = new Date(rangeEnd.value);
    if (adjustValue && (!Number.isFinite(end.getTime()) || end <= start || end - start > maxRangeDuration)) {
      rangeEnd.value = inputDateTime(new Date(start.getTime() + 40 * 60 * 1000));
    }
  }

  function updateNowLine(ratio, label, activeIndex) {
    const value = Math.max(0, Math.min(1, ratio));
    timeline.style.setProperty('--now-position', value);
    nowLine.querySelector('span').textContent = label;
    nowLine.setAttribute('aria-label', '当前选择时间 ' + label);
    timeAxis.querySelectorAll('.time-cell').forEach(function (cell, index) { cell.classList.toggle('active', index === activeIndex); });
  }

  function renderTimeAxis(startValue, endValue, markerRatio) {
    const ratio = markerRatio === undefined ? 0.3 : markerRatio;
    const start = new Date(startValue);
    const end = new Date(endValue);
    const duration = end - start;
    if (!Number.isFinite(duration) || duration <= 0) {
      showToast('结束时间必须晚于开始时间');
      return false;
    }
    if (duration > maxRangeDuration) {
      showToast('时间范围最多选择 12 小时');
      return false;
    }
    currentAxisStart = start;
    currentAxisEnd = end;
    const fiveMinutes = 5 * 60 * 1000;
    const tickCount = Math.min(13, Math.max(2, Math.floor(duration / fiveMinutes) + 1));
    const step = duration / (tickCount - 1);
    timeline.style.setProperty('--time-columns', tickCount);
    timeline.style.setProperty('--time-step', 100 / tickCount + '%');
    timeline.style.minWidth = Math.max(920, 112 + tickCount * 88) + 'px';
    timeAxis.innerHTML = '<span class="axis-spacer"></span>';
    for (let index = 0; index < tickCount; index += 1) {
      const time = new Date(start.getTime() + step * index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-cell';
      button.textContent = formatTime(time);
      button.title = '点击刻度任意位置定位时间';
      timeAxis.appendChild(button);
    }
    const marker = new Date(start.getTime() + duration * ratio);
    updateNowLine(ratio, formatTime(marker));
    return true;
  }

  function locateTimelineAt(clientX) {
    const rect = timeAxis.getBoundingClientRect();
    const trackLeft = rect.left + 112;
    const trackWidth = rect.width - 112;
    if (clientX < trackLeft || clientX > rect.right || trackWidth <= 0) return;
    const rawRatio = (clientX - trackLeft) / trackWidth;
    const duration = currentAxisEnd - currentAxisStart;
    const minute = 60 * 1000;
    const roundedTime = Math.round((currentAxisStart.getTime() + duration * rawRatio) / minute) * minute;
    const clampedTime = Math.max(currentAxisStart.getTime(), Math.min(currentAxisEnd.getTime(), roundedTime));
    updateNowLine((clampedTime - currentAxisStart.getTime()) / duration, formatTime(new Date(clampedTime)));
  }

  orderRows.addEventListener('change', function (event) {
    if (!event.target.matches('input[type="checkbox"]')) return;
    setOrderSelected(event.target.value, event.target.checked);
  });
  selectAllOrders.addEventListener('change', function () {
    selectedOrderIds = selectAllOrders.checked ? orders.map(function (order) { return order.id; }) : [];
    renderPriorityQueue();
  });
  priorityList.addEventListener('click', function (event) {
    const button = event.target.closest('[data-move-order]');
    const item = event.target.closest('[data-priority-id]');
    if (!button || !item) return;
    moveSelectedOrder(item.dataset.priorityId, button.dataset.moveOrder);
  });
  priorityList.addEventListener('dragstart', function (event) {
    const item = event.target.closest('[data-priority-id]');
    if (!item) return;
    draggingOrderId = item.dataset.priorityId;
    item.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  });
  priorityList.addEventListener('dragend', function () {
    draggingOrderId = '';
    priorityList.querySelectorAll('.dragging,.drag-over').forEach(function (item) { item.classList.remove('dragging', 'drag-over'); });
  });
  priorityList.addEventListener('dragover', function (event) {
    event.preventDefault();
    priorityList.querySelectorAll('.drag-over').forEach(function (item) { item.classList.remove('drag-over'); });
    const target = event.target.closest('[data-priority-id]');
    if (target && target.dataset.priorityId !== draggingOrderId) target.classList.add('drag-over');
  });
  priorityList.addEventListener('drop', function (event) {
    event.preventDefault();
    const target = event.target.closest('[data-priority-id]');
    if (!target || !draggingOrderId || target.dataset.priorityId === draggingOrderId) return;
    const fromIndex = selectedOrderIds.indexOf(draggingOrderId);
    const targetIndex = selectedOrderIds.indexOf(target.dataset.priorityId);
    const targetRect = target.getBoundingClientRect();
    const insertAfter = event.clientY > targetRect.top + targetRect.height / 2;
    const nextIds = selectedOrderIds.slice();
    nextIds.splice(fromIndex, 1);
    let insertIndex = targetIndex + (insertAfter ? 1 : 0);
    if (fromIndex < insertIndex) insertIndex -= 1;
    nextIds.splice(insertIndex, 0, draggingOrderId);
    selectedOrderIds = nextIds;
    renderPriorityQueue();
  });

  toggleOrderSchedule.addEventListener('click', function () {
    const expanded = toggleOrderSchedule.getAttribute('aria-expanded') === 'true';
    toggleOrderSchedule.setAttribute('aria-expanded', String(!expanded));
    toggleOrderSchedule.querySelector('span').textContent = expanded ? '展开' : '收起';
    orderScheduleBody.hidden = expanded;
    toggleOrderSchedule.closest('.order-schedule-card').classList.toggle('collapsed', expanded);
  });

  clearSelectedOrders.addEventListener('click', function () {
    selectedOrderIds = [];
    renderPriorityQueue();
    showToast('已清空选中订单');
  });
  rescheduleOrders.addEventListener('click', applyReschedule);
  document.getElementById('searchSchedule').addEventListener('click', function () {
    if (renderTimeAxis(rangeStart.value, rangeEnd.value)) showToast('时间轴已切换到所选时间范围');
  });
  document.getElementById('resetSchedule').addEventListener('click', function () {
    rangeStart.value = defaultStart;
    rangeEnd.value = defaultEnd;
    selectedOrderIds = [];
    syncEndTimeLimit(false);
    renderTimeAxis(defaultStart, defaultEnd);
    resetTimelineOrder();
    renderPriorityQueue();
    showToast('时间范围和订单排程已重置');
  });
  rangeStart.addEventListener('change', function () { syncEndTimeLimit(true); });
  timeAxis.addEventListener('click', function (event) { locateTimelineAt(event.clientX); });

  document.getElementById('statusBtn')?.addEventListener('click', function () { openLayer('statusModal'); });
  document.getElementById('alertBtn')?.addEventListener('click', function () { openLayer('alertDrawer'); });
  document.querySelectorAll('[data-close]').forEach(function (button) { button.addEventListener('click', function () { closeLayer(button.dataset.close); }); });
  document.querySelectorAll('.modal-overlay,.drawer-overlay').forEach(function (layer) { layer.addEventListener('click', function (event) { if (event.target === layer) closeLayer(layer.id); }); });
  document.querySelectorAll('.task').forEach(function (task) {
    task.tabIndex = -1;
    task.setAttribute('aria-disabled', 'true');
    task.dataset.originalStart = task.style.getPropertyValue('--start').trim();
  });

  syncEndTimeLimit(false);
  renderTimeAxis(defaultStart, defaultEnd);
  renderPriorityQueue();
}());
