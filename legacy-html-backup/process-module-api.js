(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const apiBaseUrl=typeof window.WORKFLOW_API_BASE_URL==='string'
    ?window.WORKFLOW_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const apiUrl=path=>(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+path;
  const tableBody=document.querySelector('.content .table-wrap tbody');
  const pagination=document.querySelector('.content .pagination');
  const totalLabel=document.querySelector('.content .pager-row .total');
  const listDescription=document.querySelector('.content .list-head p');
  const filterInput=document.getElementById('templateFilter');
  if(!tableBody||!pagination||!totalLabel)return;
  const pageState={pageNum:1,pageSize:10,total:0,loading:false};

  async function parseApiResponse(response){
    const text=await response.text();
    if(!text)return{};
    try{return JSON.parse(text)}catch(error){return{message:text}}
  }

  function formatDateTime(value){
    if(!value)return'-';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replace(/\//g,'-');
  }

  function textCell(row,value){
    const cell=document.createElement('td');cell.textContent=value??'-';row.appendChild(cell);return cell;
  }

  function openEditor(templateId){
    location.href='process-template-editor.html?id='+encodeURIComponent(templateId);
  }


  async function deployTemplate(template,button){
    if(!window.confirm('确认发布模板“'+template.templateName+'”吗？发布后将部署到 Flowable。'))return;
    button.disabled=true;button.setAttribute('aria-busy','true');
    const controller=new AbortController(),timeoutId=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(apiUrl('/api/workflow-templates/deploy?id='+encodeURIComponent(template.id)),{method:'POST',headers:{Accept:'application/json'},signal:controller.signal});
      const result=await parseApiResponse(response);
      if(!response.ok)throw new Error(result.message||('HTTP '+response.status));
      if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
      const deployment=result.data||result;
      showToast('模板发布成功'+(deployment.version?' · V'+deployment.version:''));
      window.__lastDeployedWorkflowTemplate=deployment;
      await loadTemplatePage(pageState.pageNum);
    }catch(error){
      console.error('发布流程模板失败',error);
      showToast(error.name==='AbortError'?'发布超时，请检查 121.196.164.163:8081':'发布失败：'+error.message);
    }finally{clearTimeout(timeoutId);button.disabled=false;button.removeAttribute('aria-busy')}
  }

  function renderTemplateRows(records){
    tableBody.innerHTML='';
    if(!records.length){
      const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=6;cell.style.textAlign='center';cell.style.color='var(--muted)';cell.textContent='暂无流程模板';row.appendChild(cell);tableBody.appendChild(row);return;
    }
    records.forEach(template=>{
      const row=document.createElement('tr');row.className='clickable-row';row.dataset.templateRow='';
      row.dataset.search=[template.templateNumber,template.templateName,template.actionSequenceText,template.applicableObject,template.statusDescription].join(' ').toLowerCase();
      row.addEventListener('click',event=>{if(!event.target.closest('button'))openEditor(template.id)});
      textCell(row,template.templateNumber);
      textCell(row,template.templateName);
      const sequenceCell=textCell(row,'');const sequence=document.createElement('span');sequence.className='truncate';sequence.style.maxWidth='520px';sequence.textContent=template.actionSequenceText||(Array.isArray(template.actionSequence)?template.actionSequence.join(' → '):'-');sequenceCell.appendChild(sequence);
      textCell(row,template.applicableObject||'-');
      const statusCell=textCell(row,'');const status=document.createElement('span');status.className='status-tag '+(template.status==='ENABLED'?'valid':'draft');status.textContent=(template.version?'V'+template.version+' · ':'')+(template.statusDescription||(template.status==='ENABLED'?'已启用':'草稿'));status.title='更新时间：'+formatDateTime(template.updatedAt);statusCell.appendChild(status);
      const actionCell=textCell(row,'');const actions=document.createElement('div');actions.className='row-actions';
      const editButton=document.createElement('button');editButton.type='button';editButton.className='row-btn row-icon-button edit';editButton.setAttribute('aria-label','编辑模板');editButton.title='编辑模板';editButton.innerHTML='<svg class="icon" aria-hidden="true"><use href="assets/icons.svg#i-edit"/></svg>';editButton.addEventListener('click',event=>{event.stopPropagation();openEditor(template.id)});
      const deployLabel=template.status==='ENABLED'?'重新发布模板':'发布模板',deployButton=document.createElement('button');deployButton.type='button';deployButton.className='row-btn row-icon-button publish';deployButton.setAttribute('aria-label',deployLabel);deployButton.title=deployLabel;deployButton.innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M12 4 8 8M12 4l4 4M5 14v5h14v-5"/></svg>';deployButton.addEventListener('click',event=>{event.stopPropagation();deployTemplate(template,deployButton)});
      actions.append(editButton,deployButton);actionCell.appendChild(actions);tableBody.appendChild(row);
    });
    if(filterInput?.value)filterInput.dispatchEvent(new Event('input'));
  }

  function pageNumbers(current,totalPages){
    const values=new Set([1,totalPages,current-1,current,current+1]);
    return [...values].filter(value=>value>=1&&value<=totalPages).sort((a,b)=>a-b);
  }

  function renderPagination(){
    const totalPages=Math.max(1,Math.ceil(pageState.total/pageState.pageSize));pagination.innerHTML='';
    const addButton=(label,page,disabled,active)=>{const button=document.createElement('button');button.type='button';button.className='page-btn'+(active?' active':'');button.textContent=label;button.disabled=disabled;button.addEventListener('click',()=>loadTemplatePage(page));pagination.appendChild(button)};
    addButton('‹',Math.max(1,pageState.pageNum-1),pageState.pageNum<=1,false);
    let previous=0;
    pageNumbers(pageState.pageNum,totalPages).forEach(page=>{if(previous&&page-previous>1){const ellipsis=document.createElement('span');ellipsis.textContent='•••';pagination.appendChild(ellipsis)}addButton(String(page),page,false,page===pageState.pageNum);previous=page});
    addButton('›',Math.min(totalPages,pageState.pageNum+1),pageState.pageNum>=totalPages,false);
    const sizeSelect=document.createElement('select');sizeSelect.className='page-size';[10,20,50].forEach(size=>sizeSelect.add(new Option(size+' 条/页',String(size),false,size===pageState.pageSize)));sizeSelect.addEventListener('change',()=>{pageState.pageSize=Number(sizeSelect.value);loadTemplatePage(1)});pagination.appendChild(sizeSelect);
    const jumpLabel=document.createElement('span');jumpLabel.textContent='跳至';pagination.appendChild(jumpLabel);
    const jump=document.createElement('input');jump.className='jump';jump.inputMode='numeric';jump.addEventListener('keydown',event=>{if(event.key!=='Enter')return;const page=Number(jump.value);if(Number.isInteger(page)&&page>=1&&page<=totalPages)loadTemplatePage(page);else showToast('请输入 1-'+totalPages+' 之间的页码')});pagination.appendChild(jump);
    const pageLabel=document.createElement('span');pageLabel.textContent='页';pagination.appendChild(pageLabel);
  }

  async function loadTemplatePage(pageNum=pageState.pageNum){
    if(pageState.loading)return;
    pageState.loading=true;tableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted)">正在加载模板数据…</td></tr>';
    try{
      const query=new URLSearchParams({pageNum:String(pageNum),pageSize:String(pageState.pageSize)});
      const response=await fetch(apiUrl('/api/workflow-templates/page?'+query),{headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);
      if(!response.ok)throw new Error(result.message||('HTTP '+response.status));
      if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
      const page=result.data||result;
      pageState.pageNum=Number(page.pageNum)||pageNum;pageState.pageSize=Number(page.pageSize)||pageState.pageSize;pageState.total=Number(page.total)||0;
      renderTemplateRows(Array.isArray(page.records)?page.records:[]);renderPagination();
      totalLabel.textContent='共计 '+pageState.total+' 条数据';
      if(listDescription)listDescription.textContent='后端实时数据 · 当前第 '+pageState.pageNum+' 页；点击模板行进入 Canvas 编排';
    }catch(error){
      console.error('加载流程模板失败',error);
      tableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--red)">流程模板加载失败</td></tr>';showToast('模板列表加载失败：'+error.message);
    }finally{pageState.loading=false}
  }

  window.__workflowTemplateModuleApi={
    listEndpoint:apiUrl('/api/workflow-templates/page'),
    deployEndpoint:apiUrl('/api/workflow-templates/deploy'),
    reload:()=>loadTemplatePage(pageState.pageNum)
  };
  loadTemplatePage(1);
})();
