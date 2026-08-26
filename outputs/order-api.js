import { createOrder as requestCreateOrder, getFlows, getOrders, orderCreateEndpoint, ordersEndpoint, ordersSyncEndpoint, syncOrders as requestOrderSync } from './assets/data/orders-data.js';

(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=typeof window.ORDER_API_BASE_URL==='string'
    ?window.ORDER_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=ordersEndpoint(apiBaseUrl);
  const syncEndpoint=ordersSyncEndpoint(apiBaseUrl);
  const createEndpoint=orderCreateEndpoint(apiBaseUrl);
  const body=document.getElementById('ordersBody');
  const statusFilter=document.getElementById('statusFilter');
  const sourceFilter=document.getElementById('sourceFilter');
  const orderQuery=document.getElementById('orderQuery');
  const pageSizeSelect=document.getElementById('pageSize');
  const pageNumbers=document.getElementById('pageNumbers');
  const pageSummary=document.getElementById('pageSummary');
  const prevPage=document.getElementById('prevPage');
  const nextPage=document.getElementById('nextPage');
  const searchButton=document.getElementById('searchOrders');
  const resetButton=document.getElementById('resetFilters');
  const syncButton=document.getElementById('syncOrders');
  const createButton=document.getElementById('createOrderBtn');
  const createModal=document.getElementById('createOrderModal');
  const createForm=document.getElementById('createOrderForm');
  const orderNoInput=document.getElementById('manualOrderNo');
  const sourceInput=document.getElementById('orderSource');
  const priorityInput=document.getElementById('orderPriority');
  const taskCountInput=document.getElementById('orderTaskCount');
  const taskRows=document.getElementById('createTaskRows');
  const flowLoadState=document.getElementById('flowLoadState');
  const createFeedback=document.getElementById('createOrderFeedback');
  const createSubmit=document.getElementById('createOrderSubmit');
  const createCancel=document.getElementById('cancelCreateOrder');
  const detailModal=document.getElementById('orderDetailModal');
  const detailTitle=document.getElementById('orderDetailTitle');
  const detailCloseX=document.getElementById('orderDetailCloseX');
  const detailClose=document.getElementById('orderDetailClose');
  const viewOrderTasks=document.getElementById('viewOrderTasks');
  const requestOrderCancel=document.getElementById('requestOrderCancel');
  if(!body||!statusFilter||!orderQuery||!pageSizeSelect||!pageNumbers||!pageSummary||!prevPage||!nextPage)return;

  let currentPage=1;
  let pageSize=Number(pageSizeSelect.value)||10;
  let total=0;
  let records=[];
  let loading=false;
  let syncing=false;
  let listController=null;
  let availableFlows=null;
  let flowLoading=false;
  let creating=false;
  let selectedOrder=null;
  let detailTrigger=null;

  const statusMeta={
    QUEUED:{label:'排队中',className:'queued'},
    RUNNING:{label:'执行中',className:'executing'},
    SUCCEEDED:{label:'已完成',className:'completed'},
    FAILED:{label:'失败',className:'failed'},
    CANCELLED:{label:'已取消',className:'cancelled'}
  };

  function showMessage(message){
    if(typeof showToast==='function')showToast(message);
  }

  function setCreateFeedback(message){
    if(!createFeedback)return;
    createFeedback.textContent=message||'';
    createFeedback.hidden=!message;
  }

  function updateCreateSubmit(){
    if(createSubmit)createSubmit.disabled=creating||flowLoading||!availableFlows?.length;
  }

  function taskDrafts(){
    if(!taskRows)return[];
    return[...taskRows.querySelectorAll('.create-task-row')].map(row=>({
      taskName:row.querySelector('[data-task-name]')?.value||'',
      flowTemplateId:row.querySelector('[data-task-flow]')?.value||''
    }));
  }

  function renderTaskRows(){
    if(!taskRows||!taskCountInput)return;
    const drafts=taskDrafts();
    const parsed=Number(taskCountInput.value);
    const count=Number.isInteger(parsed)?Math.max(1,Math.min(10,parsed)):1;
    taskCountInput.value=String(count);
    taskRows.innerHTML='';
    for(let index=0;index<count;index+=1){
      const sequence=index+1;
      const draft=drafts[index]||{};
      const row=document.createElement('div');row.className='create-task-row';
      const sequenceLabel=document.createElement('span');sequenceLabel.className='task-sequence';sequenceLabel.textContent='#'+sequence;
      const nameField=document.createElement('label');nameField.className='task-field';nameField.innerHTML='<span>\u4efb\u52a1\u540d\u79f0</span>';
      const name=document.createElement('input');name.type='text';name.required=true;name.maxLength=100;name.dataset.taskName='';name.value=draft.taskName||('\u4efb\u52a1 '+sequence);nameField.appendChild(name);
      const templateField=document.createElement('label');templateField.className='task-field';templateField.innerHTML='<span>\u6d41\u7a0b</span>';
      const select=document.createElement('select');select.required=true;select.dataset.taskFlow='';select.disabled=flowLoading||!availableFlows?.length;
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=flowLoading?'\u6b63\u5728\u52a0\u8f7d\u6d41\u7a0b\u2026':'\u8bf7\u9009\u62e9\u6d41\u7a0b';select.appendChild(placeholder);
      (availableFlows||[]).forEach(flow=>{const option=document.createElement('option');option.value=String(flow.id);option.textContent=(flow.flowName||'\u672a\u547d\u540d\u6d41\u7a0b')+' \u00b7 '+(flow.flowNumber||'-')+(flow.templateName?' \u00b7 '+flow.templateName:'')+' \u00b7 ID '+flow.id;select.appendChild(option)});
      if(draft.flowTemplateId&&[...select.options].some(option=>option.value===draft.flowTemplateId))select.value=draft.flowTemplateId;
      templateField.appendChild(select);row.append(sequenceLabel,nameField,templateField);taskRows.appendChild(row);
    }
    updateCreateSubmit();
  }

  async function loadFlows(){
    if(flowLoading||availableFlows)return;
    flowLoading=true;flowLoadState.textContent='\u6b63\u5728\u52a0\u8f7d\u6d41\u7a0b\u2026';setCreateFeedback('');renderTaskRows();
    try{
      const templates=[];
      let pageNum=1,total=0;
      do{
        const result=await getFlows({pageNum:String(pageNum),pageSize:'100'},{baseUrl:apiBaseUrl,timeout:30000});
        const page=result.data||result||{};
        const records=Array.isArray(page.records)?page.records:[];
        templates.push(...records);total=Number(page.total)||templates.length;
        if(!records.length)break;
        pageNum+=1;
      }while(templates.length<total);
      const seen=new Set();
      availableFlows=templates.filter(flow=>flow.id!==null&&flow.id!==undefined&&!seen.has(String(flow.id))&&seen.add(String(flow.id)));
      flowLoadState.textContent=availableFlows.length?'\u5df2\u52a0\u8f7d '+availableFlows.length+' \u4e2a\u6d41\u7a0b':'\u6682\u65e0\u53ef\u7528\u6d41\u7a0b';
      if(!availableFlows.length)setCreateFeedback('\u6682\u65e0\u53ef\u7528\u6d41\u7a0b\uff0c\u65e0\u6cd5\u521b\u5efa\u8ba2\u5355');
    }catch(error){
      console.error('\u52a0\u8f7d\u6d41\u7a0b\u5931\u8d25',error);availableFlows=null;flowLoadState.textContent='\u6d41\u7a0b\u52a0\u8f7d\u5931\u8d25';setCreateFeedback('\u6d41\u7a0b\u52a0\u8f7d\u5931\u8d25\uff1a'+error.message);showMessage('\u6d41\u7a0b\u52a0\u8f7d\u5931\u8d25\uff1a'+error.message);
    }finally{
      flowLoading=false;renderTaskRows();
    }
  }

  function resetCreateForm(){
    createForm?.reset();
    if(taskCountInput)taskCountInput.value='1';
    setCreateFeedback('');renderTaskRows();
  }

  function openCreateModal(){
    if(!createModal)return;
    resetCreateForm();createModal.hidden=false;document.body.style.overflow='hidden';requestAnimationFrame(()=>{createModal.classList.add('open');orderNoInput?.focus()});loadFlows();
  }

  function closeCreateModal(){
    if(!createModal||creating)return;
    createModal.classList.remove('open');document.body.style.overflow='';setTimeout(()=>{createModal.hidden=true;createButton?.focus()},200);
  }

  async function submitCreateOrder(event){
    event.preventDefault();
    if(creating||!createForm?.reportValidity()||!availableFlows?.length)return;
    const tasks=taskDrafts().map((task,index)=>({taskSeq:index+1,taskName:task.taskName.trim(),flowTemplateId:Number(task.flowTemplateId)}));
    if(tasks.some(task=>!task.taskName||!Number.isInteger(task.flowTemplateId)||task.flowTemplateId<=0))return setCreateFeedback('\u8bf7\u5b8c\u6574\u586b\u5199\u6bcf\u4e2a\u4efb\u52a1\u7684\u540d\u79f0\u5e76\u9009\u62e9\u6d41\u7a0b');
    const payload={upstreamOrderNo:orderNoInput.value.trim(),source:sourceInput.value,priority:Number(priorityInput.value),tasks};
    if(!payload.upstreamOrderNo)return setCreateFeedback('\u8bf7\u586b\u5199\u8ba2\u5355\u53f7');
    creating=true;setCreateFeedback('');createSubmit.disabled=true;createSubmit.textContent='\u521b\u5efa\u4e2d\u2026';
    try{
      await requestCreateOrder(payload,{baseUrl:apiBaseUrl,timeout:30000});
      creating=false;createSubmit.textContent='\u521b\u5efa\u8ba2\u5355';closeCreateModal();resetCreateForm();statusFilter.value='';if(sourceFilter)sourceFilter.value='';orderQuery.value='';currentPage=1;await loadOrders();showMessage('\u8ba2\u5355 '+payload.upstreamOrderNo+' \u521b\u5efa\u6210\u529f');
    }catch(error){
      console.error('\u521b\u5efa\u8ba2\u5355\u5931\u8d25',error);setCreateFeedback('\u521b\u5efa\u5931\u8d25\uff1a'+error.message);showMessage('\u521b\u5efa\u8ba2\u5355\u5931\u8d25\uff1a'+error.message);
    }finally{
      creating=false;createSubmit.textContent='\u521b\u5efa\u8ba2\u5355';updateCreateSubmit();
    }
  }

  function setTableMessage(message,loadingState){
    body.innerHTML='';
    const row=document.createElement('tr');
    const cell=document.createElement('td');
    cell.colSpan=9;
    if(loadingState){
      cell.className='order-loading-cell';
      const indicator=document.createElement('div');
      indicator.className='order-loading';
      indicator.textContent=message;
      cell.appendChild(indicator);
    }else{
      cell.className='empty-row';
      cell.textContent=message;
    }
    row.appendChild(cell);
    body.appendChild(row);
  }

  function textCell(row,value){
    const cell=document.createElement('td');
    cell.textContent=value===null||value===undefined||value===''?'-':String(value);
    row.appendChild(cell);
  }

  function formatPriority(value){
    if(value===null||value===undefined||value==='')return'-';
    return String(value).startsWith('P')?String(value):'P'+value;
  }

  function formatTime(value){
    if(!value)return'-';
    const text=String(value);
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text))return text.replace('T',' ');
    const date=new Date(text);
    if(Number.isNaN(date.getTime()))return text.replace('T',' ');
    return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date).replaceAll('/','-');
  }

  function openOrderTasks(item){
    const orderNo=item.upstreamOrderNo||item.systemOrderNo||item.id;
    const params=new URLSearchParams({id:String(item.id),order:String(orderNo)});
    location.href='order-task-detail.html?'+params.toString();
  }

  function callbackStatusText(item){
    const explicit=item.resultCallbackStatusDescription||item.callbackStatusDescription||item.resultCallbackStatus||item.callbackStatus;
    if(explicit)return String(explicit);
    if(item.status==='SUCCEEDED')return'任务已全部完成';
    if(item.status==='FAILED')return'任务执行失败，等待处理';
    if(item.status==='CANCELLED')return'订单已取消';
    return'等待任务全部完成';
  }

  function openOrderDetail(item,trigger){
    if(!detailModal)return;
    selectedOrder=item;detailTrigger=trigger||document.activeElement;
    const orderNo=item.upstreamOrderNo||item.systemOrderNo||item.id||'-';
    const meta=statusMeta[item.status]||{label:item.status||'-',className:'cancelled'};
    detailTitle.textContent='订单详情 · '+orderNo;
    document.getElementById('detailOrderNo').textContent=item.upstreamOrderNo||'-';
    document.getElementById('detailSystemOrderNo').textContent=item.systemOrderNo||'-';
    document.getElementById('detailPriority').textContent=formatPriority(item.priority);
    document.getElementById('detailSource').textContent=item.source||'-';
    const taskCount=Number(item.taskCount)||0,completedCount=Number(item.completedTaskCount)||0;
    document.getElementById('detailTaskProgress').textContent=taskCount+'个 / '+completedCount+'/'+taskCount;
    document.getElementById('detailIssuedAt').textContent=formatTime(item.issuedAt);
    document.getElementById('detailCallbackStatus').textContent=callbackStatusText(item);
    const statusHost=document.getElementById('detailOrderStatus'),status=document.createElement('span');
    status.className='status-tag status-'+meta.className;status.textContent=meta.label;statusHost.replaceChildren(status);
    detailModal.hidden=false;document.body.style.overflow='hidden';requestAnimationFrame(()=>{detailModal.classList.add('open');detailCloseX?.focus()});
  }

  function closeOrderDetail(){
    if(!detailModal||detailModal.hidden)return;
    detailModal.classList.remove('open');document.body.style.overflow='';setTimeout(()=>{detailModal.hidden=true;detailTrigger?.focus();detailTrigger=null;selectedOrder=null},200);
  }

  function renderRows(){
    body.innerHTML='';
    if(!records.length){setTableMessage('没有符合条件的订单',false);return}
    records.forEach(item=>{
      const row=document.createElement('tr');
      row.dataset.id=String(item.id??'');
      textCell(row,item.upstreamOrderNo);
      textCell(row,item.systemOrderNo);
      textCell(row,item.source);
      const meta=statusMeta[item.status]||{label:item.status||'-',className:'cancelled'};
      const statusCell=document.createElement('td');
      const status=document.createElement('span');
      status.className='status-tag status-'+meta.className;
      status.textContent=meta.label;
      statusCell.appendChild(status);
      row.appendChild(statusCell);
      textCell(row,formatPriority(item.priority));
      textCell(row,item.taskCount);
      textCell(row,item.progress||((item.completedTaskCount??0)+' / '+(item.taskCount??0)));
      textCell(row,formatTime(item.issuedAt));
      const operationCell=document.createElement('td');
      const actions=document.createElement('div');
      actions.className='row-actions';
      actions.dataset.agvActionMenu='icon';
      const detail=document.createElement('button');
      detail.type='button';detail.className='row-btn row-icon-button';detail.setAttribute('aria-label','查看详情');detail.title='查看详情';detail.innerHTML='<img src="assets/list-icons/file-detail.svg" alt="">';
      const tasks=document.createElement('button');
      tasks.type='button';tasks.className='row-btn row-icon-button tasks';tasks.setAttribute('aria-label','查看任务');tasks.title='查看任务';tasks.innerHTML='<img src="assets/list-icons/document.svg" alt="">';
      const remove=document.createElement('button');
      remove.type='button';remove.className='row-btn delete';remove.textContent='删除';remove.setAttribute('aria-label','删除订单');
      detail.addEventListener('click',()=>openOrderDetail(item,detail));
      tasks.addEventListener('click',()=>openOrderTasks(item));
      remove.addEventListener('click',()=>showMessage('订单删除功能待接入：'+(item.upstreamOrderNo||item.systemOrderNo||item.id)));
      actions.append(detail,tasks,remove);operationCell.appendChild(actions);row.appendChild(operationCell);body.appendChild(row);
    });
  }

  function visiblePageNumbers(totalPages){
    if(totalPages<=7)return Array.from({length:totalPages},(_,index)=>index+1);
    const pages=new Set([1,totalPages,currentPage-1,currentPage,currentPage+1]);
    return[...pages].filter(page=>page>=1&&page<=totalPages).sort((a,b)=>a-b);
  }

  function renderPagination(){
    const totalPages=Math.max(1,Math.ceil(total/pageSize));
    const start=total?(currentPage-1)*pageSize+1:0;
    const end=Math.min(currentPage*pageSize,total);
    pageSummary.textContent='共 '+total+' 条，当前显示 '+start+'–'+end+' 条';
    prevPage.disabled=loading||currentPage<=1;
    nextPage.disabled=loading||currentPage>=totalPages;
    pageNumbers.innerHTML='';
    let previousPage=0;
    visiblePageNumbers(totalPages).forEach(page=>{
      if(previousPage&&page-previousPage>1){const ellipsis=document.createElement('span');ellipsis.textContent='…';ellipsis.style.alignSelf='center';pageNumbers.appendChild(ellipsis)}
      const button=document.createElement('button');
      button.type='button';button.className='page-btn'+(page===currentPage?' active':'');button.textContent=String(page);button.disabled=loading;
      button.addEventListener('click',()=>{if(page!==currentPage){currentPage=page;loadOrders()}});
      pageNumbers.appendChild(button);previousPage=page;
    });
  }

  async function loadOrders(options={}){
    if(listController)listController.abort();
    const controller=new AbortController();
    listController=controller;
    loading=true;
    setTableMessage('正在加载订单…',true);
    renderPagination();
    const params=new URLSearchParams({pageNum:String(currentPage),pageSize:String(pageSize)});
    if(statusFilter.value)params.set('status',statusFilter.value);
    const source=sourceFilter?.value.trim()||'';
    if(source)params.set('source',source);
    const keyword=orderQuery.value.trim();
    if(keyword)params.set('keyword',keyword);
    try{
      const result=await getOrders(params,{baseUrl:apiBaseUrl,signal:controller.signal});
      const page=result.data||{};
      total=Number(page.total)||0;
      pageSize=Number(page.pageSize)||pageSize;
      currentPage=Number(page.pageNum)||currentPage;
      records=Array.isArray(page.records)?page.records:[];
      const totalPages=Math.max(1,Math.ceil(total/pageSize));
      if(currentPage>totalPages){currentPage=totalPages;return loadOrders(options)}
      renderRows();
      if(options.notify)showMessage('订单列表已刷新，共 '+total+' 条');
      window.__orderApi.records=records;
      window.__orderApi.total=total;
    }catch(error){
      if(error.name==='AbortError')return;
      console.error('加载订单失败',error);records=[];total=0;setTableMessage('订单加载失败：'+error.message,false);showMessage('订单加载失败：'+error.message);
    }finally{
      if(listController===controller){
        loading=false;renderPagination();
      }
    }
  }

  async function syncOrders(){
    if(syncing)return;
    syncing=true;
    if(syncButton){syncButton.disabled=true;syncButton.setAttribute('aria-busy','true');const label=syncButton.querySelector('span');if(label)label.textContent='同步中…'}
    const syncController=new AbortController();
    const timeoutId=setTimeout(()=>syncController.abort(),30000);
    try{
      const result=await requestOrderSync({baseUrl:apiBaseUrl,signal:syncController.signal,timeout:30000});
      const summary=result.data||{};
      currentPage=1;
      await loadOrders();
      showMessage('订单同步完成：拉取 '+(Number(summary.pulled)||0)+' 条，新增 '+(Number(summary.created)||0)+' 条，更新 '+(Number(summary.updated)||0)+' 条');
    }catch(error){
      console.error('同步订单失败',error);
      showMessage(error.name==='AbortError'?'订单同步超时，请稍后重试':'订单同步失败：'+error.message);
    }finally{
      clearTimeout(timeoutId);syncing=false;
      if(syncButton){syncButton.disabled=false;syncButton.removeAttribute('aria-busy');const label=syncButton.querySelector('span');if(label)label.textContent='同步订单'}
    }
  }

  function intercept(element,eventName,handler){
    if(!element)return;
    element.addEventListener(eventName,event=>{event.preventDefault();event.stopImmediatePropagation();handler(event)},true);
  }

  intercept(searchButton,'click',()=>{currentPage=1;loadOrders()});
  intercept(resetButton,'click',()=>{statusFilter.value='';if(sourceFilter)sourceFilter.value='';orderQuery.value='';currentPage=1;loadOrders()});
  statusFilter.addEventListener('change',event=>{event.stopImmediatePropagation();currentPage=1;loadOrders()},true);
  pageSizeSelect.addEventListener('change',event=>{event.stopImmediatePropagation();pageSize=Number(pageSizeSelect.value)||10;currentPage=1;loadOrders()},true);
  orderQuery.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();currentPage=1;loadOrders()}},true);
  sourceFilter?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();currentPage=1;loadOrders()}},true);
  intercept(prevPage,'click',()=>{if(!loading&&currentPage>1){currentPage-=1;loadOrders()}});
  intercept(nextPage,'click',()=>{const totalPages=Math.max(1,Math.ceil(total/pageSize));if(!loading&&currentPage<totalPages){currentPage+=1;loadOrders()}});
  intercept(syncButton,'click',syncOrders);
  createButton?.addEventListener('click',openCreateModal);
  createCancel?.addEventListener('click',closeCreateModal);
  createModal?.addEventListener('click',event=>{if(event.target===createModal)closeCreateModal()});
  createForm?.addEventListener('submit',submitCreateOrder);
  detailCloseX?.addEventListener('click',closeOrderDetail);
  detailClose?.addEventListener('click',closeOrderDetail);
  detailModal?.addEventListener('click',event=>{if(event.target===detailModal)closeOrderDetail()});
  viewOrderTasks?.addEventListener('click',()=>{if(selectedOrder)openOrderTasks(selectedOrder)});
  requestOrderCancel?.addEventListener('click',()=>{if(selectedOrder)showMessage('请求上游取消功能待接入：'+(selectedOrder.upstreamOrderNo||selectedOrder.systemOrderNo||selectedOrder.id))});
  taskCountInput?.addEventListener('input',()=>{if(taskCountInput.value!=='')renderTaskRows()});
  taskCountInput?.addEventListener('change',renderTaskRows);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!detailModal?.hidden)closeOrderDetail();else if(!createModal?.hidden)closeCreateModal()}});
  window.__orderApi={endpoint,syncEndpoint,createEndpoint,records,total,reload:loadOrders,sync:syncOrders,openCreate:openCreateModal,openDetail:openOrderDetail};
  renderTaskRows();
  loadOrders();
})();
