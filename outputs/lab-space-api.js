import { labRequest, uploadLabMap } from './assets/data/lab-data.js';

(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=location.protocol==='file:'?DIRECT_API_BASE_URL:'';
  const apiUrl=path=>(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+path;
  const tableBody=document.querySelector('.content .table-wrap tbody');
  const totalLabel=document.querySelector('.content .total');
  const listDescription=document.querySelector('.content .list-head p');
  const uniqueLabButton=document.getElementById('addSpaceBtn');
  const form=document.getElementById('spaceForm');
  const formTitle=document.getElementById('spaceFormTitle');
  const mapModalTitle=document.getElementById('mapModalTitle');
  const mapDetails=document.getElementById('mapDetails');
  if(!tableBody||!totalLabel||!uniqueLabButton||!form)return;


  uniqueLabButton.disabled=true;
  uniqueLabButton.textContent='唯一实验室';
  const tableHeaders=[...document.querySelectorAll('.content thead th')];
  if(tableHeaders[0])tableHeaders[0].textContent='实验室名称 / 模式';
  if(tableHeaders[2])tableHeaders[2].textContent='配置内对象';
  if(tableHeaders[3])tableHeaders[3].textContent='关联点位';
  const ruleBanner=document.querySelector('.rule-banner');
  if(ruleBanner)ruleBanner.textContent='数据规则：系统全局只有一个实验室；页面通过 GET /api/lab 获取唯一实验室，并优先使用 draft.id 作为当前 configId。';
  form.innerHTML='<div class="form-grid">'
    +'<label class="form-field lab-name-field"><span>实验室名称</span><input id="labName" maxlength="128" required></label>'
    +'<label class="form-field map-only"><span>地图名称</span><input id="labMapName" maxlength="128" required></label>'
    +'<label class="form-field map-only"><span>地图版本</span><input id="mapVersion" maxlength="64" required></label>'
    +'<label class="form-field wide map-only"><span>地图图片</span><input class="image-upload-input" id="mapImageFile" type="file" accept="image/png,image/jpeg,image/gif,image/webp"><small>PNG、JPEG、GIF 或 WEBP，最大 10MB；不选图片会保留原图</small></label>'
    +'<label class="form-field wide map-only"><span>图片地址</span><input id="mapImageUrl" maxlength="512" readonly><small class="upload-result" id="mapUploadStatus"></small></label>'
    +'</div><div class="modal-actions"><button type="button" class="modal-close" id="cancelLabForm">取消</button><button type="submit" class="modal-primary" id="submitLabForm">保存</button></div>';

  const nameInput=document.getElementById('labName');
  const mapNameInput=document.getElementById('labMapName');
  const mapVersionInput=document.getElementById('mapVersion');
  const mapImageFileInput=document.getElementById('mapImageFile');
  const mapImageInput=document.getElementById('mapImageUrl');
  const mapUploadStatus=document.getElementById('mapUploadStatus');
  const submitButton=document.getElementById('submitLabForm');
  const mapOnlyFields=[...form.querySelectorAll('.map-only')];
  const labNameField=form.querySelector('.lab-name-field');
  let formMode='rename',labSummary=null,selectedConfig=null;

  async function request(path,options={}){return labRequest(path,{baseUrl:apiBaseUrl,...options})}
  function configIdOf(config){return config?.configId??config?.id??null}

  function closeLayer(id){const modal=document.getElementById(id);if(!modal)return;modal.classList.remove('open');document.body.style.overflow='';setTimeout(()=>modal.hidden=true,200)}
  function setFormMode(mode,config){
    formMode=mode;selectedConfig=config||null;const editingMap=mode==='map';
    formTitle.textContent=editingMap?'编辑草稿地图信息':'修改实验室名称';nameInput.value=labSummary?.name||'';
    mapNameInput.value=editingMap?(config?.map?.name||''):'';mapVersionInput.value=editingMap?(config?.map?.version||''):'';mapImageFileInput.value='';mapImageInput.value=editingMap?(config?.map?.imageUrl||''):'';mapUploadStatus.textContent=editingMap&&config?.map?.imageUrl?'当前图片：'+config.map.imageUrl:'';
    labNameField.hidden=editingMap;mapOnlyFields.forEach(field=>field.hidden=!editingMap);nameInput.required=!editingMap;mapNameInput.required=editingMap;mapVersionInput.required=editingMap;submitButton.textContent=editingMap?'保存地图信息':'保存名称';
  }

  function validateImageFile(file){if(!file)throw new Error('请选择地图图片');if(!new Set(['image/png','image/jpeg','image/gif','image/webp']).has(file.type))throw new Error('仅支持 PNG、JPEG、GIF 和 WEBP 图片');if(file.size>10*1024*1024)throw new Error('图片不能超过 10MB')}
  async function uploadMapImage(file,signal){validateImageFile(file);const result=await uploadLabMap(file,{baseUrl:apiBaseUrl,signal,timeout:30000}),imageUrl=result.data?.imageUrl;if(!imageUrl)throw new Error('上传接口未返回 imageUrl');mapImageInput.value=imageUrl;mapUploadStatus.textContent='上传成功：'+imageUrl;return imageUrl}

  function addDetail(label,value,wide){const item=document.createElement('article');item.className='detail-item'+(wide?' wide':'');const caption=document.createElement('span');caption.textContent=label;const content=document.createElement('strong');content.textContent=value??'-';if(label==='地图图片')content.className='map-url';item.append(caption,content);mapDetails.appendChild(item)}
  function showMapDetails(config,label,fullDetail){
    const source=fullDetail||config||{},counts=config?.counts||{machineCount:source.machines?.length||0,nodeCount:source.nodes?.length||0,pointCount:source.points?.length||0,linkCount:source.links?.length||0},map=source.map||config?.map||{};
    mapModalTitle.textContent=(labSummary?.name||'实验室')+' · '+label;mapDetails.innerHTML='';addDetail('实验室','唯一实验室');addDetail('configId / 状态',configIdOf(config)+' / '+(source.status||config?.status||'-')+' · R'+(source.revision??config?.revision??'-'));addDetail('地图 / 版本',(map.name||'-')+' / '+(map.version||'-'),true);addDetail('地图图片',map.imageUrl||'-',true);addDetail('配置对象','机台 '+(counts.machineCount??0)+' · 节点 '+(counts.nodeCount??0)+' · 连线 '+(counts.linkCount??0)+' · 点位 '+(counts.pointCount??0),true);openModal('mapModal');
  }
  async function showConfigDetails(config,label){const configId=configIdOf(config);if(!configId)return;try{const result=await request('/api/lab-configs/'+encodeURIComponent(configId));showMapDetails(config,label,result.data||null)}catch(error){console.error('加载配置详情失败',error);showToast('配置详情加载失败：'+error.message)}}
  function configUrl(page,config){return page+'?'+new URLSearchParams({configId:String(configIdOf(config))}).toString()}
  function twoLineCell(row,primary,secondary){const cell=document.createElement('td');cell.className='two-line';const strong=document.createElement('strong');strong.textContent=primary||'-';const span=document.createElement('span');span.textContent=secondary||'-';cell.append(strong,span);row.appendChild(cell)}
  function textCell(row,value){const cell=document.createElement('td');cell.textContent=value??'-';row.appendChild(cell)}
  function actionButton(label,className,handler){const item=document.createElement('button');item.type='button';item.className='row-btn'+(className?' '+className:'');item.textContent=label;item.addEventListener('click',()=>handler(item));return item}

  async function validateConfig(config,trigger){
    const original=trigger.textContent;trigger.disabled=true;trigger.textContent='校验中…';
    try{const result=await request('/api/lab-configs/'+configIdOf(config)+'/validate',{method:'POST'}),validation=result.data||{},issues=Array.isArray(validation.issues)?validation.issues:[];if(validation.valid)return showToast('配置校验通过，可以发布');mapModalTitle.textContent=(labSummary?.name||'实验室')+' · 校验未通过';mapDetails.innerHTML='';addDetail('问题数量',issues.length+' 项');const item=document.createElement('article');item.className='detail-item wide';const caption=document.createElement('span');caption.textContent='问题详情';const content=document.createElement('strong');content.className='validation-issues';content.textContent=issues.map(issue=>(issue.code?issue.code+'：':'')+(issue.message||'未知问题')).join('；')||'后端未返回详细问题';item.append(caption,content);mapDetails.appendChild(item);openModal('mapModal')}catch(error){console.error('校验配置失败',error);showToast('校验失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}
  }
  async function publishConfig(config,trigger){if(!window.confirm('确认发布当前实验室配置草稿吗？'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='发布中…';try{await request('/api/lab-configs/'+configIdOf(config)+'/publish',{method:'POST'});showToast('实验室配置已发布');await loadLab()}catch(error){console.error('发布配置失败',error);showToast('发布失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}
  async function deleteDraft(config,trigger){if(!window.confirm('确认删除当前配置草稿吗？此操作不可撤销。'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='删除中…';try{await request('/api/lab-configs/'+configIdOf(config),{method:'DELETE'});showToast('配置草稿已删除');await loadLab()}catch(error){console.error('删除草稿失败',error);showToast('删除失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}
  async function createDraft(trigger){if(!window.confirm('确认从已发布版本创建新草稿吗？'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='创建中…';try{const result=await request('/api/lab/drafts',{method:'POST'});showToast('草稿创建成功 · configId '+(result.data?.configId??'-'));await loadLab()}catch(error){console.error('创建草稿失败',error);showToast('草稿创建失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}

  function renderLab(lab){
    labSummary=lab||null;tableBody.innerHTML='';
    if(!lab){tableBody.innerHTML='<tr class="empty-row"><td colspan="6">未获取到唯一实验室数据</td></tr>';totalLabel.textContent='共计 0 条数据';updateSummary(null);return}
    const config=lab.draft||lab.published,map=config?.map||{},counts=config?.counts||{},row=document.createElement('tr');twoLineCell(row,lab.name,'唯一实验室');twoLineCell(row,(map.name||'-')+(map.version?' '+map.version:''),map.imageUrl||'-');textCell(row,'机台 '+(counts.machineCount??0)+' · 节点 '+(counts.nodeCount??0)+' · 连线 '+(counts.linkCount??0));
    const pointCell=document.createElement('td'),pointButton=document.createElement('button');pointButton.type='button';pointButton.className='nav-count';pointButton.textContent=(counts.pointCount??0)+' 个点位';pointButton.disabled=!config;pointButton.addEventListener('click',()=>showMapDetails(config,'点位概要'));pointCell.appendChild(pointButton);row.appendChild(pointCell);
    const statusCell=document.createElement('td'),status=document.createElement('span');status.className='badge '+(lab.draft?'badge-blue':lab.published?'badge-green':'');status.textContent=lab.draft?'草稿 R'+lab.draft.revision:lab.published?'已发布 R'+lab.published.revision:'未配置';statusCell.appendChild(status);row.appendChild(statusCell);
    const actionCell=document.createElement('td'),actions=document.createElement('div');actions.className='row-actions';const view=actionButton('配置详情','',()=>showConfigDetails(config,lab.draft?'当前草稿':'已发布配置'));view.disabled=!config;const rename=actionButton('修改名称','blue',()=>{setFormMode('rename');openModal('spaceFormModal')});const draft=actionButton(lab.draft?'已有草稿':'创建草稿','',trigger=>createDraft(trigger));draft.disabled=Boolean(lab.draft)||!lab.published;actions.append(view,rename,draft);
    if(config)actions.appendChild(actionButton('配置通行/机台','blue',()=>location.href=configUrl('passage-rules.html',config)));
    if(lab.draft)actions.append(actionButton('编辑地图','',()=>{setFormMode('map',lab.draft);openModal('spaceFormModal')}),actionButton('校验','',trigger=>validateConfig(lab.draft,trigger)),actionButton('发布','blue',trigger=>publishConfig(lab.draft,trigger)),actionButton('删除草稿','danger',trigger=>deleteDraft(lab.draft,trigger)));
    actionCell.appendChild(actions);row.appendChild(actionCell);tableBody.appendChild(row);totalLabel.textContent='共计 1 条数据';updateSummary(lab);
  }

  function updateSummary(lab){const cards=[...document.querySelectorAll('.summary-card')],config=lab&&(lab.draft||lab.published),counts=config?.counts||{};if(cards[0]){cards[0].querySelector('span').textContent='实验室模式';cards[0].querySelector('strong').textContent=lab?'唯一':'-';cards[0].querySelector('p').textContent='系统全局只保留一个实验室'}if(cards[1]){cards[1].querySelector('span').textContent='当前 configId / 版本';cards[1].querySelector('strong').textContent=config?(configIdOf(config)+' / R'+config.revision):'-';cards[1].querySelector('p').textContent=config?.status||'暂无配置'}if(cards[2]){cards[2].querySelector('span').textContent='配置对象';cards[2].querySelector('strong').textContent=(counts.machineCount??0)+' / '+(counts.nodeCount??0);cards[2].querySelector('p').textContent='机台数 / 通行节点数'}}

  async function loadLab(){
    tableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted)">正在加载唯一实验室…</td></tr>';listDescription.textContent='通过 GET /api/lab 获取唯一实验室，草稿优先使用 draft.id 作为 configId';
    try{const result=await request('/api/lab');renderLab(result.data||null)}catch(error){console.error('加载唯一实验室失败',error);labSummary=null;tableBody.innerHTML='<tr class="empty-row"><td colspan="6" class="backend-warning">唯一实验室接口加载失败：'+String(error.message).replace(/[<>]/g,'')+'</td></tr>';totalLabel.textContent='接口加载失败';updateSummary(null);showToast('唯一实验室加载失败：'+error.message)}
  }

  mapImageFileInput.addEventListener('change',()=>{mapImageInput.value=selectedConfig?.map?.imageUrl||'';const file=mapImageFileInput.files?.[0];if(!file){mapUploadStatus.textContent=mapImageInput.value?'当前图片：'+mapImageInput.value:'';return}try{validateImageFile(file);mapUploadStatus.textContent='已选择：'+file.name+' · '+Math.ceil(file.size/1024)+'KB'}catch(error){mapImageFileInput.value='';mapUploadStatus.textContent=error.message;showToast(error.message)}});
  document.getElementById('cancelLabForm').addEventListener('click',()=>closeLayer('spaceFormModal'));
  form.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();let endpoint,method,payload;const imageFile=mapImageFileInput.files?.[0];
    if(formMode==='rename'){const name=nameInput.value.trim();if(!name)return showToast('请填写实验室名称');endpoint='/api/lab';method='PUT';payload={name}}
    else{const mapName=mapNameInput.value.trim(),version=mapVersionInput.value.trim();if(!selectedConfig||!mapName||!version)return showToast('请完整填写地图信息');if(imageFile){try{validateImageFile(imageFile)}catch(error){return showToast(error.message)}}endpoint='/api/lab-configs/'+encodeURIComponent(configIdOf(selectedConfig))+'/map';method='PUT';payload={mapName,version}}
    const original=submitButton.textContent,controller=new AbortController(),timeoutId=setTimeout(()=>controller.abort(),30000);submitButton.disabled=true;submitButton.textContent=imageFile?'上传图片中…':'保存中…';
    try{if(formMode==='map'){const imageUrl=imageFile?await uploadMapImage(imageFile,controller.signal):mapImageInput.value.trim();if(!imageUrl||!imageUrl.startsWith('/'))throw new Error('图片地址必须是上传接口返回的相对地址');payload={name:payload.mapName,version:payload.version,imageUrl}}await request(endpoint,{method,body:JSON.stringify(payload),signal:controller.signal});closeLayer('spaceFormModal');showToast(formMode==='rename'?'实验室名称已更新':'草稿地图信息已更新');await loadLab()}catch(error){console.error('保存实验室失败',error);showToast(error.name==='AbortError'?'连接后端超时':'保存失败：'+error.message)}finally{clearTimeout(timeoutId);submitButton.disabled=false;submitButton.textContent=original}
  },true);

  window.__labSpaceApi={summaryEndpoint:apiUrl('/api/lab'),uploadEndpoint:apiUrl('/api/files/images'),reload:loadLab,get configId(){return configIdOf(labSummary?.draft||labSummary?.published)}};
  setFormMode('rename');loadLab();
})();
