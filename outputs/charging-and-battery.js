(function () {
  'use strict';

  const piles = [
    { code: 'CHG-01', brand: 'HIKROBOT', model: 'CR-2400', space: '空间 B / 总览地图 V3.2', protocol: 'Modbus TCP', power: '2.4 kW', navPoint: 'CHG-B-01', status: '启用' },
    { code: 'CHG-02', brand: 'STANDARD ROBOTS', model: 'SR-CHG-24', space: '空间 A / 总览地图 V3.2', protocol: 'REST API', power: '2.0 kW', navPoint: 'CHG-A-02', status: '禁用' }
  ];
  const batteries = [
    { code: 'BAT-01', brand: 'CATL', model: 'LFP-48-100', type: '磷酸铁锂', specification: '48 V / 100 Ah', lowThreshold: '20%', resumeThreshold: '80%', status: '启用' },
    { code: 'BAT-02', brand: 'EVE', model: 'LF105', type: '磷酸铁锂', specification: '48 V / 105 Ah', lowThreshold: '25%', resumeThreshold: '85%', status: '禁用' }
  ];

  const state = { activeTab: 'piles', editingIndex: -1 };
  const pileRows = document.getElementById('pileRows');
  const batteryRows = document.getElementById('batteryRows');
  const modal = document.getElementById('configModal');
  const form = document.getElementById('configForm');
  const toast = document.getElementById('toast');
  let toastTimer;

  function cell(row, value, className) {
    const element = document.createElement('td');
    element.textContent = value;
    if (className) element.className = className;
    row.appendChild(element);
    return element;
  }

  function statusClass(status) {
    return status === '禁用' ? 'disabled' : 'enabled';
  }

  function appendStatus(row, status) {
    const statusCell = document.createElement('td');
    const tag = document.createElement('span');
    tag.className = 'status-tag ' + statusClass(status);
    tag.textContent = status;
    statusCell.appendChild(tag);
    row.appendChild(statusCell);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'row-btn ' + className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function appendActions(row, index) {
    const actionCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.append(actionButton('编辑', '', () => openEditor(index)), actionButton('删除', 'danger', () => removeItem(index)));
    actionCell.appendChild(actions);
    row.appendChild(actionCell);
  }

  function renderPiles() {
    pileRows.replaceChildren();
    piles.forEach((item, index) => {
      const row = document.createElement('tr');
      cell(row, item.code, 'code-cell');
      cell(row, item.brand);
      cell(row, item.model);
      cell(row, item.space);
      cell(row, item.protocol);
      cell(row, item.power);
      cell(row, item.navPoint);
      appendStatus(row, item.status);
      appendActions(row, index);
      pileRows.appendChild(row);
    });
  }

  function renderBatteries() {
    batteryRows.replaceChildren();
    batteries.forEach((item, index) => {
      const row = document.createElement('tr');
      cell(row, item.code, 'code-cell');
      cell(row, item.brand);
      cell(row, item.model);
      cell(row, item.type);
      cell(row, item.specification);
      cell(row, item.lowThreshold);
      cell(row, item.resumeThreshold);
      appendStatus(row, item.status);
      appendActions(row, index);
      batteryRows.appendChild(row);
    });
  }

  function updateSummary() {
    const activeItems = state.activeTab === 'piles' ? piles : batteries;
    document.getElementById('configTotal').textContent = '共 ' + activeItems.length + ' 条数据';
  }

  function render() {
    renderPiles();
    renderBatteries();
    updateSummary();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeModal(target) {
    const overlay = typeof target === 'string' ? document.getElementById(target) : modal;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; }, 180);
  }

  function field(label, id, value, options, wide) {
    const input = options
      ? '<select id="' + id + '">' + options.map(option => '<option' + (option === value ? ' selected' : '') + '>' + option + '</option>').join('') + '</select>'
      : '<input id="' + id + '" value="' + String(value || '').replaceAll('"', '&quot;') + '" required>';
    return '<label class="form-field' + (wide ? ' wide' : '') + '"><span>' + label + '</span>' + input + '</label>';
  }

  function buildPileForm(item) {
    form.innerHTML = [
      field('桩编号', 'configCode', item?.code), field('品牌', 'configBrand', item?.brand),
      field('型号', 'configModel', item?.model), field('通信协议', 'configProtocol', item?.protocol || 'Modbus TCP', ['Modbus TCP', 'REST API', 'OPC UA']),
      field('所属空间（地图）', 'configSpace', item?.space || '空间 A / 总览地图 V3.2', null, true),
      field('额定功率', 'configPower', item?.power || '2.4 kW'), field('关联导航点', 'configNavPoint', item?.navPoint),
      field('状态', 'configStatus', item?.status || '启用', ['启用', '禁用']),
      '<div class="modal-actions wide"><button class="modal-close" type="button" data-close="configModal">取消</button><button class="modal-primary" type="submit">保存</button></div>'
    ].join('');
  }

  function buildBatteryForm(item) {
    form.innerHTML = [
      field('配置编号', 'configCode', item?.code), field('电池品牌', 'configBrand', item?.brand),
      field('电池型号', 'configModel', item?.model), field('电池类型', 'configType', item?.type || '磷酸铁锂', ['磷酸铁锂', '三元锂', '钛酸锂']),
      field('额定电压 / 容量', 'configSpecification', item?.specification || '48 V / 100 Ah'),
      field('低电量阈值', 'configLowThreshold', item?.lowThreshold || '20%'),
      field('恢复任务阈值', 'configResumeThreshold', item?.resumeThreshold || '80%'),
      field('状态', 'configStatus', item?.status || '启用', ['启用', '禁用']),
      '<div class="modal-actions wide"><button class="modal-close" type="button" data-close="configModal">取消</button><button class="modal-primary" type="submit">保存</button></div>'
    ].join('');
  }

  function openEditor(index) {
    state.editingIndex = index;
    const items = state.activeTab === 'piles' ? piles : batteries;
    const item = items[index];
    const pileMode = state.activeTab === 'piles';
    document.getElementById('configModalTitle').textContent = (item ? '编辑' : '新增') + (pileMode ? '充电桩' : '电池配置');
    document.getElementById('configModalDescription').textContent = pileMode ? '维护充电桩品牌、协议和运行状态' : '维护电池品牌、规格和调度阈值';
    if (pileMode) buildPileForm(item);
    else buildBatteryForm(item);
    openModal();
  }

  function removeItem(index) {
    const items = state.activeTab === 'piles' ? piles : batteries;
    const item = items[index];
    if (!window.confirm('确认删除“' + item.code + '”吗？')) return;
    items.splice(index, 1);
    render();
    showToast(item.code + ' 已删除');
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.config-tab').forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.getElementById('pilePanel').hidden = tab !== 'piles';
    document.getElementById('batteryPanel').hidden = tab !== 'batteries';
    document.getElementById('testConnection').hidden = tab !== 'piles';
    document.getElementById('addConfigText').textContent = tab === 'piles' ? '新增充电桩' : '新增电池配置';
    updateSummary();
  }

  document.querySelectorAll('.config-tab').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  document.getElementById('addConfig').addEventListener('click', () => openEditor(-1));
  document.getElementById('testConnection').addEventListener('click', event => {
    const button = event.currentTarget;
    const content = button.innerHTML;
    button.disabled = true;
    button.textContent = '测试中…';
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = content;
      showToast('连接测试完成：' + piles.filter(item => item.status === '启用').length + ' 个充电桩连接正常');
    }, 700);
  });
  document.addEventListener('click', event => {
    const closeButton = event.target.closest('[data-close]');
    if (closeButton) closeModal(closeButton.dataset.close);
  });
  modal.addEventListener('click', event => { if (event.target === modal) closeModal('configModal'); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const pileMode = state.activeTab === 'piles';
    const items = pileMode ? piles : batteries;
    const item = pileMode ? {
      code: document.getElementById('configCode').value.trim(), brand: document.getElementById('configBrand').value.trim(),
      model: document.getElementById('configModel').value.trim(), space: document.getElementById('configSpace').value.trim(),
      protocol: document.getElementById('configProtocol').value, power: document.getElementById('configPower').value.trim(),
      navPoint: document.getElementById('configNavPoint').value.trim(), status: document.getElementById('configStatus').value
    } : {
      code: document.getElementById('configCode').value.trim(), brand: document.getElementById('configBrand').value.trim(),
      model: document.getElementById('configModel').value.trim(), type: document.getElementById('configType').value,
      specification: document.getElementById('configSpecification').value.trim(), lowThreshold: document.getElementById('configLowThreshold').value.trim(),
      resumeThreshold: document.getElementById('configResumeThreshold').value.trim(), status: document.getElementById('configStatus').value
    };
    if (state.editingIndex >= 0) items[state.editingIndex] = item;
    else items.unshift(item);
    const updated = state.editingIndex >= 0;
    closeModal('configModal');
    render();
    showToast(updated ? '配置已更新' : '配置已新增');
  });

  render();
})();
