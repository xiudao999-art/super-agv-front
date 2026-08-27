(function () {
  const levelText = { L1: '自动降级', L2: '远程人工', L3: '现场人工', L4: '工程师' };
  const tickets = { 'ES-01': ['ALM-20260827-0017'], 'ES-06': ['ALM-20260827-0015'] };
  const procedures = [
    { id:'ES-01', title:'机械臂与自动门 / 舱门干涉卡阻', signal:'关节力矩超限或碰撞检测触发，且门体状态反馈与控制指令不一致', scope:'全线急停', duty:'现场人工 + 调度台', auto:['机械臂就地停止并保持当前位姿','冻结门控指令并暂停同线路后续任务','自动拍照取证并推送告警'], manual:['现场清场并确认无夹人风险','将门体手动开至全开位并悬挂检修锁','检查机械臂、夹爪和物料损伤情况','登记现场处置结果'], gates:['门体完成一次完整开关自检','机械臂低速收回并完成回零','夹爪、物料与台账复核一致'], warning:'门体自检未通过前必须保持人工模式，禁止恢复自动控制。' },
    { id:'ES-02', title:'安全防护区人员进入', signal:'安全光幕遮挡或激光防护区侵入信号触发', scope:'单机急停', duty:'现场人工', auto:['机械臂与底盘立即停止并保持','声光告警并写入安全日志'], manual:['引导人员撤离防护区','确认区域内没有人员和遗留物'], gates:['防护区连续清空达到设定时间','设备安全自检通过'], warning:'人员频繁进入时应重新检查现场动线和防护区范围。' },
    { id:'ES-03', title:'机械臂碰撞 / 力矩异常超限', signal:'碰撞检测触发或关节力矩持续超限', scope:'单机急停', duty:'现场人工，必要时升级工程师', auto:['机械臂就地停止并进入安全保持','记录碰撞时刻关节数据并拍照','挂起节点并告警'], manual:['检查碰撞点和设备损伤','确认物料状态并按需转运','疑似定位漂移时升级工程师重标定'], gates:['系统自检和回零通过','空载试运行一次取放动作通过','台账与实况一致'], warning:'同一点位重复碰撞时，完成点位重标定前禁止继续试运行。' },
    { id:'ES-04', title:'设备互锁失效', signal:'设备运行反馈与作业许可状态矛盾', scope:'机构急停', duty:'现场人工 + 调度台', auto:['机械臂立即停止并保持','向涉事设备下发停止指令','作业许可作废并挂起节点'], manual:['确认设备已经完全停稳','检查碰撞与样本状态','排查互锁信号链路'], gates:['设备反馈与现场状态一致','重新取得作业许可','机械臂回零和视觉复核通过'], warning:'原因未查明时禁止恢复自动作业。' },
    { id:'ES-05', title:'夹持失稳（物料倾斜 / 滑脱）', signal:'夹持力反馈异常或视觉检测到物料姿态超限', scope:'单机急停', duty:'现场人工', auto:['机械臂就地停止并保持夹持力','自动拍照取证并挂起节点'], manual:['人工托接或加固物料后缓慢释放夹爪','按样本泄漏规程处置受损物料','修正物料台账'], gates:['夹爪状态与物料去向核账一致','机械臂回零通过'], warning:'没有现场托接条件时禁止远程张爪。' },
    { id:'ES-06', title:'滚筒对接料仓卡滞且姿态失稳', signal:'输送到位超时，且传感与视觉判断料仓停于交接缝', scope:'机构急停', duty:'现场人工 + 调度台', auto:['两侧滚筒停转并锁定升降机构','自动拍照、挂起节点并冻结对接位'], manual:['确认料仓稳定后人工推送到位或移出','检查传感器清洁与对准状态','修正料仓位置台账'], gates:['对接位传感自检通过','视觉确认位置与台账一致'], warning:'同一点位短期连续两次卡滞时升级为 L4 工程师处置。' },
    { id:'ES-07', title:'底盘制动异常', signal:'避障或防撞条触发后里程计仍检测到位移', scope:'单机急停', duty:'工程师（必须）', auto:['驱动断使能并抱闸','本机移出可派工资源池并全线告警'], manual:['现场楔停车辆并隔离','工程师检修制动系统','空载试车验证制动性能'], gates:['工程师检修记录完成','工程师账号执行放行'], warning:'本类异常仅允许工程师角色放行。' },
    { id:'ES-08', title:'充电对接异常', signal:'充电回路电流、温度异常或现场报告打火、异响', scope:'单机急停', duty:'工程师', auto:['断开充电回路并禁止驶离','冻结充电桩并停止派发任务'], manual:['断电检查触点与极板','检查电池温度、外观和告警码','工程师检修并记录'], gates:['电气检查通过','试充监测正常'], warning:'发现冒烟或明火时优先执行现场消防应急预案。' },
    { id:'ES-09', title:'现场人员手动触发急停按钮', signal:'机身或线体急停按钮被人工按下', scope:'全线急停', duty:'现场人工 + 调度台', auto:['按按钮所属范围停止设备','记录机器人位姿和任务断点'], manual:['联系触发人核实原因','按对应异常场景完成处置','确认危险消除后复位旋钮'], gates:['急停原因已经查明并处置','受影响机器人自检、回零和核账通过'], warning:'原因不明时按最高风险场景处置，禁止直接复位。' },
    { id:'ES-10', title:'运动中与调度系统失联', signal:'机器人运动中丢失心跳超过 10 秒', scope:'单机急停', duty:'调度台，必要时升级工程师', auto:['机器人本地安全策略使其就地停止','调度系统将其移出路径规划'], manual:['排查无线网络和车载终端','恢复通讯后核对任务检查点'], gates:['通讯连续稳定达到设定时间','机器人状态与任务检查点一致'], warning:'失联期间禁止向该机器人发送远程控制指令。' }
  ];

  const workorders = [
    { id:'ALM-20260827-0017', title:'放料时机械臂被自动门卡阻', pattern:'互锁失效类', level:'L3', robot:'AGV-01（孔板机型）', node:'ARM.PLACE @ 培养箱-窗口2', time:'2026-08-27 08:21:47', status:'处置中', owner:'陈工', impact:'工单 WO-3382 挂起；培养箱窗口、门控指令和同线路任务保持冻结。', rule:'ES-01', protections:['机械臂就地停止并保持当前位姿','自动拍照取证','冻结门控指令和同线路派工'], recon:[['夹爪','孔板 P-0921（夹持中）','孔板 P-0921 在夹',true],['培养箱-窗口2','空','空',true],['缓存位 #3','孔板 P-0919','孔板 P-0919',true]], checks:[['现场目视确认无夹人风险，周边已经清场','现场'],['将自动门手动开至全开位并悬挂检修锁','现场'],['确认机械臂、夹爪和物料没有可见损伤','现场']], checkpoints:['门体全开到位且开关自检通过','机械臂低速收回并完成回零','夹爪与物料状态视觉复核通过'], routes:[['retry','重新放一次料','重新执行本次放料动作'],['corrective','转送异常暂存架','终止本次放料并转运物料'],['cancel','终止本任务','取消整单并保留核账结果']] },
    { id:'ALM-20260827-0016', title:'取料夹空（夹持反馈失败）', pattern:'账实不一致类', level:'L2', robot:'AGV-02（摇管机型）', node:'ARM.PICK @ 智能货架-B12', time:'2026-08-27 08:34:02', status:'待处置', owner:'王工', impact:'库位 B12 已冻结，当前任务挂起。', protections:['机械臂退回安全位','自动拍照取证','冻结库位 B12'], recon:[['智能货架-B12','试管架 T-1107','空',false],['夹爪','空','空',true]], checks:[['核实 T-1107 实际位置','现场'],['修正库位台账并提交审批','调度台'],['确认与上位系统同步完成','调度台']], checkpoints:['涉事库位账实一致','库位冻结已解除'], routes:[['retry-alt','改由备用库位取料','从有料的备用库位重试'],['retry','原库位重新取料','视觉确认后在原位重试'],['cancel','终止本任务','取消整单']] },
    { id:'ALM-20260827-0015', title:'滚筒对接卡料（窗口暂存架）', pattern:'互锁失效类', level:'L3', robot:'AGV-01（孔板机型）', node:'DOCK.TRANSFER @ 窗口暂存架-W1', time:'2026-08-27 07:58:20', status:'处置中', owner:'陈工', impact:'W1 对接位冻结，AGV-01 原地保持。', rule:'ES-06', protections:['两侧滚筒立即停转','升降机构锁定','冻结 W1 对接位'], recon:[['AGV 滚筒位','孔板料仓 C-303','已移至 W1',false],['窗口暂存架-W1','空','孔板料仓 C-303',false]], checks:[['确认料仓姿态稳定','现场'],['人工推送到位或移至安全位置','现场'],['修正 C-303 位置台账','调度台']], checkpoints:['W1 到位传感自检通过','视觉位置与台账一致'], routes:[['resume-next','从下一步继续','本步骤记为完成'],['retry','重新执行对接','重新执行滚筒输送'],['cancel','终止本任务','物料留在核账位置']] },
    { id:'ALM-20260827-0014', title:'机台取料许可超时（上位无应答）', pattern:'外部协同超时类', level:'L2', robot:'AGV-03（孔板机型）', node:'WAIT.PERMIT @ 前处理岛台-窗口1', time:'2026-08-27 08:40:55', status:'待处置', owner:'李工', impact:'AGV-03 在窗口前安全等待，同机台后续任务暂停。', protections:['节点挂起并通知上位系统','AGV 在安全等待点保持'], recon:[['前处理岛台-窗口1','耗材托盘 H-552','耗材托盘 H-552',true]], checks:[['确认上位系统和机台心跳状态','调度台']], checkpoints:['对方系统心跳恢复','机台窗口状态未发生变化'], routes:[['rewait','继续等待设备应答','重新申请许可并等待'],['manual-permit','人工安全放行','由人工承担放行责任'],['cancel','终止本任务','机器人返回待命点']] },
    { id:'ALM-20260827-0013', title:'RFID 写账失败（库位 A-07）', pattern:'账实不一致类', level:'L1', robot:'AGV-02（摇管机型）', node:'RFID.WRITE @ 智能货架-A07', time:'2026-08-27 07:12:10', status:'处置中', owner:'李工', impact:'任务未中断，库位 A-07 冻结待核。', protections:['RFID 自动重写三次','库位 A-07 标记待核并冻结'], recon:[['智能货架-A07','托盘 R-208（待核）','待人工扫码',false]], checks:[['使用手持终端扫码核对 RFID','现场'],['在页面确认核账结果','调度台']], checkpoints:['库位台账与扫码结果一致'], routes:[['unfreeze','恢复库位使用','解除冻结并重新参与派工'],['keep-frozen','继续停用库位','转工程师检查读写器']] }
  ];

  const state = new Map(workorders.map(item => [item.id, { checks:new Set(), verified:false, route:'', released:false }]));
  let activeWorkorder = null;

  function openLayer(id) { const layer=document.getElementById(id); if(!layer)return; layer.hidden=false; document.body.style.overflow='hidden'; requestAnimationFrame(()=>layer.classList.add('open')); }
  function closeLayer(id) { const layer=document.getElementById(id); if(!layer)return; layer.classList.remove('open'); document.body.style.overflow=''; setTimeout(()=>layer.hidden=true,190); }
  function toast(message) { const node=document.getElementById('opsToast'); if(!node)return; node.textContent=message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.classList.remove('show'),2200); }
  function levelChip(level) { return `<span class="level-chip ${level.toLowerCase()}">${level} ${levelText[level]}</span>`; }
  function scopeChip(scope) { const cls=scope==='全线急停'?'line':scope==='机构急停'?'mechanism':'unit'; return `<span class="scope-chip ${cls}">${scope}</span>`; }

  function renderWorkorders(list=workorders) {
    const body=document.getElementById('workorderBody'); if(!body)return;
    body.innerHTML=list.map(item=>`<tr class="clickable-row" data-workorder="${item.id}"><td class="ops-code">${item.id}</td><td><strong class="table-primary">${item.title}</strong><span class="table-secondary ops-description-meta"><span>${item.pattern}</span>${item.rule?`<b class="emergency-rule-chip"><i>!</i>急停规则 ${item.rule}</b>`:''}</span></td><td>${levelChip(item.level)}</td><td><strong class="table-primary">${item.robot}</strong><span class="table-secondary">${item.node}</span></td><td>${item.time}</td><td><span class="status-tag ${state.get(item.id).released?'valid':item.status==='待处置'?'critical':'warning'}">${state.get(item.id).released?'已恢复':item.status}</span></td></tr>`).join('');
    if(document.getElementById('workorderCount'))document.getElementById('workorderCount').textContent=list.filter(item=>!state.get(item.id).released).length+' 项待处置';
    if(document.getElementById('workorderSummary'))document.getElementById('workorderSummary').textContent='共 '+list.length+' 条异常工单';
    body.querySelectorAll('[data-workorder]').forEach(row=>row.addEventListener('click',()=>openWorkorder(row.dataset.workorder)));
  }

  function openWorkorder(id) {
    activeWorkorder=workorders.find(item=>item.id===id); const item=activeWorkorder, itemState=state.get(id); if(!item)return;
    document.getElementById('workorderModalSubtitle').textContent=item.id+' · '+item.time+' · 负责人：'+item.owner;
    const body=document.getElementById('workorderModalBody');
    body.innerHTML=`
      <div class="ops-summary"><article class="ops-summary-item wide"><span>异常场景</span><strong>${item.title}</strong></article><article class="ops-summary-item"><span>处置级别</span>${levelChip(item.level)}</article><article class="ops-summary-item"><span>当前状态</span><strong>${itemState.released?'已恢复':item.status}</strong></article><article class="ops-summary-item wide"><span>机器人 / 失败节点</span><strong>${item.robot}<br>${item.node}</strong></article><article class="ops-summary-item wide"><span>影响范围</span><strong>${item.impact}</strong></article></div>
      ${item.rule?`<div class="warning-note">本工单由急停规则 <strong>${item.rule}</strong> 触发。<a class="link-inline" href="emergency-stop-procedure.html?rule=${item.rule}">查看对应处置规程 →</a></div>`:''}
      <section class="ops-section"><div class="ops-section-title"><h3>系统已执行的保护</h3><span>处置完成前保持生效</span></div><ul class="protection-list">${item.protections.map(text=>`<li class="protection-item">${text}</li>`).join('')}</ul></section>
      <section class="ops-section"><div class="ops-section-title"><h3>1. 核账对照</h3><span>系统台账与现场实况比对</span></div><table class="reconcile-table"><thead><tr><th>位置</th><th>系统台账</th><th>现场实况</th><th>结果</th></tr></thead><tbody>${item.recon.map(row=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td class="${row[3]?'match-ok':'match-bad'}">${row[3]?'一致':'不一致'}</td></tr>`).join('')}</tbody></table></section>
      <section class="ops-section"><div class="ops-section-title"><h3>2. 人工确认项</h3><span>现场处置完成后逐项确认</span></div><div class="confirm-list">${item.checks.map((row,index)=>`<label class="confirm-item"><input type="checkbox" data-check="${index}" ${itemState.checks.has(index)?'checked':''} ${itemState.verified||itemState.released?'disabled':''}><span>${row[0]}</span><i class="role-chip">${row[1]}</i></label>`).join('')}</div><div class="verify-row"><button class="primary-action" id="verifyWorkorder" type="button" ${itemState.checks.size===item.checks.length&&!itemState.verified?'':'disabled'}>${itemState.verified?'归位与自检已完成':'人工确认完成，执行归位与自检'}</button><small>${itemState.verified?'全部恢复检查点已通过':'完成全部确认项后可执行'}</small></div></section>
      <section class="ops-section"><div class="ops-section-title"><h3>3. 恢复检查点</h3><span>由系统自动复核</span></div><ul class="checkpoint-list">${item.checkpoints.map(text=>`<li class="checkpoint-item ${itemState.verified?'':'pending'}">${text}</li>`).join('')}</ul></section>
      <section class="ops-section"><div class="ops-section-title"><h3>4. 选择恢复方式</h3><span>${itemState.verified?'请选择一种恢复方式':'检查点通过后可选'}</span></div><div class="recovery-options">${item.routes.map(route=>`<button class="recovery-option ${itemState.route===route[0]?'selected':''}" type="button" data-route="${route[0]}" ${itemState.verified&&!itemState.released?'':'disabled'}><strong>${route[1]}</strong><span>${route[2]}</span></button>`).join('')}</div></section>`;
    body.querySelectorAll('[data-check]').forEach(input=>input.addEventListener('change',()=>{input.checked?itemState.checks.add(Number(input.dataset.check)):itemState.checks.delete(Number(input.dataset.check));openWorkorder(id)}));
    body.querySelector('#verifyWorkorder')?.addEventListener('click',()=>{itemState.verified=true;openWorkorder(id);toast('归位与自检已完成')});
    body.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>{itemState.route=button.dataset.route;openWorkorder(id)}));
    updateReleaseButton(); openLayer('workorderModal');
  }

  function updateReleaseButton() { const button=document.getElementById('releaseWorkorder'); if(!button||!activeWorkorder)return; const itemState=state.get(activeWorkorder.id); button.disabled=itemState.released||!itemState.verified||!itemState.route; button.textContent=itemState.released?'已放行':'确认放行，恢复自动化'; }
  function filterWorkorders() { const keyword=document.getElementById('workorderKeyword').value.trim().toLowerCase(),level=document.getElementById('workorderLevel').value; renderWorkorders(workorders.filter(item=>(!level||item.level===level)&&(!keyword||[item.id,item.title,item.robot,item.node].join(' ').toLowerCase().includes(keyword)))); }

  function renderProcedures(list=procedures) {
    const body=document.getElementById('procedureBody'); if(!body)return;
    body.innerHTML=list.map(item=>{const related=tickets[item.id]||[];return `<tr class="clickable-row" data-procedure="${item.id}"><td class="ops-code">${item.id}</td><td><strong class="table-primary">${item.title}</strong><span class="table-secondary">${item.signal}</span></td><td>${scopeChip(item.scope)}</td><td>${item.duty}</td><td>${related.length?related.map(id=>`<a class="ticket-chip" href="exception-recovery.html?ticket=${id}" onclick="event.stopPropagation()">${id}</a>`).join(''):'<span class="table-secondary">—</span>'}</td></tr>`}).join('');
    if(document.getElementById('procedureSummary'))document.getElementById('procedureSummary').textContent='共 '+list.length+' 条急停规程';
    body.querySelectorAll('[data-procedure]').forEach(row=>row.addEventListener('click',()=>openProcedure(row.dataset.procedure)));
  }
  function openProcedure(id) { const item=procedures.find(rule=>rule.id===id); if(!item)return; const relatedTickets=tickets[item.id]||[],ticketLinks=relatedTickets.length?relatedTickets.map(ticket=>`<a class="ticket-chip procedure-ticket-link" href="exception-recovery.html?ticket=${encodeURIComponent(ticket)}" title="前往异常与恢复查看 ${ticket}">${ticket}<span>→</span></a>`).join(''):'暂无进行中的工单'; document.getElementById('procedureModalTitle').textContent=item.id+' · '+item.title; document.getElementById('procedureModalSubtitle').textContent='急停范围：'+item.scope+' · 处置责任：'+item.duty; document.getElementById('procedureRole').textContent='放行权限：'+item.duty; document.getElementById('procedureModalBody').innerHTML=`<div class="procedure-meta">${scopeChip(item.scope)}<span class="readonly-chip">只读规程</span></div><div class="ops-summary"><article class="ops-summary-item wide"><span>检测信号</span><strong>${item.signal}</strong></article><article class="ops-summary-item wide"><span>当前关联工单</span><strong>${ticketLinks}</strong></article></div><section class="ops-section"><div class="ops-section-title"><h3>1. 系统自动执行</h3><span>急停触发后立即完成</span></div><ol class="procedure-list">${item.auto.map(text=>`<li class="procedure-item">${text}</li>`).join('')}</ol></section><section class="ops-section"><div class="ops-section-title"><h3>2. 人工处置步骤</h3><span>在异常工单中逐项确认</span></div><ol class="procedure-list">${item.manual.map(text=>`<li class="procedure-item">${text}</li>`).join('')}</ol></section><section class="ops-section"><div class="ops-section-title"><h3>3. 恢复放行条件</h3><span>归位后由系统复核</span></div><ul class="checkpoint-list">${item.gates.map(text=>`<li class="checkpoint-item">${text}</li>`).join('')}</ul></section><div class="warning-note">${item.warning}</div>`; openLayer('procedureModal'); }
  function filterProcedures() { const keyword=document.getElementById('procedureKeyword').value.trim().toLowerCase(),scope=document.getElementById('procedureScope').value; renderProcedures(procedures.filter(item=>(!scope||item.scope===scope)&&(!keyword||[item.id,item.title,item.signal,item.duty].join(' ').toLowerCase().includes(keyword)))); }

  document.querySelectorAll('[data-close-ops]').forEach(button=>button.addEventListener('click',()=>closeLayer(button.closest('.modal-overlay').id)));
  document.querySelectorAll('.modal-overlay').forEach(layer=>layer.addEventListener('click',event=>{if(event.target===layer)closeLayer(layer.id)}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){const layer=document.querySelector('.modal-overlay.open');if(layer)closeLayer(layer.id)}});

  if(document.body.dataset.exceptionOperations==='workorders') {
    renderWorkorders();
    document.getElementById('releaseWorkorder').addEventListener('click',()=>{if(!activeWorkorder)return;state.get(activeWorkorder.id).released=true;updateReleaseButton();renderWorkorders();toast(activeWorkorder.id+' 已放行并恢复自动化')});
    const requested=new URLSearchParams(location.search).get('ticket'); if(requested&&workorders.some(item=>item.id===requested))openWorkorder(requested);
  } else {
    renderProcedures();
    const requested=new URLSearchParams(location.search).get('rule'); if(requested&&procedures.some(item=>item.id===requested))openProcedure(requested);
  }
}());
