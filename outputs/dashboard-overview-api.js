import { dashboardOverviewEndpoint, getDashboardOverview } from './assets/data/dashboard-data.js';

(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=typeof window.DASHBOARD_OVERVIEW_API_BASE_URL==='string'
    ?window.DASHBOARD_OVERVIEW_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=dashboardOverviewEndpoint(apiBaseUrl);
  const agvCard=document.querySelector('[data-overview-card="agv"]');
  const orderCard=document.querySelector('[data-overview-card="orders"]');
  const locationCard=document.querySelector('[data-overview-card="locations"]');
  const taskCard=document.querySelector('[data-overview-card="tasks"]');
  const moduleSection=document.getElementById('hardwareModuleSection');
  const moduleTitle=document.getElementById('hardwareModuleTitle');
  const moduleList=document.getElementById('hardwareModuleList');
  if(!agvCard||!orderCard||!locationCard||!taskCard||!moduleSection||!moduleTitle||!moduleList)return;

  const executionLabels={
    EXECUTING:'执行中',
    RUNNING:'执行中',
    IDLE:'空闲',
    STANDBY:'待命',
    CHARGING:'充电中',
    PAUSED:'已暂停',
    ERROR:'异常',
    OFFLINE:'离线'
  };
  const sourceLabels={UPSTREAM:'上游下发',MES:'MES 下发',LIMS:'LIMS 下发',MANUAL:'人工下发'};
  const moduleThumbs={CHASSIS:'thumb-1',ROBOT_ARM:'thumb-2',VISION:'thumb-3',GRIPPER:'thumb-4',SCANNER:'thumb-5'};

  let currentData=null;
  let controller=null;

  function clampPercent(value){
    const number=Number(value);
    return Number.isFinite(number)?Math.max(0,Math.min(100,number)):0;
  }

  function displayNumber(value,fallback){
    const number=Number(value);
    return Number.isFinite(number)?number:(fallback??0);
  }

  function setValue(card,value){
    const node=card.querySelector('.stat-value');
    if(node)node.textContent=value;
  }

  function setCaption(card,value){
    const node=card.querySelector('.meter-row b');
    if(node)node.textContent=value;
  }

  function setMeter(card,value){
    const meter=card.querySelector('.meter span');
    if(meter)meter.style.setProperty('--value',clampPercent(value)+'%');
  }

  function setStatusPill(pill,label,state){
    if(!pill)return;
    pill.classList.toggle('offline',state==='offline');
    pill.classList.toggle('loading',state==='loading');
    const dot=document.createElement('i');dot.className='dot';pill.replaceChildren(dot,document.createTextNode(label));
  }

  function setLoading(){
    [agvCard,orderCard,locationCard,taskCard].forEach(card=>{setValue(card,'加载中…');setCaption(card,'--');card.querySelector('.stat-value')?.classList.add('overview-loading');setMeter(card,0)});
    setStatusPill(agvCard.querySelector('.status-pill'),'连接中…','loading');
    orderCard.querySelector('.queue-meter')?.replaceChildren();
    moduleSection.setAttribute('aria-busy','true');moduleTitle.textContent='硬件模组状态';moduleList.innerHTML='<div class="module-loading">正在加载运行总览数据…</div>';
  }

  function renderAgv(value){
    const agv=value||{};
    const online=Boolean(agv.online);
    const execution=online?(executionLabels[agv.executionStatus]||agv.executionStatus||'在线'):'离线';
    const battery=clampPercent(agv.batteryPercent);
    setStatusPill(agvCard.querySelector('.status-pill'),online?'在线':'离线',online?'online':'offline');
    setValue(agvCard,(agv.agvCode||'AGV')+' · '+execution);
    setMeter(agvCard,battery);
    setCaption(agvCard,'电量'+battery+'%');
    return agv.agvCode||'AGV';
  }

  function renderOrders(value){
    const orders=value||{};
    const executing=displayNumber(orders.executingCount);
    const queued=displayNumber(orders.queuedCount);
    setValue(orderCard,executing+' 个执行 / '+queued+' 个排队');
    setCaption(orderCard,sourceLabels[orders.source]||orders.source||'订单来源未知');
    const meter=orderCard.querySelector('.queue-meter');
    if(meter){
      meter.innerHTML='';
      const segmentCount=Math.max(4,Math.min(8,executing+queued||4));
      for(let index=0;index<segmentCount;index+=1){const segment=document.createElement('span');if(index<executing)segment.className='active';meter.appendChild(segment)}
    }
  }

  function renderLocations(value){
    const locations=value||{};
    const rate=clampPercent(locations.rate);
    const pending=displayNumber(locations.pendingConfirmationCount);
    setValue(locationCard,rate+'%');setMeter(locationCard,rate);setCaption(locationCard,pending+' 处待确认');
  }

  function renderTasks(value){
    const tasks=value||{};
    const completed=displayNumber(tasks.completedCount);
    const total=displayNumber(tasks.totalCount);
    const rate=clampPercent(tasks.completionRate);
    setValue(taskCard,completed+' / '+total);setMeter(taskCard,rate);setCaption(taskCard,rate+'%');
  }

  function renderModules(items,agvCode){
    moduleTitle.textContent=agvCode+' 硬件模组状态';
    moduleList.innerHTML='';
    const modules=Array.isArray(items)?items:[];
    if(!modules.length){moduleList.innerHTML='<div class="module-error">暂无硬件模组数据</div>';return}
    modules.forEach((item,index)=>{
      const online=Boolean(item.online);
      const card=document.createElement('article');card.className='module-card'+(online?'':' offline');
      const thumb=document.createElement('div');thumb.className='module-thumb '+(moduleThumbs[item.code]||('thumb-'+((index%5)+1)));thumb.setAttribute('aria-label',(item.name||item.code||'硬件模组')+'设备缩略图');
      const copy=document.createElement('div');copy.className='module-copy';
      const name=document.createElement('strong');name.textContent=item.name||item.code||'未命名模组';
      const status=document.createElement('span');status.textContent=online?'在线':'离线';if(!online)status.className='offline';
      copy.append(name,status);card.append(thumb,copy);moduleList.appendChild(card);
    });
  }

  function render(data){
    [agvCard,orderCard,locationCard,taskCard].forEach(card=>card.querySelector('.stat-value')?.classList.remove('overview-loading'));
    const agvCode=renderAgv(data.agvStatus);renderOrders(data.currentOrder);renderLocations(data.locationConsistency);renderTasks(data.todayTaskCompletion);renderModules(data.hardwareModules,agvCode);moduleSection.removeAttribute('aria-busy');
  }

  function renderError(error){
    [agvCard,orderCard,locationCard,taskCard].forEach(card=>{setValue(card,'加载失败');setCaption(card,'请检查后端服务');card.querySelector('.stat-value')?.classList.remove('overview-loading')});
    setStatusPill(agvCard.querySelector('.status-pill'),'不可用','offline');moduleTitle.textContent='硬件模组状态';moduleList.innerHTML='<div class="module-error">运行总览加载失败：'+String(error.message||error).replace(/[<>]/g,'')+'</div>';moduleSection.removeAttribute('aria-busy');
  }

  async function load(){
    if(controller)controller.abort();
    controller=new AbortController();
    const activeController=controller;
    setLoading();
    try{
      const result=await getDashboardOverview({baseUrl:apiBaseUrl,signal:activeController.signal,timeout:30000});
      if(!result.data)throw new Error('接口未返回运行总览数据');
      currentData=result.data;render(currentData);window.__dashboardOverviewApi.data=currentData;
    }catch(error){
      if(error.name==='AbortError')return;
      console.error('加载运行总览数据失败',error);currentData=null;renderError(error);
      if(typeof window.showToast==='function')window.showToast('运行总览加载失败：'+error.message);
    }
  }

  window.__dashboardOverviewApi={endpoint,data:currentData,reload:load};
  load();
})();
