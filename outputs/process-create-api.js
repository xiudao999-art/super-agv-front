import { createFlow, getFlowPage, getWorkflowTemplates } from './assets/data/workflow-data.js';

(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const apiBaseUrl=typeof window.WORKFLOW_API_BASE_URL==='string'
    ?window.WORKFLOW_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const apiUrl=path=>(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+path;
  const form=document.getElementById('processForm');
  const modalTitle=document.getElementById('processModalTitle');
  const newProcessButton=document.getElementById('newProcess');
  if(!form||!modalTitle||!newProcessButton)return;


  form.innerHTML='<div class="form-grid">'
    +'<label class="form-field wide"><span>流程名称</span><input id="flowTemplateName" value="智能仓储-&gt;贴标机台" required maxlength="120"></label>'
    +'<label class="form-field wide"><span>来源流程模板</span><select id="sourceTemplateId" required><option value="">正在加载模板…</option></select><small class="field-hint">实际提交后端模板 ID</small></label>'
    +'<label class="form-field"><span>适用范围</span><input id="applicableScope" value="贴标机台" maxlength="120"></label>'
    +'<label class="form-field"><span>启用状态</span><select id="flowTemplateStatus"><option value="1">启用</option><option value="0">停用</option></select></label>'
    +'<label class="form-field wide"><span>流程说明</span><textarea id="flowTemplateDescription" maxlength="500">由上游业务订单触发，按照所选流程模板执行。</textarea></label>'
    +'</div><div class="modal-actions"><button type="button" class="modal-close" id="cancelCreateProcess">取消</button><button type="submit" class="modal-primary" id="submitCreateProcess">创建流程</button></div>';

  const nameInput=document.getElementById('flowTemplateName');
  const sourceTemplateSelect=document.getElementById('sourceTemplateId');
  const scopeInput=document.getElementById('applicableScope');
  const statusSelect=document.getElementById('flowTemplateStatus');
  const descriptionInput=document.getElementById('flowTemplateDescription');
  const submitButton=document.getElementById('submitCreateProcess');
  let workflowTemplates=[];
  const flowTableBody=document.querySelector('.content .table-wrap tbody');
  const flowPagination=document.querySelector('.content .pagination');
  const flowTotal=document.querySelector('.content .pager-row .total');
  const flowListDescription=document.querySelector('.content .list-head p');
  const flowFilter=document.getElementById('processFilter');
  const flowPageState={pageNum:1,pageSize:10,total:0,loading:false};

  function formatDateTime(value){
    if(!value)return'-';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replace(/\//g,'-');
  }

  function appendTextCell(row,value,className){
    const cell=document.createElement('td');
    if(className)cell.className=className;
    cell.textContent=value??'-';
    row.appendChild(cell);
    return cell;
  }

  function openFlowEditor(record){modalTitle.textContent='编辑流程 · '+(record.flowNumber||record.id);openModal('processModal')}

  function renderFlowRows(records){
    flowTableBody.innerHTML='';
    if(!records.length){
      const row=document.createElement('tr'),cell=document.createElement('td');
      cell.colSpan=6;cell.style.textAlign='center';cell.style.color='var(--muted)';cell.textContent='暂无流程数据';row.appendChild(cell);flowTableBody.appendChild(row);return;
    }
    records.forEach(record=>{
      const row=document.createElement('tr');
      const flowName=record.flowName||('流程 '+record.id);
      row.dataset.processRow='';
      row.dataset.search=[record.flowNumber,flowName,record.templateName,record.templateId].join(' ').toLowerCase();
      appendTextCell(row,record.flowNumber||('FLOW-'+record.id));
      appendTextCell(row,flowName);
      appendTextCell(row,record.templateName||('- · 模板 ID '+record.templateId));
      appendTextCell(row,record.templateNodeCount??0);
      appendTextCell(row,formatDateTime(record.updatedAt));
      const actionCell=appendTextCell(row,'');const actions=document.createElement('div');actions.className='row-actions';const editButton=document.createElement('button');editButton.type='button';editButton.className='row-btn row-icon-button edit';editButton.setAttribute('aria-label','编辑流程');editButton.title='编辑流程';editButton.innerHTML='<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#i-edit"/></svg>';editButton.addEventListener('click',()=>openFlowEditor(record));const menuEdit=document.createElement('button');menuEdit.type='button';menuEdit.className='row-btn';menuEdit.textContent='编辑流程';menuEdit.addEventListener('click',()=>openFlowEditor(record));const moreMenu=document.createElement('agv-action-menu');moreMenu.dataset.agvActionMenuTrigger='icon';moreMenu.dataset.agvActionMenuPlacement='top';actions.append(editButton,menuEdit,moreMenu);moreMenu.actions=[menuEdit];actionCell.appendChild(actions);
      flowTableBody.appendChild(row);
    });
    if(flowFilter?.value)flowFilter.dispatchEvent(new Event('input'));
  }

  function pageNumbers(current,totalPages){
    const values=new Set([1,totalPages,current-1,current,current+1]);
    return [...values].filter(value=>value>=1&&value<=totalPages).sort((a,b)=>a-b);
  }

  function renderFlowPagination(){
    const totalPages=Math.max(1,Math.ceil(flowPageState.total/flowPageState.pageSize));
    flowPagination.innerHTML='';
    const addButton=(label,page,disabled,active)=>{
      const button=document.createElement('button');button.type='button';button.className='page-btn'+(active?' active':'');button.textContent=label;button.disabled=disabled;
      button.addEventListener('click',()=>loadFlowPage(page));flowPagination.appendChild(button);
    };
    addButton('‹',Math.max(1,flowPageState.pageNum-1),flowPageState.pageNum<=1,false);
    let previous=0;
    pageNumbers(flowPageState.pageNum,totalPages).forEach(page=>{
      if(previous&&page-previous>1){const ellipsis=document.createElement('span');ellipsis.textContent='•••';flowPagination.appendChild(ellipsis)}
      addButton(String(page),page,false,page===flowPageState.pageNum);previous=page;
    });
    addButton('›',Math.min(totalPages,flowPageState.pageNum+1),flowPageState.pageNum>=totalPages,false);
    const sizeSelect=document.createElement('select');sizeSelect.className='page-size';
    [10,20,50].forEach(size=>sizeSelect.add(new Option(size+' 条/页',String(size),false,size===flowPageState.pageSize)));
    sizeSelect.addEventListener('change',()=>{flowPageState.pageSize=Number(sizeSelect.value);loadFlowPage(1)});flowPagination.appendChild(sizeSelect);
    const jumpLabel=document.createElement('span');jumpLabel.textContent='跳至';flowPagination.appendChild(jumpLabel);
    const jump=document.createElement('input');jump.className='jump';jump.inputMode='numeric';jump.addEventListener('keydown',event=>{if(event.key!=='Enter')return;const page=Number(jump.value);if(Number.isInteger(page)&&page>=1&&page<=totalPages)loadFlowPage(page);else showToast('请输入 1-'+totalPages+' 之间的页码')});flowPagination.appendChild(jump);
    const pageLabel=document.createElement('span');pageLabel.textContent='页';flowPagination.appendChild(pageLabel);
  }

  async function loadFlowPage(pageNum=flowPageState.pageNum){
    if(flowPageState.loading)return;
    flowPageState.loading=true;flowTableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted)">正在加载流程数据…</td></tr>';
    try{
      const query=new URLSearchParams({pageNum:String(pageNum),pageSize:String(flowPageState.pageSize)});
      const result=await getFlowPage(query,{baseUrl:apiBaseUrl});
      const page=result.data||result;
      flowPageState.pageNum=Number(page.pageNum)||pageNum;flowPageState.pageSize=Number(page.pageSize)||flowPageState.pageSize;flowPageState.total=Number(page.total)||0;
      renderFlowRows(Array.isArray(page.records)?page.records:[]);renderFlowPagination();
      flowTotal.textContent='共计 '+flowPageState.total+' 条数据';
      if(flowListDescription)flowListDescription.textContent='后端实时数据 · 当前第 '+flowPageState.pageNum+' 页';
    }catch(error){
      console.error('加载流程列表失败',error);
      flowTableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--red)">流程列表加载失败</td></tr>';showToast('流程列表加载失败：'+error.message);
    }finally{flowPageState.loading=false}
  }

  function closeProcessModal(){
    const modal=document.getElementById('processModal');
    modal.classList.remove('open');
    document.body.style.overflow='';
    setTimeout(()=>modal.hidden=true,200);
  }

  async function loadWorkflowTemplates(){
    sourceTemplateSelect.disabled=true;
    sourceTemplateSelect.innerHTML='<option value="">正在加载模板…</option>';
    try{
      const result=await getWorkflowTemplates({baseUrl:apiBaseUrl});
      workflowTemplates=Array.isArray(result.data)?result.data:[];
      sourceTemplateSelect.innerHTML='<option value="">请选择来源模板</option>';
      workflowTemplates.forEach(template=>sourceTemplateSelect.add(new Option(template.templateName+' · '+template.templateNumber,String(template.id))));
      const preferred=workflowTemplates.find(template=>template.templateName==='智能仓储-贴标模板')||workflowTemplates[0];
      if(preferred){sourceTemplateSelect.value=String(preferred.id);if(preferred.applicableObject)scopeInput.value=preferred.applicableObject}
    }catch(error){
      console.error('加载流程模板失败',error);
      sourceTemplateSelect.innerHTML='<option value="">模板加载失败，请重试</option>';
      showToast('来源模板加载失败：'+error.message);
    }finally{sourceTemplateSelect.disabled=false}
  }

  function resetCreateForm(){
    modalTitle.textContent='新建流程';
    nameInput.value='智能仓储->贴标机台';
    statusSelect.value='1';
    descriptionInput.value='由上游业务订单触发，按照所选流程模板执行。';
    const selected=workflowTemplates.find(template=>String(template.id)===sourceTemplateSelect.value);
    scopeInput.value=selected?.applicableObject||'贴标机台';
  }

  sourceTemplateSelect.addEventListener('change',()=>{
    const selected=workflowTemplates.find(template=>String(template.id)===sourceTemplateSelect.value);
    if(selected?.applicableObject)scopeInput.value=selected.applicableObject;
  });
  document.getElementById('cancelCreateProcess').addEventListener('click',closeProcessModal);
  newProcessButton.addEventListener('click',()=>{resetCreateForm();if(!workflowTemplates.length)loadWorkflowTemplates()});

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!modalTitle.textContent.startsWith('新建')){
      showToast('当前接口仅支持新建流程');
      return;
    }
    const sourceTemplateId=Number(sourceTemplateSelect.value);
    if(!nameInput.value.trim())return showToast('请填写流程名称');
    if(!Number.isInteger(sourceTemplateId)||sourceTemplateId<=0)return showToast('请选择来源流程模板');
    const payload={
      templateName:nameInput.value.trim(),
      sourceTemplateId,
      description:descriptionInput.value.trim(),
      status:Number(statusSelect.value),
      applicableScope:scopeInput.value.trim()
    };
    const controller=new AbortController(),timeoutId=setTimeout(()=>controller.abort(),15000);
    const originalLabel=submitButton.textContent;
    submitButton.disabled=true;submitButton.textContent='创建中…';
    try{
      const result=await createFlow(payload,{baseUrl:apiBaseUrl,signal:controller.signal,timeout:15000});
      const createdId=result.data?.id;
      closeProcessModal();
      showToast('流程创建成功'+(createdId?' · ID '+createdId:''));
      window.__lastCreatedFlowTemplate={...payload,id:createdId};
      loadFlowPage(1);
    }catch(error){
      console.error('创建流程失败',error);
      showToast(error.name==='AbortError'?'连接后端超时，请检查 121.196.164.163:8081':'创建失败：'+error.message);
    }finally{clearTimeout(timeoutId);submitButton.disabled=false;submitButton.textContent=originalLabel}
  },true);

  window.__flowTemplateCreateApi={
    endpoint:apiUrl('/api/flow-templates/create'),
    reloadSourceTemplates:loadWorkflowTemplates,
    buildPayload(){return{templateName:nameInput.value.trim(),sourceTemplateId:Number(sourceTemplateSelect.value),description:descriptionInput.value.trim(),status:Number(statusSelect.value),applicableScope:scopeInput.value.trim()}}
  };
  loadWorkflowTemplates();
  loadFlowPage(1);
})();
