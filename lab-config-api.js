(function(){
  'use strict';

  const page=location.pathname.split('/').pop();
  if(!['passage-rules.html','stations-and-points.html'].includes(page))return;

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=location.protocol==='file:'?DIRECT_API_BASE_URL:'';
  const apiUrl=path=>(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+path;
  const tableBody=document.querySelector('.content .table-wrap tbody');
  const totalLabel=document.querySelector('.content .total');
  const listHead=document.querySelector('.content .list-head');
  let configId=null;
  let detail=null;
  let labName='';

  const style=document.createElement('style');
  style.textContent='.lab-api-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;padding:12px 14px;border:1px solid #d8e9f6;border-radius:9px;background:#f5faff}.lab-api-meta{display:grid;gap:4px;font-size:12px}.lab-api-meta strong{font-size:13px}.lab-api-meta span{color:var(--muted)}.lab-api-actions{display:flex;gap:8px;flex-wrap:wrap}.lab-api-actions button{height:31px;padding:0 11px;border:1px solid #cde2f3;border-radius:7px;color:var(--blue-strong);background:#fff;font-size:11px;font-weight:650;cursor:pointer}.lab-api-actions button.danger{color:var(--red);border-color:#f3d7d5}.lab-api-actions button:disabled,.tool-btn:disabled,.row-btn:disabled,.modal-primary:disabled{opacity:.5;cursor:not-allowed}.api-empty td{text-align:center;color:var(--muted)}.api-modal-help{grid-column:1/-1;margin:-2px 0 0;color:var(--muted);font-size:10px}.api-issues{margin-top:9px;color:var(--red);font-size:11px;line-height:1.55}@media(max-width:760px){.lab-api-bar{align-items:flex-start;flex-direction:column}}';
  document.head.appendChild(style);

  function notify(message){
    if(typeof window.showToast==='function')return window.showToast(message);
    const toast=document.getElementById('toast');
    if(!toast)return window.alert(message);
    toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600);
  }

  async function parseApiResponse(response){
    const text=await response.text();
    if(!text)return{};
    try{return JSON.parse(text)}catch(error){return{message:text}}
  }

  function checkApiResult(response,result){
    if(!response.ok)throw new Error(result.message||('HTTP '+response.status));
    if(typeof result.code==='number'&&![0,200,201].includes(result.code))throw new Error(result.message||('业务错误 '+result.code));
  }

  async function request(path,options){
    const response=await fetch(apiUrl(path),{headers:{Accept:'application/json',...(options?.body?{'Content-Type':'application/json'}:{})},...options});
    const result=await parseApiResponse(response);checkApiResult(response,result);return result;
  }

  function resetButton(id){
    const oldButton=document.getElementById(id);if(!oldButton)return null;
    const button=oldButton.cloneNode(true);oldButton.replaceWith(button);return button;
  }

  function closeLayer(id){
    const modal=document.getElementById(id);if(!modal)return;
    modal.classList.remove('open');document.body.style.overflow='';setTimeout(()=>modal.hidden=true,200);
  }

  function openLayer(id){
    const modal=document.getElementById(id);if(!modal)return;
    modal.hidden=false;document.body.style.overflow='hidden';requestAnimationFrame(()=>modal.classList.add('open'));
  }

  function ensureEditorModal(){
    let modal=document.getElementById('labEntityModal');
    if(modal)return modal;
    modal=document.createElement('div');modal.className='modal-overlay';modal.id='labEntityModal';modal.hidden=true;
    modal.innerHTML='<section class="modal-card"><h2 id="labEntityTitle"></h2><form id="labEntityForm"></form></section>';
    modal.addEventListener('click',event=>{if(event.target===modal)closeLayer(modal.id)});
    document.body.appendChild(modal);return modal;
  }

  function field(label,input,wide){return '<label class="form-field'+(wide?' wide':'')+'"><span>'+label+'</span>'+input+'</label>'}
  function valueOf(form,name){return form.elements[name].value.trim()}
  function numberOf(form,name,optional){const value=valueOf(form,name);if(optional&&value==='')return undefined;return Number(value)}
  function options(items,selected,getValue,getLabel){return items.map(item=>{const value=String(getValue(item));return '<option value="'+escapeHtml(value)+'"'+(value===String(selected??'')?' selected':'')+'>'+escapeHtml(getLabel(item))+'</option>'}).join('')}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}

  async function resolveConfigId(){
    const params=new URLSearchParams(location.search),fromQuery=Number(params.get('configId'));
    if(Number.isInteger(fromQuery)&&fromQuery>0)return fromQuery;
    const result=await request('/api/lab'),lab=result.data||null;
    labName=lab?.name||'';
    const config=lab&&(lab.draft||lab.published),resolvedId=config?.configId??config?.id;
    if(!resolvedId)return null;
    params.set('configId',String(resolvedId));
    history.replaceState(null,'',location.pathname+'?'+params.toString());
    return Number(resolvedId);
  }

  function syncTabLinks(){
    if(!configId)return;
    document.querySelectorAll('.tabs a').forEach(link=>{
      const url=new URL(link.getAttribute('href'),location.href);url.searchParams.set('configId',String(configId));
      link.setAttribute('href',url.pathname.split('/').pop()+'?'+url.searchParams.toString());
    });
  }

  function isDraft(){return String(detail?.status||'').toUpperCase()==='DRAFT'}
  function setMutationState(){
    const editable=isDraft();
    ['addNode','addConnection','addStation','addPoint'].forEach(id=>{const button=document.getElementById(id);if(button)button.disabled=!editable});
    document.querySelectorAll('[data-config-mutation]').forEach(button=>button.disabled=!editable);
  }

  function renderContext(message){
    document.getElementById('labApiBar')?.remove();
    const bar=document.createElement('div');bar.className='lab-api-bar';bar.id='labApiBar';
    const meta=document.createElement('div');meta.className='lab-api-meta';
    const title=document.createElement('strong');title.textContent=detail?((detail.labName||detail.spaceName||labName||'实验室')+' / '+(detail.map?.name||'未命名地图')):'实验室配置';
    const sub=document.createElement('span');sub.textContent=message||(detail?('配置 #'+detail.id+' · R'+detail.revision+' · '+detail.status):'未找到可用配置');meta.append(title,sub);
    const actions=document.createElement('div');actions.className='lab-api-actions';
    const reload=actionButton('刷新',()=>load());
    const validate=actionButton('校验草稿',()=>validateConfig());validate.dataset.configMutation='';
    const publish=actionButton('发布草稿',()=>publishConfig());publish.dataset.configMutation='';
    const remove=actionButton('删除草稿',()=>deleteConfig(),'danger');remove.dataset.configMutation='';
    actions.append(reload,validate,publish,remove);bar.append(meta,actions);listHead.parentNode.insertBefore(bar,listHead);setMutationState();
  }

  function actionButton(label,handler,className){const button=document.createElement('button');button.type='button';button.textContent=label;if(className)button.className=className;button.addEventListener('click',handler);return button}

  async function validateConfig(){
    if(!isDraft())return notify('只有草稿配置可以校验');
    try{
      const result=await request('/api/lab-configs/'+configId+'/validate',{method:'POST'}),validation=result.data||{};
      const issues=Array.isArray(validation.issues)?validation.issues:[];
      notify(validation.valid?'配置校验通过':'校验未通过：'+(issues[0]?.message||('共 '+issues.length+' 项问题')));
      renderContext(validation.valid?'校验通过，可以发布':('校验发现 '+issues.length+' 项问题'));
      if(issues.length){const list=document.createElement('div');list.className='api-issues';list.textContent=issues.map(issue=>(issue.code?issue.code+'：':'')+(issue.message||'未知问题')).join('；');document.getElementById('labApiBar').querySelector('.lab-api-meta').appendChild(list)}
    }catch(error){console.error('校验实验室配置失败',error);notify('校验失败：'+error.message)}
  }

  async function publishConfig(){
    if(!isDraft())return notify('当前配置不是草稿');
    if(!window.confirm('确认发布当前实验室配置吗？发布前请确保校验已通过。'))return;
    try{await request('/api/lab-configs/'+configId+'/publish',{method:'POST'});notify('实验室配置已发布');await load()}catch(error){console.error('发布实验室配置失败',error);notify('发布失败：'+error.message)}
  }

  async function deleteConfig(){
    if(!isDraft())return notify('只有草稿配置可以删除');
    if(!window.confirm('确认删除当前配置草稿吗？此操作不可撤销。'))return;
    try{await request('/api/lab-configs/'+configId,{method:'DELETE'});notify('配置草稿已删除');setTimeout(()=>location.href='laboratory-configuration.html',500)}catch(error){console.error('删除实验室配置草稿失败',error);notify('删除失败：'+error.message)}
  }

  function cell(row,value,className){const td=document.createElement('td');if(className)td.className=className;td.textContent=value??'-';row.appendChild(td);return td}
  function statusCell(row){const td=document.createElement('td'),tag=document.createElement('span');tag.className='status-tag '+(isDraft()?'draft':'valid');tag.textContent=isDraft()?'草稿':'已发布';td.appendChild(tag);row.appendChild(td)}
  function actionCell(row,edit,remove){
    const td=document.createElement('td'),wrap=document.createElement('div');wrap.className='row-actions';
    const del=actionButton('删除',remove,'row-btn delete'),modify=actionButton('编辑',edit,'row-btn edit');del.dataset.configMutation='';modify.dataset.configMutation='';wrap.append(del,modify);td.appendChild(wrap);row.appendChild(td);
  }
  function emptyTable(message,colspan){tableBody.innerHTML='';const row=document.createElement('tr');row.className='api-empty';const td=document.createElement('td');td.colSpan=colspan;td.textContent=message;row.appendChild(td);tableBody.appendChild(row);totalLabel.textContent='共计 0 条数据'}

  function renderPassage(){
    tableBody.innerHTML='';const nodes=Array.isArray(detail.nodes)?detail.nodes:[],links=Array.isArray(detail.links)?detail.links:[],nodeMap=new Map(nodes.map(node=>[node.id,node]));
    nodes.forEach(node=>{
      const row=document.createElement('tr');cell(row,node.code);cell(row,node.name);cell(row,node.type);cell(row,(detail.labName||detail.spaceName||labName||'实验室')+' / '+(detail.map?.name||'-'));cell(row,[node.x,node.y,node.yaw+'\u00b0'].join(' / '));cell(row,'通行节点');statusCell(row);actionCell(row,()=>openNode(node),()=>removeEntity('nodes',node.id,node.code));tableBody.appendChild(row);
    });
    links.forEach(link=>{
      const start=nodeMap.get(link.startNodeId),end=nodeMap.get(link.endNodeId),row=document.createElement('tr');cell(row,link.code);cell(row,(start?.name||link.startNodeId)+' \u2192 '+(end?.name||link.endNodeId));cell(row,'通行连接');cell(row,(detail.labName||detail.spaceName||labName||'实验室')+' / '+(detail.map?.name||'-'));cell(row,(start?.code||link.startNodeId)+' \u2192 '+(end?.code||link.endNodeId));cell(row,(link.direction==='BIDIRECTIONAL'?'双向':'单向')+' / '+link.speedLimit+' m/s');statusCell(row);actionCell(row,()=>openLink(link),()=>removeEntity('links',link.id,link.code));tableBody.appendChild(row);
    });
    if(!nodes.length&&!links.length)emptyTable('当前配置暂无通行节点或连接',8);else totalLabel.textContent='共计 '+nodes.length+' 个节点，'+links.length+' 条连接';
    setMutationState();
  }

  function renderStations(){
    tableBody.innerHTML='';const machines=Array.isArray(detail.machines)?detail.machines:[],points=Array.isArray(detail.points)?detail.points:[],machineMap=new Map(machines.map(machine=>[machine.id,machine])),nodeMap=new Map((detail.nodes||[]).map(node=>[node.id,node]));
    machines.forEach(machine=>{
      const row=document.createElement('tr');cell(row,machine.name+' / '+machine.code);cell(row,machine.type);cell(row,(detail.labName||detail.spaceName||labName||'实验室')+' / '+(detail.map?.name||'-'));cell(row,'-');cell(row,'MAP');cell(row,'X '+machine.anchorX+' / Y '+machine.anchorY+' / \u03b8 '+machine.anchorYaw+'\u00b0');cell(row,'-');statusCell(row);actionCell(row,()=>openMachine(machine),()=>removeEntity('machines',machine.id,machine.code));tableBody.appendChild(row);
    });
    points.forEach(point=>{
      const machine=machineMap.get(point.machineId),node=nodeMap.get(point.navNodeId),row=document.createElement('tr');cell(row,point.name+' / '+point.code);cell(row,point.type);cell(row,(detail.labName||detail.spaceName||labName||'实验室')+' / '+(detail.map?.name||'-'));cell(row,machine?.name||point.machineId);cell(row,point.frame);cell(row,'X '+point.x+' / Y '+point.y+' / Z '+point.z+' / R '+[point.rx,point.ry,point.rz].join('/'));cell(row,node?.code||point.navNodeId||'-');statusCell(row);actionCell(row,()=>openPoint(point),()=>removeEntity('points',point.id,point.code));tableBody.appendChild(row);
    });
    if(!machines.length&&!points.length)emptyTable('当前配置暂无机台或点位',9);else totalLabel.textContent='共计 '+machines.length+' 个机台，'+points.length+' 个点位';
    setMutationState();
  }

  function openEditor(title,html,onSubmit){
    ensureEditorModal();document.getElementById('labEntityTitle').textContent=title;
    const form=document.getElementById('labEntityForm');form.innerHTML='<div class="form-grid">'+html+'</div><div class="modal-actions"><button type="button" class="modal-close" id="cancelLabEntity">取消</button><button type="submit" class="modal-primary">保存</button></div>';
    document.getElementById('cancelLabEntity').addEventListener('click',()=>closeLayer('labEntityModal'));
    form.onsubmit=async event=>{event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;try{await onSubmit(form);closeLayer('labEntityModal');await load()}catch(error){console.error('保存实验室配置项失败',error);notify('保存失败：'+error.message)}finally{submit.disabled=false}};
    openLayer('labEntityModal');
  }

  function openNode(node){
    const html=field('节点编号','<input name="code" maxlength="64" pattern="[A-Za-z0-9_-]+" value="'+escapeHtml(node?.code||'')+'" required>')+field('名称','<input name="name" maxlength="128" value="'+escapeHtml(node?.name||'')+'" required>')+field('节点类型','<input name="type" maxlength="64" value="'+escapeHtml(node?.type||'NAVIGATION')+'" required>')+field('位置 ID（可选）','<input name="locationId" type="number" value="'+escapeHtml(node?.locationId??'')+'">')+field('X','<input name="x" type="number" step="any" value="'+escapeHtml(node?.x??0)+'" required>')+field('Y','<input name="y" type="number" step="any" value="'+escapeHtml(node?.y??0)+'" required>')+field('航向角 Yaw','<input name="yaw" type="number" step="any" min="-180" max="180" value="'+escapeHtml(node?.yaw??0)+'" required>')+'<p class="api-modal-help">节点编号仅支持字母、数字、下划线和连字符；Yaw 范围 -180~180。</p>';
    openEditor(node?'编辑通行节点':'新增通行节点',html,form=>saveEntity('nodes',node?.id,{code:valueOf(form,'code'),name:valueOf(form,'name'),type:valueOf(form,'type'),locationId:numberOf(form,'locationId',true),x:numberOf(form,'x'),y:numberOf(form,'y'),yaw:numberOf(form,'yaw')}));
  }

  function openLink(link){
    const nodes=detail.nodes||[];if(nodes.length<2)return notify('至少需要两个通行节点才能创建连接');
    const html=field('连接编号','<input name="code" maxlength="64" pattern="[A-Za-z0-9_-]+" value="'+escapeHtml(link?.code||'')+'" required>')+field('起点','<select name="startNodeId" required>'+options(nodes,link?.startNodeId,item=>item.id,item=>item.code+' / '+item.name)+'</select>')+field('终点','<select name="endNodeId" required>'+options(nodes,link?.endNodeId,item=>item.id,item=>item.code+' / '+item.name)+'</select>')+field('方向','<select name="direction"><option value="ONE_WAY"'+(link?.direction==='ONE_WAY'?' selected':'')+'>单向</option><option value="BIDIRECTIONAL"'+(link?.direction==='BIDIRECTIONAL'?' selected':'')+'>双向</option></select>')+field('限速（m/s）','<input name="speedLimit" type="number" min="0" step="any" value="'+escapeHtml(link?.speedLimit??0.6)+'" required>')+'<p class="api-modal-help">限速必须大于 0，起点和终点不能相同。</p>';
    openEditor(link?'编辑通行连接':'新增通行连接',html,form=>{const payload={code:valueOf(form,'code'),startNodeId:numberOf(form,'startNodeId'),endNodeId:numberOf(form,'endNodeId'),direction:valueOf(form,'direction'),speedLimit:numberOf(form,'speedLimit')};if(payload.startNodeId===payload.endNodeId)throw new Error('起点和终点不能相同');if(payload.speedLimit<=0)throw new Error('限速必须大于 0');return saveEntity('links',link?.id,payload)});
  }

  function openMachine(machine){
    const html=field('机台编号','<input name="code" maxlength="64" pattern="[A-Za-z0-9_-]+" value="'+escapeHtml(machine?.code||'')+'" required>')+field('机台名称','<input name="name" maxlength="128" value="'+escapeHtml(machine?.name||'')+'" required>')+field('机台类型','<input name="type" maxlength="64" value="'+escapeHtml(machine?.type||'MACHINE')+'" required>')+field('锚点 X','<input name="anchorX" type="number" step="any" value="'+escapeHtml(machine?.anchorX??0)+'" required>')+field('锚点 Y','<input name="anchorY" type="number" step="any" value="'+escapeHtml(machine?.anchorY??0)+'" required>')+field('锚点航向角','<input name="anchorYaw" type="number" step="any" min="-180" max="180" value="'+escapeHtml(machine?.anchorYaw??0)+'" required>');
    openEditor(machine?'编辑机台':'新增机台',html,form=>saveEntity('machines',machine?.id,{code:valueOf(form,'code'),name:valueOf(form,'name'),type:valueOf(form,'type'),anchorX:numberOf(form,'anchorX'),anchorY:numberOf(form,'anchorY'),anchorYaw:numberOf(form,'anchorYaw')}));
  }

  function openPoint(point){
    const machines=detail.machines||[];if(!machines.length)return notify('请先新增机台，再创建点位');
    const nodes=detail.nodes||[];
    const html=field('点位编号','<input name="code" maxlength="64" pattern="[A-Za-z0-9_-]+" value="'+escapeHtml(point?.code||'')+'" required>')+field('点位名称','<input name="name" maxlength="128" value="'+escapeHtml(point?.name||'')+'" required>')+field('点位类型','<input name="type" maxlength="64" value="'+escapeHtml(point?.type||'ACTION_POINT')+'" required>')+field('所属机台','<select name="machineId" required>'+options(machines,point?.machineId,item=>item.id,item=>item.code+' / '+item.name)+'</select>')+field('坐标系','<select name="frame"><option value="MAP"'+(point?.frame==='MAP'?' selected':'')+'>MAP</option><option value="MACHINE"'+(point?.frame==='MACHINE'?' selected':'')+'>MACHINE</option></select>')+field('关联导航节点（可选）','<select name="navNodeId"><option value="">不关联</option>'+options(nodes,point?.navNodeId,item=>item.id,item=>item.code+' / '+item.name)+'</select>')+field('位置 ID（可选）','<input name="locationId" type="number" value="'+escapeHtml(point?.locationId??'')+'">')+['x','y','z','rx','ry','rz'].map(name=>field(name.toUpperCase(),'<input name="'+name+'" type="number" step="any"'+(['rx','ry','rz'].includes(name)?' min="-180" max="180"':'')+' value="'+escapeHtml(point?.[name]??0)+'" required>')).join('');
    openEditor(point?'编辑机台点位':'新增机台点位',html,form=>saveEntity('points',point?.id,{machineId:numberOf(form,'machineId'),locationId:numberOf(form,'locationId',true),navNodeId:numberOf(form,'navNodeId',true),code:valueOf(form,'code'),name:valueOf(form,'name'),type:valueOf(form,'type'),frame:valueOf(form,'frame'),x:numberOf(form,'x'),y:numberOf(form,'y'),z:numberOf(form,'z'),rx:numberOf(form,'rx'),ry:numberOf(form,'ry'),rz:numberOf(form,'rz')}));
  }

  async function saveEntity(collection,id,payload){
    if(!isDraft())throw new Error('已发布配置为只读，请先创建草稿');
    const endpoint='/api/lab-configs/'+configId+'/'+collection+(id!=null?'/'+encodeURIComponent(id):'');
    await request(endpoint,{method:id!=null?'PUT':'POST',body:JSON.stringify(payload)});notify(id!=null?'配置项已更新':'配置项已新增');
  }

  async function removeEntity(collection,id,label){
    if(!isDraft())return notify('已发布配置为只读，请先创建草稿');
    if(!window.confirm('确认删除“'+label+'”吗？'))return;
    try{await request('/api/lab-configs/'+configId+'/'+collection+'/'+encodeURIComponent(id),{method:'DELETE'});notify('配置项已删除');await load()}catch(error){console.error('删除实验室配置项失败',error);notify('删除失败：'+error.message)}
  }

  function bindPageActions(){
    if(page==='passage-rules.html'){
      const addNode=resetButton('addNode'),addConnection=resetButton('addConnection');
      addNode?.addEventListener('click',()=>openNode());addConnection?.addEventListener('click',()=>openLink());
    }else{
      const addStation=resetButton('addStation'),addPoint=resetButton('addPoint');
      addStation?.addEventListener('click',()=>openMachine());addPoint?.addEventListener('click',()=>openPoint());
    }
  }

  async function load(){
    tableBody.innerHTML='<tr class="api-empty"><td colspan="'+(page==='passage-rules.html'?8:9)+'">正在加载实验室配置…</td></tr>';
    try{
      configId=await resolveConfigId();syncTabLinks();
      if(!configId){detail=null;renderContext('请先在“地图信息”中新建实验室空间');emptyTable('暂无可用实验室配置，请先创建空间或草稿',page==='passage-rules.html'?8:9);return}
      const result=await request('/api/lab-configs/'+encodeURIComponent(configId));detail=result.data||null;
      if(!detail)throw new Error('配置详情为空');
      renderContext();if(page==='passage-rules.html')renderPassage();else renderStations();
    }catch(error){console.error('加载实验室配置详情失败',error);detail=null;renderContext('配置加载失败：'+error.message);emptyTable('配置加载失败，请检查后端服务',page==='passage-rules.html'?8:9);notify('配置加载失败：'+error.message)}
  }

  bindPageActions();
  window.__labConfigApi={get configId(){return configId},get detail(){return detail},reload:load,apiUrl};
  load();
})();
