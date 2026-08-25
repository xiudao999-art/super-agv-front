(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=typeof window.ORDER_DETAIL_API_BASE_URL==='string'
    ?window.ORDER_DETAIL_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const baseUrl=apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'';
  const endpoint=baseUrl+'/api/detail';
  const params=new URLSearchParams(location.search);
  const orderId=Number(params.get('id'));
  const requestedTask=params.get('task');
  const orderSelect=document.getElementById('orderSelect');
  const taskBody=document.getElementById('taskBody');
  const actionBody=document.getElementById('actionBody');
  const taskSummary=document.getElementById('taskSummary');
  const actionSummary=document.getElementById('actionSummary');
  const summaryOrder=document.getElementById('summaryOrder');
  const summarySystem=document.getElementById('summarySystem');
  const summaryStatus=document.getElementById('summaryStatus');
  const stepBadge=document.getElementById('stepBadge');
  const configList=document.getElementById('configList');
  const errorNote=document.getElementById('orderErrorNote');
  const searchButton=document.getElementById('searchOrder');
  const resetButton=document.getElementById('resetOrder');
  if(!orderSelect||!taskBody||!actionBody||!taskSummary||!actionSummary||!summaryOrder||!summarySystem||!summaryStatus||!stepBadge||!configList||!errorNote)return;

  const statusMeta={
    QUEUED:{label:'排队中',className:'waiting'},
    RUNNING:{label:'执行中',className:'executing'},
    SUCCEEDED:{label:'已完成',className:'completed'},
    FAILED:{label:'失败',className:'failed'},
    CANCELLED:{label:'已取消',className:'cancelled'},
    PENDING:{label:'待执行',className:'waiting'},
    EXECUTING:{label:'执行中',className:'executing'},
    COMPLETED:{label:'已完成',className:'completed'}
  };

  const style=document.createElement('style');
  style.textContent='.status-failed{color:var(--red);border-color:#f4cfcd;background:#fff5f4}.status-cancelled{color:#8d949c;border-color:#e1e5e8;background:#f7f8f9}.detail-loading-cell{height:112px!important;text-align:center}.detail-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.detail-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:detail-loading-spin .7s linear infinite}.detail-empty{text-align:center;color:var(--muted)}.config-loading{display:flex;align-items:center;justify-content:center;min-height:100px;color:var(--muted);font-size:12px}@keyframes detail-loading-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  let detail=null;
  let selectedTaskId=null;
  let controller=null;

  function notify(message){if(typeof showToast==='function')showToast(message)}
  function parseApiResponse(response){return response.text().then(text=>{if(!text)return{};try{return JSON.parse(text)}catch(error){return{message:text}}})}
  function checkApiResult(response,result){if(!response.ok)throw new Error(result.message||result.error||('HTTP '+response.status));if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code))}
  function statusInfo(value){return statusMeta[value]||{label:value||'-',className:'cancelled'}}

  function formatTime(value){
    if(!value)return'-';
    const text=String(value);
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text))return text.replace('T',' ');
    const date=new Date(text);if(Number.isNaN(date.getTime()))return text.replace('T',' ');
    return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date).replaceAll('/','-');
  }

  function setTableMessage(body,colSpan,message,loading){
    body.innerHTML='';const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=colSpan;
    if(loading){cell.className='detail-loading-cell';const indicator=document.createElement('div');indicator.className='detail-loading';indicator.textContent=message;cell.appendChild(indicator)}else{cell.className='detail-empty';cell.textContent=message}
    row.appendChild(cell);body.appendChild(row);
  }

  function textCell(row,value){const cell=document.createElement('td');cell.textContent=value===null||value===undefined||value===''?'-':String(value);row.appendChild(cell)}
  function statusCell(row,value){const meta=statusInfo(value),cell=document.createElement('td'),tag=document.createElement('span');tag.className='status-tag status-'+meta.className;tag.textContent=meta.label;cell.appendChild(tag);row.appendChild(cell)}

  function setLoading(){
    setTableMessage(taskBody,7,'正在加载订单详情…',true);setTableMessage(actionBody,5,'正在加载动作链…',true);taskSummary.textContent='正在加载…';actionSummary.textContent='正在加载…';summaryOrder.textContent='--';summarySystem.textContent='--';summaryStatus.textContent='加载中…';stepBadge.textContent='加载中…';stepBadge.className='status-tag status-waiting current-step';orderSelect.innerHTML='<option>正在加载订单…</option>';orderSelect.disabled=true;configList.innerHTML='<div class="config-loading">正在加载执行配置…</div>';
  }

  function selectTask(task){
    selectedTaskId=task?.id??null;
    renderTasks();renderSummary(task);renderActions();renderConfig();
    const order=detail?.order||{};
    const query=new URLSearchParams({id:String(order.id||orderId),order:String(order.upstreamOrderNo||order.systemOrderNo||''),task:String(task?.taskNumber||'')});
    history.replaceState(null,'','?'+query.toString());
  }

  function renderTasks(){
    const order=detail.order||{},tasks=Array.isArray(detail.tasks)?[...detail.tasks].sort((a,b)=>(Number(a.taskSeq)||0)-(Number(b.taskSeq)||0)):[];
    taskBody.innerHTML='';
    if(!tasks.length){setTableMessage(taskBody,7,'当前订单暂无任务数据',false);taskSummary.textContent='共计 0 条数据';return}
    tasks.forEach(task=>{
      const row=document.createElement('tr');if(String(task.id)===String(selectedTaskId))row.className='selected';row.dataset.id=String(task.id);
      textCell(row,task.taskNumber);textCell(row,task.flowNumber);textCell(row,order.upstreamOrderNo);textCell(row,order.systemOrderNo);statusCell(row,task.status);textCell(row,task.currentStep||task.taskName);textCell(row,formatTime(task.startedAt||task.updatedAt||order.issuedAt));
      row.addEventListener('click',()=>selectTask(task));taskBody.appendChild(row);
    });
    taskSummary.textContent='共计 '+tasks.length+' 条数据';
  }

  function renderSummary(task){
    const order=detail.order||{},meta=statusInfo(task?.status||order.status);
    summaryOrder.textContent=order.upstreamOrderNo||'-';summarySystem.textContent=order.systemOrderNo||'-';summaryStatus.textContent=meta.label;stepBadge.textContent=task?.currentStep||task?.taskName||'暂无当前任务';stepBadge.className='status-tag status-'+meta.className+' current-step';
  }

  function renderActions(){
    const actions=Array.isArray(detail.executionConfig?.actions)?[...detail.executionConfig.actions].sort((a,b)=>(Number(a.sort)||0)-(Number(b.sort)||0)):[];
    actionBody.innerHTML='';
    if(!actions.length){setTableMessage(actionBody,5,'当前执行配置暂无动作链数据',false);actionSummary.textContent='共计 0 条数据';return}
    actions.forEach(action=>{const row=document.createElement('tr');textCell(row,action.sort??action.nodeId);textCell(row,action.nodeName);textCell(row,action.nodeCode);statusCell(row,action.status);textCell(row,action.completionCriteria||action.failureStrategy);actionBody.appendChild(row)});
    actionSummary.textContent='共计 '+actions.length+' 条数据';
  }

  function addConfig(label,value){const item=document.createElement('article');item.className='config-item';const title=document.createElement('strong'),content=document.createElement('p');title.textContent=label;content.textContent=value===null||value===undefined||value===''?'-':String(value);item.append(title,content);configList.appendChild(item)}
  function renderConfig(){
    const config=detail.executionConfig||{};configList.innerHTML='';
    addConfig('流程',(config.flowNumber||'-')+(config.flowName?' · '+config.flowName:''));
    addConfig('流程模板',(config.flowTemplateName||'-')+(config.flowTemplateId?' · #'+config.flowTemplateId:''));
    addConfig('完整路径',config.completePath);addConfig('点位配置',config.pointConfiguration);addConfig('异常策略',config.failureStrategy);
    if(detail.errorCode||detail.errorMessage){errorNote.textContent=(detail.errorCode?detail.errorCode+'：':'')+(detail.errorMessage||'订单执行异常');errorNote.style.color='var(--red)';errorNote.style.background='#fff5f4'}else{errorNote.textContent='取料、放料等可能改变物理状态的动作超时后，先查询现场证据，不直接重复执行。';errorNote.style.color='';errorNote.style.background=''}
  }

  function render(){
    const order=detail.order||{};orderSelect.innerHTML='';const option=document.createElement('option');option.value=String(order.id||orderId);option.textContent=(order.upstreamOrderNo||'-')+' / '+(order.systemOrderNo||'-');orderSelect.appendChild(option);orderSelect.disabled=false;
    const tasks=Array.isArray(detail.tasks)?detail.tasks:[];
    const requested=tasks.find(task=>String(task.taskNumber)===String(requestedTask)||String(task.id)===String(requestedTask));
    const current=detail.currentTask&&tasks.find(task=>String(task.id)===String(detail.currentTask.id));
    selectTask(requested||current||tasks[0]||detail.currentTask||null);
  }

  function renderError(error){
    setTableMessage(taskBody,7,'订单详情加载失败：'+error.message,false);setTableMessage(actionBody,5,'暂无动作链数据',false);taskSummary.textContent='加载失败';actionSummary.textContent='共计 0 条数据';summaryOrder.textContent='-';summarySystem.textContent='-';summaryStatus.textContent='加载失败';stepBadge.textContent='不可用';stepBadge.className='status-tag status-failed current-step';orderSelect.innerHTML='<option>订单详情不可用</option>';orderSelect.disabled=true;configList.innerHTML='';addConfig('加载失败',error.message);errorNote.textContent='请返回订单列表重新选择订单，或检查后端详情接口。';
  }

  async function load(){
    if(!Number.isInteger(orderId)||orderId<1){const error=new Error('缺少有效的订单 ID，请从订单列表进入详情');renderError(error);notify(error.message);return}
    if(controller)controller.abort();controller=new AbortController();const activeController=controller;setLoading();
    try{const response=await fetch(endpoint+'?'+new URLSearchParams({id:String(orderId)}),{headers:{Accept:'application/json'},signal:activeController.signal}),result=await parseApiResponse(response);checkApiResult(response,result);if(!result.data?.order)throw new Error('接口未返回订单详情');detail=result.data;render();window.__orderDetailApi.detail=detail}
    catch(error){if(error.name==='AbortError')return;console.error('加载订单详情失败',error);detail=null;renderError(error);notify('订单详情加载失败：'+error.message)}
  }

  function intercept(element,handler){if(!element)return;element.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();handler()},true)}
  intercept(searchButton,load);intercept(resetButton,load);
  window.__orderDetailApi={endpoint,orderId,detail,reload:load};
  load();
})();
