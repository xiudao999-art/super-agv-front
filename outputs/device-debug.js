(function(){
  'use strict';

  let debugMode=false;
  let toastTimer;
  let selectedAgv='AGV-01';
  let pendingRecoveryAction=null;
  const agvProfiles={
    'AGV-01':{x:18.4,y:3.2,yaw:90,left:47,top:62},
    'AGV-02':{x:12.8,y:5.6,yaw:0,left:35,top:49},
    'AGV-03':{x:25.2,y:7.1,yaw:180,left:64,top:38},
    'AGV-04':{x:8.6,y:2.4,yaw:90,left:24,top:68},
    'AGV-05':{x:29.1,y:4.8,yaw:-90,left:72,top:54},
    'AGV-06':{x:16.3,y:8.2,yaw:180,left:43,top:31},
    'AGV-07':{x:21.7,y:6.4,yaw:0,left:56,top:43},
    'AGV-08':{x:5.4,y:7.8,yaw:90,left:17,top:34},
    'AGV-09':{x:31.6,y:1.8,yaw:180,left:78,top:73}
  };
  const position={x:18.4,y:3.2,yaw:90,left:47,top:62};
  const toast=document.getElementById('toast');
  const modeTitle=document.getElementById('debugModeTitle');
  const modeDescription=document.getElementById('debugModeDescription');
  const modeChip=document.getElementById('debugModeChip');
  const flowModeTitle=document.getElementById('flowModeTitle');
  const flowModeChip=document.getElementById('flowModeChip');
  const toggleButton=document.getElementById('toggleDebugMode');

  function showToast(message){
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
  }

  function openLayer(id){
    const layer=document.getElementById(id);
    if(!layer)return;
    layer.hidden=false;
    document.body.style.overflow='hidden';
    requestAnimationFrame(()=>layer.classList.add('open'));
  }

  function closeLayer(id){
    const layer=document.getElementById(id);
    if(!layer)return;
    layer.classList.remove('open');
    document.body.style.overflow='';
    setTimeout(()=>layer.hidden=true,220);
  }

  function syncDebugMode(){
    document.querySelectorAll('.debug-control').forEach(control=>control.disabled=!debugMode);
    document.querySelectorAll('[data-agv-select]').forEach(select=>select.disabled=debugMode);
    modeTitle.textContent=debugMode?'当前处于设备调试模式':'当前处于生产模式';
    modeDescription.textContent=debugMode?'可使用当前页面的调试控制；退出时执行安全复位。':'进入调试模式后启用控制按钮。';
    modeChip.textContent=debugMode?'调试模式':'生产模式';
    modeChip.className='status-chip '+(debugMode?'warning':'success');
    flowModeTitle.textContent=debugMode?'当前处于设备调试模式':'当前处于生产模式';
    flowModeChip.textContent=debugMode?'调试模式':'生产模式';
    flowModeChip.className='status-chip '+(debugMode?'warning':'success');
    toggleButton.textContent=debugMode?'退出调试并安全复位':'进入设备调试模式';
    toggleButton.className='debug-button '+(debugMode?'primary':'danger');
    document.querySelectorAll('[data-control-state-chip]').forEach(chip=>{
      chip.textContent=debugMode?'允许点动':'点动已锁定';
      chip.className='status-chip '+(debugMode?'warning':'info');
    });
  }

  function updatePosition(){
    document.getElementById('debugRobot').style.left=position.left+'%';
    document.getElementById('debugRobot').style.top=position.top+'%';
    document.getElementById('mapXValue').textContent=position.x.toFixed(3)+' m';
    document.getElementById('mapYValue').textContent=position.y.toFixed(3)+' m';
    document.getElementById('mapYawValue').textContent=position.yaw.toFixed(1)+'°';
    document.getElementById('mapXChip').textContent='X '+position.x.toFixed(3)+' m';
    document.getElementById('mapYChip').textContent='Y '+position.y.toFixed(3)+' m';
    document.getElementById('mapYawChip').textContent='θ '+position.yaw.toFixed(1)+'°';
  }

  function deviceLabel(prefix,suffix){
    if(prefix==='ARM')return '协作机械臂 ARM-'+suffix;
    if(prefix==='GRIPPER-DH')return '电动夹具 GRIPPER-DH-'+suffix;
    return prefix+'-'+suffix;
  }

  function syncSelectedAgv(value,notify=false){
    if(!agvProfiles[value])return;
    selectedAgv=value;
    const suffix=value.slice(-2);
    document.querySelectorAll('[data-agv-select]').forEach(select=>select.value=value);
    document.querySelectorAll('[data-selected-agv]').forEach(element=>element.textContent=value);
    document.querySelectorAll('[data-device-prefix]').forEach(element=>element.textContent=deviceLabel(element.dataset.devicePrefix,suffix));
    document.querySelectorAll('[data-agv-map-title]').forEach(element=>element.textContent=value+' 方向控制');
    const robot=document.getElementById('debugRobot');
    robot.dataset.label=value;
    robot.setAttribute('aria-label',value+' 当前点位');
    Object.assign(position,agvProfiles[value]);
    updatePosition();
    if(notify)showToast('已切换到 '+value+'，各硬件模组已同步');
  }

  toggleButton.addEventListener('click',()=>{
    debugMode=!debugMode;
    syncDebugMode();
    showToast(debugMode?'已进入设备调试模式':'安全复位完成，已返回生产模式');
  });

  document.querySelectorAll('[data-agv-select]').forEach(select=>select.addEventListener('change',()=>syncSelectedAgv(select.value,true)));

  document.querySelectorAll('[data-debug-tab]').forEach(button=>button.addEventListener('click',()=>{
    const hardware=button.dataset.debugTab==='hardware';
    document.querySelectorAll('[data-debug-tab]').forEach(tab=>{
      const active=tab===button;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    document.getElementById('hardwarePanel').hidden=!hardware;
    document.getElementById('flowPanel').hidden=hardware;
  }));

  document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{
    const module=button.dataset.module;
    document.querySelectorAll('[data-module]').forEach(tab=>{
      const active=tab===button;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('[data-module-panel]').forEach(panel=>panel.hidden=panel.dataset.modulePanel!==module);
  }));

  document.querySelectorAll('[data-chassis-jog]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.chassisJog;
    if(action==='forward'){position.y+=.1;position.top=Math.max(8,position.top-1.2)}
    if(action==='back'){position.y-=.1;position.top=Math.min(92,position.top+1.2)}
    if(action==='left'){position.x-=.1;position.left=Math.max(8,position.left-1.2);position.yaw=180}
    if(action==='right'){position.x+=.1;position.left=Math.min(92,position.left+1.2);position.yaw=0}
    if(action==='forward')position.yaw=90;
    if(action==='back')position.yaw=-90;
    updatePosition();
    showToast(action==='stop'?'底盘运动已停止':'底盘点动指令已执行');
  }));

  document.querySelectorAll('.sub-tab').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.sub-tab').forEach(tab=>tab.classList.toggle('active',tab===button));
    showToast('已切换至'+button.textContent.trim());
  }));

  const armSpeed=document.getElementById('armSpeed');
  armSpeed.addEventListener('input',()=>document.getElementById('armSpeedOutput').textContent=armSpeed.value+'%');

  document.querySelectorAll('[data-camera-action]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-camera-action]').forEach(item=>item.classList.toggle('active',item===button));
  }));

  document.querySelectorAll('[data-gripper-range]').forEach(input=>input.addEventListener('input',()=>{
    input.parentElement.querySelector('output').textContent=input.value+'%';
    if(input.dataset.gripperRange==='opening')document.getElementById('gripperOpeningText').textContent=input.value+'%';
  }));

  document.querySelectorAll('[data-gripper-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.gripperAction;
    if(action==='初始化'){
      const chip=document.getElementById('gripperStateChip');
      chip.textContent='已初始化';
      chip.className='status-chip success';
    }
    showToast(action+'指令已执行');
  }));

  document.querySelectorAll('[data-debug-action]').forEach(button=>button.addEventListener('click',()=>showToast(button.dataset.debugAction+'已触发')));

  document.querySelectorAll('[data-recovery-action]').forEach(button=>button.addEventListener('click',()=>{
    const action={
      name:button.dataset.recoveryAction,
      module:button.dataset.recoveryModule,
      issue:button.dataset.recoveryIssue
    };
    if(button.dataset.recoveryConfirm!=='true'){
      showToast(selectedAgv+' · '+action.name+'指令已触发');
      return;
    }
    pendingRecoveryAction=action;
    document.getElementById('recoveryTitle').textContent='确认'+action.name;
    document.getElementById('recoveryIssue').textContent='适用情况：'+action.issue;
    document.getElementById('recoveryAgv').textContent=selectedAgv;
    document.getElementById('recoveryModule').textContent=action.module;
    document.getElementById('recoveryAction').textContent=action.name;
    openLayer('recoveryModal');
  }));

  document.getElementById('confirmRecoveryAction').addEventListener('click',()=>{
    if(!pendingRecoveryAction)return;
    const actionName=pendingRecoveryAction.name;
    pendingRecoveryAction=null;
    closeLayer('recoveryModal');
    showToast(selectedAgv+' · '+actionName+'指令已执行');
  });

  document.querySelectorAll('[data-flow-node]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-flow-node]').forEach(node=>{
      const active=node===button;
      node.classList.toggle('active',active);
      const chip=node.querySelector('.status-chip');
      if(!['开始','结束'].includes(node.dataset.flowNode)){
        chip.textContent=active?'已选择':'未选择';
        chip.className='status-chip '+(active?'success':'info');
      }
    });
    document.getElementById('flowEditorTitle').textContent=button.dataset.flowNode;
  }));

  document.getElementById('statusInfoBtn').addEventListener('click',()=>openLayer('statusModal'));
  document.getElementById('alertInfoBtn').addEventListener('click',()=>openLayer('alertDrawer'));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeLayer(button.dataset.close)));
  document.querySelectorAll('.modal-overlay,.alert-overlay').forEach(layer=>layer.addEventListener('click',event=>{if(event.target===layer)closeLayer(layer.id)}));
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!document.getElementById('alertDrawer').hidden)closeLayer('alertDrawer');
    else if(!document.getElementById('statusModal').hidden)closeLayer('statusModal');
  });

  syncDebugMode();
  syncSelectedAgv(selectedAgv);
})();
