(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=typeof window.ORDER_API_BASE_URL==='string'
    ?window.ORDER_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+'/api/orders';
  const syncEndpoint=(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+'/api/orders/sync';
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
  if(!body||!statusFilter||!sourceFilter||!orderQuery||!pageSizeSelect||!pageNumbers||!pageSummary||!prevPage||!nextPage)return;

  let currentPage=1;
  let pageSize=Number(pageSizeSelect.value)||10;
  let total=0;
  let records=[];
  let loading=false;
  let syncing=false;
  let listController=null;

  const statusMeta={
    QUEUED:{label:'排队中',className:'queued'},
    RUNNING:{label:'执行中',className:'executing'},
    SUCCEEDED:{label:'已完成',className:'completed'},
    FAILED:{label:'失败',className:'failed'},
    CANCELLED:{label:'已取消',className:'cancelled'}
  };

  const style=document.createElement('style');
  style.textContent='.status-failed{color:var(--red);border-color:#f4cfcd;background:#fff5f4}.order-loading-cell{height:120px!important;text-align:center}.order-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.order-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:order-loading-spin .7s linear infinite}@keyframes order-loading-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  function showMessage(message){
    if(typeof showToast==='function')showToast(message);
  }

  function parseApiResponse(response){
    return response.text().then(text=>{
      if(!text)return{};
      try{return JSON.parse(text)}catch(error){return{message:text}}
    });
  }

  function assertApiSuccess(response,result){
    if(!response.ok)throw new Error(result.message||result.error||('HTTP '+response.status));
    if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
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

  function openOrder(item){
    const orderNo=item.upstreamOrderNo||item.systemOrderNo||item.id;
    const params=new URLSearchParams({id:String(item.id),order:String(orderNo)});
    location.href='order-task-detail.html?'+params.toString();
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
      const detail=document.createElement('button');
      detail.type='button';detail.className='row-btn';detail.textContent='详情';
      const tasks=document.createElement('button');
      tasks.type='button';tasks.className='row-btn tasks';tasks.textContent='查看任务';
      detail.addEventListener('click',()=>openOrder(item));
      tasks.addEventListener('click',()=>openOrder(item));
      actions.append(detail,tasks);operationCell.appendChild(actions);row.appendChild(operationCell);body.appendChild(row);
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
    const source=sourceFilter.value.trim();
    if(source)params.set('source',source);
    const keyword=orderQuery.value.trim();
    if(keyword)params.set('keyword',keyword);
    try{
      const response=await fetch(endpoint+'?'+params.toString(),{headers:{Accept:'application/json'},signal:controller.signal});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
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
      const response=await fetch(syncEndpoint,{method:'POST',headers:{Accept:'application/json'},signal:syncController.signal});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
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
  intercept(resetButton,'click',()=>{statusFilter.value='';sourceFilter.value='';orderQuery.value='';currentPage=1;loadOrders()});
  statusFilter.addEventListener('change',event=>{event.stopImmediatePropagation();currentPage=1;loadOrders()},true);
  pageSizeSelect.addEventListener('change',event=>{event.stopImmediatePropagation();pageSize=Number(pageSizeSelect.value)||10;currentPage=1;loadOrders()},true);
  orderQuery.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();currentPage=1;loadOrders()}},true);
  sourceFilter.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();currentPage=1;loadOrders()}},true);
  intercept(prevPage,'click',()=>{if(!loading&&currentPage>1){currentPage-=1;loadOrders()}});
  intercept(nextPage,'click',()=>{const totalPages=Math.max(1,Math.ceil(total/pageSize));if(!loading&&currentPage<totalPages){currentPage+=1;loadOrders()}});
  intercept(syncButton,'click',syncOrders);
  window.__orderApi={endpoint,syncEndpoint,records,total,reload:loadOrders,sync:syncOrders};
  loadOrders();
})();
