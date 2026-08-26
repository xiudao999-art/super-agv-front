const navGroups = [
  { items: [{ href: 'robot-dispatch-dashboard.html', label: '运行总览', icon: 'grid' }] },
  { label: '运行调度', items: [
    { href: 'order-management.html', label: '订单管理', icon: 'clipboard' },
    { href: 'storage-and-carriers.html', label: '库位与载具', icon: 'sliders' },
    { href: 'device-debug.html', label: '设备调试', icon: 'wrench' }
  ] },
  { label: '配置中心', items: [
    { href: 'robots-and-devices.html', label: '机器人与设备', icon: 'panel' },
    { href: 'laboratory-configuration.html', label: '地图信息', icon: 'map' },
    { href: 'stations-and-points.html', label: '机台与点位', icon: 'panel' },
    { href: 'peripheral-resources.html', label: '外围资源', icon: 'sliders' },
    { href: 'charging-and-battery.html', label: '充电桩与电池配置', icon: 'battery' },
    { href: 'process-list.html', label: '流程与动作', icon: 'flow' }
  ] },
  { label: '运维与数据', items: [
    { href: 'current-anomalies.html', label: '异常与恢复', icon: 'shield' },
    { href: 'system-logs.html', label: '系统日志', icon: 'log' },
    { href: 'lab-capacity.html', label: 'AGV产能', icon: 'chart' }
  ] },
  { label: '系统管理', items: [
    { href: 'user-management.html', label: '用户管理', icon: 'users' },
    { href: 'role-permissions.html', label: '角色权限管理', icon: 'users' }
  ] }
];

const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h6"/>',
  sliders: '<path d="M5 3v6M5 15v6M12 3v12M12 19v2M19 3v3M19 12v9M2 9h6M9 15h6M16 6h6"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="9" r="2"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/>',
  flow: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h7a4 4 0 0 1 0 8H9a4 4 0 1 0 0 8h8"/>',
  shield: '<path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6l-8-3Z"/><path d="M12 8v4M12 16h.01"/>',
  log: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M7 8h7M7 12h7M7 16h5"/>',
  chart: '<path d="M4 20V10h5v10M9 20V4h6v16M15 20v-7h5v7M2 20h20"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5-5l2.2 2.2-2.4 2.4-2.2-2.2a4 4 0 0 0 5 5l6.5 6.5a2.1 2.1 0 1 1-3 3l-6.5-6.5Z"/><path d="m5 19 3.7-3.7"/>',
  battery: '<rect x="3" y="6" width="16" height="12" rx="2"/><path d="M21 10v4M7 10v4M5 12h4"/>',
  document: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24">${iconPaths[name] || iconPaths.panel}</svg>`;
}

function activeHref(current, itemHref) {
  if (current === itemHref) return true;
  const groups = {
    'storage-and-carriers.html': ['carrier-list.html', 'storage-type-list.html', 'carrier-type-list.html'],
    'laboratory-configuration.html': ['passage-rules.html'],
    'process-list.html': ['process-templates.html', 'process-template-editor.html'],
    'current-anomalies.html': ['alarm-records.html', 'task-recovery-status.html'],
    'order-management.html': ['order-task-detail.html']
  };
  return groups[itemHref]?.includes(current) || false;
}

function removeLaboratoryWording() {
  const root = document.body;
  if (!root) return;
  const strip = value => String(value || '').replace(/实验室\s*/g, '');
  const removableSubtitles = new Set([
    '一期固定一台复合机器人，可由底盘、机械臂、视觉、PLC 和夹具等模组组成',
    '当前项目只使用一张地图，无需选择或多选',
    '点击编辑可维护空间内地图信息，并通过导航点查看地图内已标记的目标位置。',
    '坐标值与坐标系必须成对保存，发布前校验地图版本和到达关系',
    '外围资源坐标用于路径连接、资源预约和到位校验',
    '当前共 4 个流程；点击流程行查看详情，点击“编辑”在弹窗中维护流程基本信息'
  ]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('script, style, template, noscript')) continue;
    if (node.nodeValue.includes('实验室')) node.nodeValue = strip(node.nodeValue);
  }
  root.querySelectorAll('[title], [placeholder], [aria-label]').forEach(element => {
    ['title', 'placeholder', 'aria-label'].forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value?.includes('实验室')) element.setAttribute(attribute, strip(value));
    });
  });
  root.querySelectorAll('p').forEach(paragraph => {
    if (removableSubtitles.has(strip(paragraph.textContent).trim())) paragraph.remove();
  });
  root.querySelectorAll('.api-scope-note').forEach(note => note.remove());
  if (document.title.includes('实验室')) document.title = strip(document.title);
}

export class AgvAppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const current = this.getAttribute('active-route') || location.pathname.split('/').pop() || 'robot-dispatch-dashboard.html';
    const configGroup = navGroups.find(group => group.label === '配置中心');
    const configMenuItem = configGroup?.items.find(item => item.href === current);
    const isConfigPage = configGroup?.items.some(item => activeHref(current, item.href));
    const title = configMenuItem?.label || this.getAttribute('section-title') || document.querySelector('.page-head h1, agv-page-header h1')?.textContent?.trim() || '运行总览';
    const user = this.getAttribute('user-name') || '陈工';
    const nav = navGroups.map(group => `
      <div class="nav-group">
        ${group.label ? `<p class="nav-label">${group.label}</p>` : ''}
        ${group.items.map(item => `<a class="nav-item${activeHref(current, item.href) ? ' active' : ''}" href="${item.href}">${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
      </div>`).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-height:100dvh; color:var(--agv-ink,#122235); background:var(--agv-canvas,#f3f6f8); }
        * { box-sizing:border-box; }
        .icon { width:18px; height:18px; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
        .sidebar { position:fixed; inset:0 auto 0 0; z-index:30; width:var(--agv-sidebar-width,220px); display:flex; flex-direction:column; padding:18px 10px 14px; overflow:hidden; background:#fff; border-right:1px solid var(--agv-line-soft,#e9edf1); transition:transform .2s ease; }
        .brand { height:44px; display:flex; align-items:center; padding:0 8px; margin-bottom:18px; text-decoration:none; }
        .brand-logo { display:block; width:100%; height:auto; max-height:40px; object-fit:contain; object-position:left center; }
        nav { flex:1; min-height:0; overflow-y:auto; }
        .nav-group { margin:12px 0 19px; }
        .nav-group:first-child { margin-top:0; }
        .nav-label { margin:0 10px 8px; color:var(--agv-text-muted,#768392); font-size:12px; line-height:24px; }
        .nav-item { min-height:42px; display:flex; align-items:center; gap:10px; padding:0 11px; border-radius:8px; color:var(--agv-ink,#122235); font-size:14px; text-decoration:none; transition:background .15s ease,color .15s ease; }
        .nav-item + .nav-item { margin-top:2px; }
        .nav-item:hover { background:#f4f7f9; }
        .nav-item.active { color:var(--agv-blue,#1677c8); background:var(--agv-blue-soft,#eaf4fd); font-weight:700; }
        .version { flex:0 0 auto; margin:4px 8px 0; padding-top:12px; border-top:1px solid var(--agv-line-soft,#e9edf1); color:var(--agv-text-muted,#768392); font-size:12px; line-height:20px; text-align:center; }
        .shell { min-height:100dvh; margin-left:var(--agv-sidebar-width,220px); }
        .topbar { position:sticky; top:0; z-index:20; height:var(--agv-topbar-height,56px); display:flex; align-items:center; justify-content:space-between; padding:0 20px; background:rgba(255,255,255,.96); border-bottom:1px solid var(--agv-line-soft,#e9edf1); backdrop-filter:blur(12px); }
        .top-title,.top-actions,.top-action,.user-chip { display:flex; align-items:center; }
        .top-title { gap:12px; font-size:14px; font-weight:600; }
        .title-icon { width:26px; height:26px; display:grid; place-items:center; border-radius:7px; background:#f2f5f7; }
        .title-icon .icon { width:16px; height:16px; }
        .top-actions { gap:8px; }
        .top-action { min-height:34px; gap:7px; padding:0 13px; border:1px solid var(--agv-line,#dfe5ea); border-radius:18px; background:#fff; font-size:13px; cursor:pointer; }
        .top-action:hover { border-color:#c7d0d8; background:#f9fbfc; }
        .top-action:active { transform:translateY(1px); }
        .top-action .icon { width:16px; height:16px; color:var(--agv-text-muted,#768392); }
        .user-chip { gap:8px; margin-left:2px; color:inherit; font-size:13px; font-weight:650; text-decoration:none; }
        .user-chip:hover { color:var(--agv-blue,#1677c8); }
        .avatar { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; color:#fff; background:var(--agv-blue,#1677c8); }
        .avatar svg { width:18px; height:18px; fill:currentColor; }
        .menu-btn { display:none; }
        .scrim { display:none; }
        @media (max-width:760px) {
          .sidebar { width:240px; transform:translateX(-100%); box-shadow:12px 0 30px rgba(9,26,42,.14); }
          .sidebar.open { transform:translateX(0); }
          .shell { margin-left:0; }
          .topbar { padding:0 12px; }
          .menu-btn { width:36px; height:36px; display:grid; place-items:center; border:0; border-radius:8px; background:#f2f5f7; cursor:pointer; }
          .title-icon { display:none; }
          .top-title { gap:8px; }
          .top-actions { gap:6px; }
          .top-action { width:36px; justify-content:center; padding:0; }
          .top-action span,.user-chip>span:last-child { display:none; }
          .scrim.show { position:fixed; inset:0; z-index:25; display:block; background:rgba(9,26,42,.36); }
        }
        @media (prefers-reduced-motion:reduce) { .sidebar,.top-action { transition:none; } }
      </style>
      <aside class="sidebar" aria-label="主导航">
        <a class="brand" href="robot-dispatch-dashboard.html" aria-label="返回运行总览"><img class="brand-logo" src="assets/logo.svg" alt="昆灵科技"></a>
        <nav>${nav}</nav>
        <div class="version" aria-label="系统版本">v2.3</div>
      </aside>
      <div class="scrim"></div>
      <main class="shell">
        <header class="topbar">
          <div class="top-title"><button class="menu-btn" type="button" aria-label="打开导航菜单">${icon('menu')}</button><span class="title-icon">${icon('panel')}</span><span>${title}</span></div>
          <div class="top-actions"><button class="top-action status" type="button">${icon('document')}<span>状态说明</span></button><button class="top-action alert" type="button">${icon('alert')}<span>异常提醒</span></button><a class="user-chip" href="login.html" title="退出并返回登录页"><span class="avatar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0Z"/></svg></span><span>${user}</span></a></div>
        </header>
        <slot></slot>
      </main>`;

    if (configMenuItem) {
      requestAnimationFrame(() => {
        const pageHeader = this.querySelector('agv-page-header.page-head');
        const pageTitle = pageHeader?.querySelector('h1');
        if (pageTitle) pageTitle.textContent = configMenuItem.label;
        pageHeader?.querySelector('p')?.remove();
        document.title = `复合机器人调度系统 · ${configMenuItem.label}`;
      });
    }

    if (isConfigPage) {
      removeLaboratoryWording();
      this.configWordingObserver = new MutationObserver(removeLaboratoryWording);
      this.configWordingObserver.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'placeholder', 'aria-label']
      });
    }

    const sidebar = this.shadowRoot.querySelector('.sidebar');
    const scrim = this.shadowRoot.querySelector('.scrim');
    const setOpen = open => { sidebar.classList.toggle('open', open); scrim.classList.toggle('show', open); };
    requestAnimationFrame(() => this.shadowRoot.querySelector('.nav-item.active')?.scrollIntoView({ block: 'nearest' }));
    this.shadowRoot.querySelector('.menu-btn').addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    scrim.addEventListener('click', () => setOpen(false));
    this.shadowRoot.querySelector('.status').addEventListener('click', () => this.forwardAction(['statusInfoBtn', 'statusBtn'], 'statusModal'));
    this.shadowRoot.querySelector('.alert').addEventListener('click', () => this.forwardAction(['alertInfoBtn', 'alertBtn'], 'alertDrawer'));
    this.shadowRoot.querySelectorAll('.nav-item').forEach(link => link.addEventListener('click', () => setOpen(false)));
  }

  disconnectedCallback() {
    this.configWordingObserver?.disconnect();
  }

  forwardAction(ids, fallbackLayer) {
    ids.forEach(id => document.getElementById(id)?.click());
    setTimeout(() => {
      const layer = document.getElementById(fallbackLayer);
      if (layer?.hidden && window.agvUi) window.agvUi.openLayer(fallbackLayer);
    });
  }
}

customElements.define('agv-app-shell', AgvAppShell);
