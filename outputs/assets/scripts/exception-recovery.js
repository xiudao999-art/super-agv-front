const alarmRecords = [
  {
    id: 'ALM-20260817-0042',
    time: '2026-08-17 09:42:18',
    level: '严重',
    status: '待处理',
    type: '任务执行',
    code: 'TASK-PERMIT-TIMEOUT',
    source: '任务引擎',
    object: '贴标机台进样许可',
    space: '实验室 A',
    order: 'MES-20260817-0068',
    task: 'TRN-0068-02',
    robot: 'AGV-01',
    message: '机台允许进样事件等待超过流程配置的 30 秒',
    impact: '运输任务保持在 W-B01；贴标机台进样位继续预约；后续同目标任务暂停派发。',
    owner: '陈工',
    count: 3,
    first: '2026-08-17 09:41:18',
    updated: '2026-08-17 09:42:18',
    suggestion: '确认机台安全状态和许可信号；信号恢复后从等待许可检查点继续，禁止重复搬运动作。',
    evidence: '许可输入连续 30 秒未变化，AGV 已停在安全等待点 W-B01，载具位置与系统记录一致。',
    protection: ['冻结当前运输任务', '保留目标机台预约', '暂停同目标任务派发'],
    steps: ['核对贴标机台是否处于安全可进样状态', '确认许可信号和现场载具位置一致', '选择从当前检查点继续或转人工处置', '填写处理结果并释放受影响资源']
  },
  {
    id: 'ALM-20260817-0041',
    time: '2026-08-17 09:36:54',
    level: '警告',
    status: '处理中',
    type: '库位一致性',
    code: 'LOCATION-STATE-MISMATCH',
    source: '库位服务',
    object: '库位 A 第 4 层 07 位',
    space: '实验室 A',
    order: '—',
    task: '—',
    robot: '—',
    message: '系统记录为空，但库位传感器检测有物',
    impact: '库位 A-04-07 已锁定，不再分配新的入库或取料任务；同层其他库位不受影响。',
    owner: '王工',
    count: 1,
    first: '2026-08-17 09:36:54',
    updated: '2026-08-17 09:39:07',
    suggestion: '操作员现场扫码确认载具；如需改写物理位置记录，必须由管理员审批。',
    evidence: '占位传感器持续有物，系统无在途任务、无机器人占用该库位。',
    protection: ['锁定异常库位', '阻止新增占用', '保留现场传感器快照'],
    steps: ['现场确认库位和载具标签', '比对系统库存与传感器状态', '按扫码结果补记或清理占用', '复核后解除库位锁定']
  },
  {
    id: 'ALM-20260817-0040',
    time: '2026-08-17 09:31:12',
    level: '警告',
    status: '已确认',
    type: '设备通信',
    code: 'DEVICE-LINK-UNSTABLE',
    source: '机器人连接服务',
    object: '相机 VISION-01',
    space: '实验室 A',
    order: 'MES-20260817-0065',
    task: 'TRN-0065-01',
    robot: 'AGV-01',
    message: '相机设备在 60 秒内出现 3 次短时断连',
    impact: '需要视觉确认的动作暂停在拍照前检查点，AGV 保持当前位置，其余无需视觉的任务可继续。',
    owner: '李工',
    count: 3,
    first: '2026-08-17 09:29:43',
    updated: '2026-08-17 09:35:26',
    suggestion: '检查相机供电、网络与心跳；链路稳定后重新执行视觉确认，不重做前序搬运动作。',
    evidence: '设备心跳三次中断后均自动恢复，最后一次恢复后已稳定在线 4 分钟。',
    protection: ['暂停视觉相关动作', '保持 AGV 安全位置', '保留最近三次心跳日志'],
    steps: ['确认相机在线并完成自检', '检查最近一次图像和设备时间戳', '仅重试视觉确认动作', '记录链路恢复结果']
  },
  {
    id: 'ALM-20260817-0039',
    time: '2026-08-17 09:20:03',
    level: '提示',
    status: '已恢复',
    type: '外围资源',
    code: 'DOOR-OPEN-DELAY',
    source: '自动门适配器',
    object: '自动门 D-01',
    space: '实验室 A',
    order: 'MES-20260817-0061',
    task: 'TRN-0061-03',
    robot: 'AGV-01',
    message: '自动门打开反馈延迟 8 秒后恢复',
    impact: 'AGV 在门前等待区短暂停留，任务未中断。',
    owner: '系统自动处理',
    count: 1,
    first: '2026-08-17 09:20:03',
    updated: '2026-08-17 09:20:11',
    suggestion: '无需人工处理，持续观察自动门反馈延迟。',
    evidence: '开门到位信号已恢复，AGV 安全通过并完成资源释放。',
    protection: ['AGV 停在门前等待区', '保持自动门资源预约', '到位后自动继续任务'],
    steps: ['确认自动门到位信号', '确认 AGV 已安全通过', '归档本次延迟记录']
  },
  {
    id: 'ALM-20260817-0038',
    time: '2026-08-17 08:58:26',
    level: '严重',
    status: '已关闭',
    type: '机器人安全',
    code: 'ROBOT-EMERGENCY-STOP',
    source: '底盘安全服务',
    object: 'AGV-01 急停输入',
    space: '实验室 A',
    order: 'MES-20260817-0058',
    task: 'TRN-0058-01',
    robot: 'AGV-01',
    message: '机器人急停输入触发，运动指令已立即停止',
    impact: 'AGV-01 及其任务已冻结，关联路径和载具保持锁定。',
    owner: '管理员',
    count: 1,
    first: '2026-08-17 08:58:26',
    updated: '2026-08-17 09:08:40',
    suggestion: '现场排除危险后复位急停，执行安全检查并从最近检查点恢复。',
    evidence: '急停输入已复位，底盘安全自检通过，现场由管理员确认。',
    protection: ['停止全部运动指令', '锁定机器人与路径', '冻结关联任务和载具'],
    steps: ['排除现场危险并复位急停', '执行底盘与机械臂安全自检', '管理员确认恢复检查点', '解除锁定并记录处置结果']
  }
];

const recoveryRecords = [
  {
    id: 'REC-20260816-003', type: '系统重启恢复', object: 'TRN-0031-01',
    trigger: '任务执行中检测到系统非正常重启', checkpoint: '等待机台许可前',
    robot: 'AGV-01 位于 W-B01，载具 TRAY-000238 在 C01',
    upstream: 'MES 订单处理中，完成回调未发送',
    decision: '现场状态与检查点一致，可继续等待许可', status: '可自动继续', result: '从等待许可检查点安全继续'
  },
  {
    id: 'REC-20260816-002', type: '库位状态核对', object: 'A-04-07',
    trigger: '系统记录为空，但传感器检测有物', checkpoint: '库位已锁定，未分配新任务',
    robot: '无机器人占用该库位', upstream: '上游无正在使用该库位的任务',
    decision: '需要操作员扫码确认；如需改载具位置，由管理员审批', status: '等待人工核对', result: '保持锁定，等待现场扫码与审批'
  },
  {
    id: 'REC-20260816-001', type: '上游结果补发', object: 'SYS-ORD-0030',
    trigger: '任务已完成，但上游确认超时', checkpoint: '动作链和载具位置已完成并固化',
    robot: 'AGV-01 空闲，物理动作无需重做', upstream: '结果回调未确认，幂等键可安全重发',
    decision: '只补发结果通知，不重复执行任何机器人动作', status: '补发完成', result: '使用原幂等键补发结果通知'
  }
];

const activeStatuses = new Set(['待处理', '处理中', '已确认']);
const page = document.body.dataset.recoveryPage;
let currentAlarmId = '';
let selectedRecoveryId = recoveryRecords[0].id;
let toastTimer;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, function (character) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character];
  });
}

function levelTone(level) {
  if (level === '严重') return 'danger';
  if (level === '警告') return 'warning';
  return 'info';
}

function statusTone(status) {
  if (['已恢复', '已关闭', '补发完成', '已完成'].includes(status)) return 'success';
  if (['待处理'].includes(status)) return 'danger';
  if (['等待人工核对', '待人工处理'].includes(status)) return 'warning';
  if (['处理中', '已确认', '可自动继续'].includes(status)) return 'info';
  return 'neutral';
}

function levelTag(level) {
  return '<span class="severity-tag severity-' + levelTone(level) + '">' + escapeHtml(level) + '</span>';
}

function statusTag(status) {
  return '<span class="status-tag status-' + statusTone(status) + '">' + escapeHtml(status) + '</span>';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2300);
}

function clearFormValues(form) {
  if (!form) return;
  form.reset();
  form.querySelectorAll('input, select, textarea').forEach(function (control) {
    if (control.type === 'checkbox' || control.type === 'radio') {
      control.checked = false;
    } else if (control.tagName === 'SELECT') {
      control.selectedIndex = 0;
    } else {
      control.value = '';
    }
  });
}

function openLayer(id) {
  const layer = document.getElementById(id);
  if (!layer) return;
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(function () { layer.classList.add('open'); });
}

function closeLayer(id) {
  const layer = document.getElementById(id);
  if (!layer) return;
  layer.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(function () { layer.hidden = true; }, 190);
}

function ensureCommonLayers() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="statusModal" hidden>
      <section class="status-modal" role="dialog" aria-modal="true" aria-labelledby="statusModalTitle">
        <header class="modal-header"><div><h2 id="statusModalTitle">系统运行状态</h2><p>颜色用于说明系统整体运行能力，不代表单条告警等级</p></div><button class="modal-x" type="button" data-close="statusModal" aria-label="关闭">×</button></header>
        <div class="modal-body"><div class="status-list">
          <article class="status-item"><strong>绿色 · 系统正常</strong><p>核心服务、数据库、任务引擎和机器人连接正常。</p></article>
          <article class="status-item"><strong>黄色 · 受限运行</strong><p>部分设备或上游接口异常，系统仍可继续部分业务。</p></article>
          <article class="status-item"><strong>红色 · 系统异常</strong><p>核心能力异常，系统暂停接收和分配新任务。</p></article>
          <article class="status-item"><strong>灰色 · 维护模式</strong><p>系统处于人工维护、升级或硬件调试状态。</p></article>
        </div><div class="modal-actions"><button class="modal-close" type="button" data-close="statusModal">关闭</button></div></div>
      </section>
    </div>
    <div class="alert-overlay" id="alertDrawer" hidden>
      <aside class="alert-drawer" role="dialog" aria-modal="true" aria-labelledby="alertDrawerTitle">
        <header class="alert-header"><h2 id="alertDrawerTitle">异常提醒</h2><p>3 条未完成 · 1 条严重</p></header>
        <div class="alert-feed">
          ${alarmRecords.filter(function (record) { return activeStatuses.has(record.status); }).map(function (record) {
            return '<article class="alert-card"><strong>' + escapeHtml(record.message) + '</strong><p>' + escapeHtml(record.id) + ' · ' + escapeHtml(record.status) + ' · ' + escapeHtml(record.owner) + '</p></article>';
          }).join('')}
        </div>
        <footer class="alert-footer"><button class="primary-action" id="openExceptionPage" type="button">进入异常与恢复</button></footer>
      </aside>
    </div>
  `);

  document.getElementById('statusInfoBtn')?.addEventListener('click', function () { openLayer('statusModal'); });
  document.getElementById('alertInfoBtn')?.addEventListener('click', function () { openLayer('alertDrawer'); });
  document.getElementById('openExceptionPage')?.addEventListener('click', function () { location.href = 'exception-recovery.html'; });
}

function bindCommonEvents() {
  document.addEventListener('click', function (event) {
    const close = event.target.closest('[data-close]');
    if (close) closeLayer(close.dataset.close);
    if (event.target.classList.contains('modal-overlay') || event.target.classList.contains('alert-overlay')) closeLayer(event.target.id);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const open = document.querySelector('.modal-overlay.open, .alert-overlay.open');
    if (open) closeLayer(open.id);
  });
}

function findAlarm(id) {
  return alarmRecords.find(function (record) { return record.id === id; });
}

function renderCurrentAnomalies() {
  const body = document.getElementById('anomalyBody');
  const records = alarmRecords.filter(function (record) { return activeStatuses.has(record.status); });
  document.getElementById('activeAnomalyCount').textContent = records.length + ' 项待跟进';
  document.getElementById('anomalySummary').textContent = '共 ' + records.length + ' 条，点击任意一行查看影响范围与恢复方式';
  body.innerHTML = records.length ? records.map(function (record) {
    return '<tr class="clickable-row" data-alarm-id="' + record.id + '">' +
      '<td><span class="table-primary">' + escapeHtml(record.id) + '</span></td>' +
      '<td>' + escapeHtml(record.time) + '</td>' +
      '<td>' + levelTag(record.level) + '</td>' +
      '<td>' + escapeHtml(record.type) + '</td>' +
      '<td>' + escapeHtml(record.object) + '</td>' +
      '<td class="message-cell"><strong title="' + escapeHtml(record.message) + '">' + escapeHtml(record.message) + '</strong><span class="table-secondary">' + escapeHtml(record.code) + '</span></td>' +
      '<td>' + escapeHtml(record.owner) + '</td>' +
      '<td>' + statusTag(record.status) + '</td></tr>';
  }).join('') : '<tr><td class="empty-state" colspan="8">当前没有需要跟进的异常</td></tr>';

  body.querySelectorAll('[data-alarm-id]').forEach(function (row) {
    row.addEventListener('click', function () { openAnomalyDetail(row.dataset.alarmId); });
  });
}

function setText(id, value) {
  const target = document.getElementById(id);
  if (target) target.textContent = value || '—';
}

function openAnomalyDetail(id) {
  const record = findAlarm(id);
  if (!record) return;
  currentAlarmId = id;
  setText('anomalyModalSubtitle', record.id + ' · ' + record.time);
  setText('anomalyMessage', record.message);
  setText('anomalyCode', record.code + ' · ' + record.source);
  setText('anomalyObject', record.object);
  setText('anomalyImpact', record.impact);
  setText('anomalyAssociation', [record.order, record.task, record.robot].join(' / '));
  setText('anomalyOwner', record.owner);
  setText('anomalyUpdated', record.updated);
  setText('anomalyEvidence', record.evidence);
  document.getElementById('anomalyLevel').innerHTML = levelTag(record.level);
  document.getElementById('anomalyState').innerHTML = statusTag(record.status);
  const summary = document.getElementById('exceptionSummary');
  summary.classList.toggle('warning', record.level !== '严重');
  document.getElementById('protectionStrip').innerHTML = record.protection.map(function (item, index) {
    return '<article class="protection-item"><strong>保护措施 ' + (index + 1) + '</strong><p>' + escapeHtml(item) + '</p></article>';
  }).join('');
  document.getElementById('suggestionList').innerHTML = record.steps.map(function (step) { return '<li>' + escapeHtml(step) + '</li>'; }).join('');
  setText('anomalySuggestion', record.suggestion);
  resetAnomalyForms();
  openLayer('anomalyModal');
}

function resetAnomalyForms() {
  document.querySelectorAll('.route-card').forEach(function (card) { card.classList.remove('active'); });
  document.querySelectorAll('.route-panel').forEach(function (panel) { panel.hidden = true; });
  document.getElementById('resultPanel').hidden = true;
  clearFormValues(document.getElementById('directResumeForm'));
  clearFormValues(document.getElementById('manualRecoveryForm'));
  clearFormValues(document.getElementById('anomalyResultForm'));
  updateDirectButton();
}

function selectRoute(route) {
  document.querySelectorAll('.route-card').forEach(function (card) { card.classList.toggle('active', card.dataset.route === route); });
  document.querySelectorAll('.route-panel').forEach(function (panel) { panel.hidden = panel.dataset.routePanel !== route; });
}

function updateDirectButton() {
  const button = document.getElementById('confirmDirectResume');
  if (!button) return;
  button.disabled = !document.getElementById('resumePosition')?.value || !document.getElementById('resumeConfirmed')?.checked;
}

function finishAnomaly(status, message) {
  const record = findAlarm(currentAlarmId);
  if (!record) return;
  record.status = status;
  record.updated = new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-');
  closeLayer('anomalyModal');
  renderCurrentAnomalies();
  showToast(message);
}

function initCurrentPage() {
  renderCurrentAnomalies();
  document.querySelectorAll('.route-card').forEach(function (card) {
    card.addEventListener('click', function () { selectRoute(card.dataset.route); });
  });
  document.getElementById('resumePosition')?.addEventListener('change', updateDirectButton);
  document.getElementById('resumeConfirmed')?.addEventListener('change', updateDirectButton);
  document.getElementById('directResumeForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    showToast('已记录安全继续方案，请填写最终处理结果');
    document.getElementById('resultPanel').hidden = false;
    document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('manualRecoveryForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    showToast('已记录人工处置方案，请填写最终处理结果');
    document.getElementById('resultPanel').hidden = false;
    document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('showResultForm')?.addEventListener('click', function () {
    document.getElementById('resultPanel').hidden = false;
    document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('anomalyResultForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    const status = document.getElementById('resultStatus').value;
    finishAnomaly(status, '异常处理结果已提交，记录已转入告警历史');
  });
}

function getFilteredAlarms() {
  const start = document.getElementById('alarmStart').value;
  const end = document.getElementById('alarmEnd').value;
  const level = document.getElementById('alarmLevel').value;
  const status = document.getElementById('alarmStatus').value;
  const type = document.getElementById('alarmType').value;
  const source = document.getElementById('alarmSource').value;
  const query = document.getElementById('alarmKeyword').value.trim().toLowerCase();
  return alarmRecords.filter(function (record) {
    const recordTime = new Date(record.time.replace(' ', 'T')).getTime();
    return (!start || recordTime >= new Date(start).getTime()) &&
      (!end || recordTime <= new Date(end).getTime()) &&
      (!level || record.level === level) &&
      (!status || record.status === status) &&
      (!type || record.type === type) &&
      (!source || record.source === source) &&
      (!query || [record.id, record.code, record.message, record.object, record.order, record.task, record.robot, record.owner].join(' ').toLowerCase().includes(query));
  });
}

function renderAlarmRecords() {
  const records = getFilteredAlarms();
  const body = document.getElementById('alarmBody');
  body.innerHTML = records.length ? records.map(function (record) {
    return '<tr class="clickable-row" data-alarm-record="' + record.id + '">' +
      '<td><span class="table-primary">' + escapeHtml(record.id) + '</span></td>' +
      '<td>' + escapeHtml(record.time) + '</td>' +
      '<td>' + levelTag(record.level) + '</td>' +
      '<td>' + statusTag(record.status) + '</td>' +
      '<td>' + escapeHtml(record.type) + '</td>' +
      '<td class="message-cell"><strong title="' + escapeHtml(record.message) + '">' + escapeHtml(record.message) + '</strong><span class="table-secondary">' + escapeHtml(record.code) + '</span></td>' +
      '<td>' + escapeHtml(record.source) + '</td>' +
      '<td>' + escapeHtml(record.object) + '</td>' +
      '<td>' + escapeHtml(record.robot) + '</td>' +
      '<td>' + escapeHtml(record.owner) + '</td>' +
      '<td><button class="table-view-button" type="button" data-view-alarm="' + record.id + '" aria-label="查看告警 ' + record.id + '"><svg class="icon"><use href="assets/icons.svg#i-doc"></use></svg>查看</button></td></tr>';
  }).join('') : '<tr><td class="empty-state" colspan="11">没有符合筛选条件的告警记录</td></tr>';
  document.getElementById('alarmRecordSummary').textContent = '共 ' + records.length + ' 条告警记录';
  body.querySelectorAll('[data-alarm-record]').forEach(function (row) {
    row.addEventListener('click', function () { openAlarmRecord(row.dataset.alarmRecord); });
  });
  body.querySelectorAll('[data-view-alarm]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      openAlarmRecord(button.dataset.viewAlarm);
    });
  });
}

function openAlarmRecord(id) {
  const record = findAlarm(id);
  if (!record) return;
  setText('recordModalSubtitle', record.id + ' · ' + record.time);
  setText('recordMessage', record.message);
  setText('recordCode', record.code);
  setText('recordSource', record.source);
  setText('recordObject', record.object);
  setText('recordAssociation', [record.order, record.task, record.robot].join(' / '));
  setText('recordOwner', record.owner);
  setText('recordPeriod', record.first + ' — ' + record.updated);
  setText('recordCount', String(record.count));
  setText('recordImpact', record.impact);
  setText('recordSuggestion', record.suggestion);
  setText('recordEvidence', record.evidence);
  document.getElementById('recordLevel').innerHTML = levelTag(record.level);
  document.getElementById('recordStatus').innerHTML = statusTag(record.status);
  openLayer('alarmRecordModal');
}

function initAlarmPage() {
  renderAlarmRecords();
  document.getElementById('searchAlarms').addEventListener('click', renderAlarmRecords);
  document.getElementById('alarmKeyword').addEventListener('keydown', function (event) { if (event.key === 'Enter') renderAlarmRecords(); });
  document.getElementById('resetAlarms').addEventListener('click', function () {
    document.getElementById('alarmFilters').reset();
    renderAlarmRecords();
  });
}

function renderRecoveryRecords() {
  const body = document.getElementById('recoveryBody');
  body.innerHTML = recoveryRecords.map(function (record) {
    return '<tr class="clickable-row' + (record.id === selectedRecoveryId ? ' selected' : '') + '" data-recovery-id="' + record.id + '">' +
      '<td><span class="table-primary">' + escapeHtml(record.id) + '</span></td>' +
      '<td>' + escapeHtml(record.type) + '</td>' +
      '<td>' + escapeHtml(record.object) + '</td>' +
      '<td>' + escapeHtml(record.trigger) + '</td>' +
      '<td><span class="table-primary">' + escapeHtml(record.decision) + '</span><span class="table-secondary">' + escapeHtml(record.status) + '</span></td></tr>';
  }).join('');
  document.getElementById('recoveryRecordSummary').textContent = '共 ' + recoveryRecords.length + ' 条恢复检查记录';
  body.querySelectorAll('[data-recovery-id]').forEach(function (row) {
    row.addEventListener('click', function () {
      selectedRecoveryId = row.dataset.recoveryId;
      renderRecoveryRecords();
      renderRecoveryProcess();
    });
  });
}

function renderRecoveryProcess() {
  const record = recoveryRecords.find(function (item) { return item.id === selectedRecoveryId; }) || recoveryRecords[0];
  setText('recoveryProcessTitle', record.id + ' · 检查过程');
  setText('recoveryProcessSubtitle', record.type + ' / ' + record.object);
  document.getElementById('recoveryProcessStatus').innerHTML = statusTag(record.status);
  const steps = [
    ['冻结影响范围', '暂停相关任务，锁定涉及的机器人、库位和机台，避免状态继续变化', '已完成'],
    ['读取系统检查点', record.checkpoint, '已完成'],
    ['采集现场与上游状态', record.robot + '；' + record.upstream, '已完成'],
    ['比对并判断', record.decision, record.status],
    ['执行恢复结果', record.result, record.status === '等待人工核对' ? '待人工处理' : '按判断执行']
  ];
  document.getElementById('recoverySteps').innerHTML = steps.map(function (step, index) {
    return '<article class="recovery-step"><span class="step-number">' + (index + 1) + '</span><div><h3>' + escapeHtml(step[0]) + '</h3><p>' + escapeHtml(step[1]) + '</p></div>' + statusTag(step[2]) + '</article>';
  }).join('');
}

function initRecoveryPage() {
  renderRecoveryRecords();
  renderRecoveryProcess();
  document.getElementById('launchRecovery').addEventListener('click', function () {
    clearFormValues(document.getElementById('recoveryLaunchForm'));
    openLayer('recoveryLaunchModal');
  });
  document.getElementById('recoveryLaunchForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextId = 'REC-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + String(recoveryRecords.length + 1).padStart(3, '0');
    recoveryRecords.unshift({
      id: nextId,
      type: form.get('type'),
      object: form.get('object'),
      trigger: form.get('trigger'),
      checkpoint: '等待系统读取最近一次安全检查点',
      robot: '等待采集机器人与现场状态',
      upstream: '等待采集上游系统状态',
      decision: '恢复检查已发起，等待状态比对',
      status: '等待人工核对',
      result: '完成检查后生成恢复结果'
    });
    selectedRecoveryId = nextId;
    closeLayer('recoveryLaunchModal');
    renderRecoveryRecords();
    renderRecoveryProcess();
    showToast('恢复检查已发起');
  });
}

ensureCommonLayers();
bindCommonEvents();

if (page === 'exceptions') initCurrentPage();
if (page === 'alarms') initAlarmPage();
if (page === 'recovery') initRecoveryPage();
