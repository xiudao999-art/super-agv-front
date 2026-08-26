(function () {
  'use strict';

  const resources = [
    { code: 'D-01', type: '自动门', space: '空间 A / 总览地图 V3.2', coordinate: 'X 18.400 / Y 3.200 / θ 90.0°', navPoint: 'DOOR-A-01', status: '在线', remark: '任务到达前自动预约开门' },
    { code: 'E-01', type: '电梯', space: '空间 A ↔ 空间 B', coordinate: 'A：32.100 / 8.200 / 0°\nB：4.300 / 8.100 / 180°', navPoint: 'E-A ↔ E-B', status: '在线', remark: '连接 A、B 两个作业空间' },
    { code: 'CHG-01', type: '充电桩', space: '空间 B / 总览地图 V3.2', coordinate: 'X 7.600 / Y 2.400 / θ 180.0°', navPoint: 'CHG-B-01', status: '可用', remark: '低电量任务默认充电点' },
    { code: 'CHG-02', type: '备用充电桩', space: '空间 A / 总览地图 V3.2', coordinate: 'X 3.200 / Y 2.150 / θ 90.0°', navPoint: 'CHG-A-02', status: '备用', remark: '主充电桩不可用时启用' }
  ];

  const rows = document.getElementById('resourceRows');
  const total = document.getElementById('resourceTotal');
  const modal = document.getElementById('peripheralModal');
  const form = document.getElementById('peripheralForm');
  const title = document.getElementById('peripheralModalTitle');
  const toast = document.getElementById('toast');
  let editingIndex = -1;
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function statusClass(status) {
    if (status === '备用') return 'state-standby';
    if (status === '离线') return 'state-offline';
    return 'state-online';
  }

  function appendCell(row, value, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function actionButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'resource-row-btn ' + className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function render() {
    rows.replaceChildren();
    resources.forEach((resource, index) => {
      const row = document.createElement('tr');
      appendCell(row, resource.code, 'resource-code');
      appendCell(row, resource.type);
      appendCell(row, resource.space, 'resource-space');
      appendCell(row, resource.coordinate, 'resource-coordinate');
      appendCell(row, resource.navPoint);
      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = 'resource-status ' + statusClass(resource.status);
      status.textContent = resource.status;
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      const actionCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'resource-row-actions';
      actions.append(
        actionButton('编辑', 'edit', () => openEditor(index)),
        actionButton('删除', 'delete', () => removeResource(index))
      );
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      rows.appendChild(row);
    });
    if (!resources.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'resource-empty';
      cell.textContent = '暂无外围资源';
      row.appendChild(cell);
      rows.appendChild(row);
    }
    total.textContent = '共计 ' + resources.length + ' 条数据';
  }

  function openModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => modal.hidden = true, 180);
  }

  function setField(id, value) {
    document.getElementById(id).value = value || '';
  }

  function openEditor(index) {
    editingIndex = index;
    const resource = resources[index];
    title.textContent = resource ? '编辑外围资源 · ' + resource.code : '新增外围资源';
    setField('resourceCode', resource?.code);
    setField('resourceType', resource?.type || '自动门');
    setField('resourceSpace', resource?.space || '空间 A / 总览地图 V3.2');
    setField('resourceCoordinate', resource?.coordinate);
    setField('resourceNavPoint', resource?.navPoint);
    setField('resourceStatus', resource?.status || '在线');
    setField('resourceRemark', resource?.remark);
    openModal();
  }

  function removeResource(index) {
    const resource = resources[index];
    if (!window.confirm('确认删除“' + resource.code + '”吗？')) return;
    resources.splice(index, 1);
    render();
    showToast(resource.code + ' 已删除');
  }

  function testConnections() {
    const button = document.getElementById('testAllPeripheral');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = '测试中…';
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
      showToast('连接测试完成：' + resources.filter(item => item.status !== '离线').length + ' 个资源连接正常');
    }, 700);
  }

  document.getElementById('addPeripheral').addEventListener('click', () => openEditor(-1));
  document.getElementById('testAllPeripheral').addEventListener('click', testConnections);
  document.getElementById('peripheralModalClose').addEventListener('click', closeModal);
  document.getElementById('peripheralCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const resource = {
      code: document.getElementById('resourceCode').value.trim(),
      type: document.getElementById('resourceType').value,
      space: document.getElementById('resourceSpace').value.trim(),
      coordinate: document.getElementById('resourceCoordinate').value.trim(),
      navPoint: document.getElementById('resourceNavPoint').value.trim(),
      status: document.getElementById('resourceStatus').value,
      remark: document.getElementById('resourceRemark').value.trim()
    };
    if (editingIndex >= 0) resources[editingIndex] = resource;
    else resources.unshift(resource);
    const updated = editingIndex >= 0;
    closeModal();
    render();
    showToast(updated ? '外围资源已更新' : '外围资源已新增');
  });

  render();
})();
