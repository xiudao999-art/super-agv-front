(function () {
  'use strict';

  const STORAGE_KEY = 'agv.peripheral.resources.v1';
  const defaultResources = [
    {
      code: 'CAM-01',
      name: '检测工位摄像机',
      type: '摄像机',
      space: '空间 A / 总览地图 V3.2',
      coordinate: 'X 22.600 / Y 6.800 / θ 135.0°',
      navPoint: 'CAM-A-01',
      status: '在线',
      remark: '工位上方检测画面',
      camera: {
        ip: '192.168.20.31', port: '554', protocol: 'RTSP',
        streamUrl: 'rtsp://192.168.20.31:554/stream1', resolution: '1920×1080',
        frameRate: '25', previewUrl: 'assets/camera-detection.png'
      }
    },
    { code: 'D-01', name: 'A 区自动门', type: '自动门', space: '空间 A / 总览地图 V3.2', coordinate: 'X 18.400 / Y 3.200 / θ 90.0°', navPoint: 'DOOR-A-01', status: '在线', remark: '任务到达前自动预约开门', camera: null },
    { code: 'E-01', name: 'A-B 连接电梯', type: '电梯', space: '空间 A ↔ 空间 B', coordinate: 'A：32.100 / 8.200 / 0°\nB：4.300 / 8.100 / 180°', navPoint: 'E-A ↔ E-B', status: '在线', remark: '连接 A、B 两个作业空间', camera: null }
  ];

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaultResources));
  }

  function loadResources() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored)) return stored;
    } catch (error) {
      console.warn('外围资源本地数据读取失败', error);
    }
    return cloneDefaults();
  }

  const resources = loadResources();
  const rows = document.getElementById('resourceRows');
  const total = document.getElementById('resourceTotal');
  const modal = document.getElementById('peripheralModal');
  const form = document.getElementById('peripheralForm');
  const title = document.getElementById('peripheralModalTitle');
  const toast = document.getElementById('toast');
  const resourceType = document.getElementById('resourceType');
  const cameraFields = document.getElementById('cameraFields');
  const cameraRequiredFields = ['resourceCameraIp', 'resourceCameraPort', 'resourceStreamUrl', 'resourceFrameRate'];
  let editingIndex = -1;
  let toastTimer;

  function persistResources() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
    } catch (error) {
      console.warn('外围资源本地数据保存失败', error);
    }
  }

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
    cell.textContent = value || '--';
    row.appendChild(cell);
    return cell;
  }

  function appendIdentityCell(row, resource) {
    const cell = document.createElement('td');
    cell.className = 'resource-code';
    const code = document.createElement('strong');
    const name = document.createElement('small');
    code.textContent = resource.code;
    name.textContent = resource.name || resource.type;
    cell.append(code, name);
    row.appendChild(cell);
  }

  function connectionSummary(resource) {
    if (resource.type !== '摄像机' || !resource.camera) return resource.remark || '--';
    const camera = resource.camera;
    const network = [camera.protocol, camera.ip && camera.port ? camera.ip + ':' + camera.port : camera.ip].filter(Boolean).join(' · ');
    const picture = [camera.resolution, camera.frameRate ? camera.frameRate + ' FPS' : ''].filter(Boolean).join(' · ');
    return [network, picture].filter(Boolean).join('\n');
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
      appendIdentityCell(row, resource);
      appendCell(row, resource.type);
      appendCell(row, resource.space, 'resource-space');
      appendCell(row, resource.coordinate, 'resource-coordinate');
      appendCell(row, connectionSummary(resource), 'resource-connection');
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
      cell.colSpan = 8;
      cell.className = 'resource-empty';
      cell.textContent = '暂无外部设备';
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
    setTimeout(() => { modal.hidden = true; }, 180);
  }

  function setField(id, value) {
    document.getElementById(id).value = value || '';
  }

  function toggleCameraFields() {
    const cameraSelected = resourceType.value === '摄像机';
    cameraFields.hidden = !cameraSelected;
    cameraRequiredFields.forEach(id => {
      document.getElementById(id).required = cameraSelected;
    });
    document.getElementById('resourceNavPoint').required = !cameraSelected;
  }

  function openEditor(index) {
    editingIndex = index;
    const resource = resources[index];
    const camera = resource?.camera || {};
    title.textContent = resource ? '编辑外围资源 · ' + resource.code : '新增外围资源';
    setField('resourceCode', resource?.code);
    setField('resourceName', resource?.name);
    setField('resourceType', resource?.type || '摄像机');
    setField('resourceSpace', resource?.space);
    setField('resourceCoordinate', resource?.coordinate);
    setField('resourceNavPoint', resource?.navPoint);
    setField('resourceStatus', resource?.status || '在线');
    setField('resourceRemark', resource?.remark);
    setField('resourceCameraIp', camera.ip);
    setField('resourceCameraPort', camera.port);
    setField('resourceCameraProtocol', camera.protocol || 'RTSP');
    setField('resourceStreamUrl', camera.streamUrl);
    setField('resourceResolution', camera.resolution || '1920×1080');
    setField('resourceFrameRate', camera.frameRate);
    setField('resourcePreviewUrl', camera.previewUrl);
    toggleCameraFields();
    openModal();
  }

  function removeResource(index) {
    const resource = resources[index];
    if (!window.confirm('确认删除“' + resource.code + '”吗？')) return;
    resources.splice(index, 1);
    persistResources();
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
      showToast('连接测试完成：' + resources.filter(item => item.status !== '离线').length + ' 个外部设备连接正常');
    }, 700);
  }

  resourceType.addEventListener('change', toggleCameraFields);
  document.getElementById('addPeripheral').addEventListener('click', () => openEditor(-1));
  document.getElementById('testAllPeripheral').addEventListener('click', testConnections);
  document.getElementById('peripheralModalClose').addEventListener('click', closeModal);
  document.getElementById('peripheralCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const type = resourceType.value;
    const resource = {
      code: document.getElementById('resourceCode').value.trim(),
      name: document.getElementById('resourceName').value.trim(),
      type,
      space: document.getElementById('resourceSpace').value.trim(),
      coordinate: document.getElementById('resourceCoordinate').value.trim(),
      navPoint: document.getElementById('resourceNavPoint').value.trim(),
      status: document.getElementById('resourceStatus').value,
      remark: document.getElementById('resourceRemark').value.trim(),
      camera: type === '摄像机' ? {
        ip: document.getElementById('resourceCameraIp').value.trim(),
        port: document.getElementById('resourceCameraPort').value.trim(),
        protocol: document.getElementById('resourceCameraProtocol').value,
        streamUrl: document.getElementById('resourceStreamUrl').value.trim(),
        resolution: document.getElementById('resourceResolution').value,
        frameRate: document.getElementById('resourceFrameRate').value.trim(),
        previewUrl: document.getElementById('resourcePreviewUrl').value.trim()
      } : null
    };
    const updated = editingIndex >= 0;
    if (updated) resources[editingIndex] = resource;
    else resources.unshift(resource);
    persistResources();
    closeModal();
    render();
    showToast(updated ? '外部设备已更新' : '外部设备已挂载');
  });

  render();
})();
