import { labRequest, uploadLabMap } from './assets/data/lab-data.js';

(function(){
  'use strict';


  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
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
  const mapModal=document.getElementById('mapModal');
  const mapPreview=document.getElementById('mapPreview');
  const mapPreviewImage=document.getElementById('mapPreviewImage');
  const mapPreviewEmpty=document.getElementById('mapPreviewEmpty');
  const mapPreviewEmptyTitle=document.getElementById('mapPreviewEmptyTitle');
  const mapPreviewEmptyHint=document.getElementById('mapPreviewEmptyHint');
  const mapPreviewName=document.getElementById('mapPreviewName');
  const mapPreviewVersion=document.getElementById('mapPreviewVersion');
  if(!tableBody||!totalLabel||!uniqueLabButton||!form)return;


  const ruleBanner=document.querySelector('.rule-banner');
  if(ruleBanner)ruleBanner.innerHTML='<svg class="icon"><use href="assets/icons.svg#i-info"/></svg><span>数据规则：一个实验室空间只对应一张当前发布的底盘地图，但该地图可以关联多个导航点。实验室空间是机台、库位、动作点位、路径和外围资源的统一归属对象。</span>';
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
  function resolveMapImageUrl(value){const path=String(value||'').trim();if(!path)return'';if(/^(?:https?:|data:|blob:)/i.test(path))return path;return apiUrl(path.startsWith('/')?path:'/'+path)}
  function renderMapPreview(map,visible){
    mapModal?.classList.toggle('map-preview-open',Boolean(visible));
    if(!mapPreview||!mapPreviewImage||!mapPreviewEmpty)return;
    mapPreview.hidden=!visible;
    if(!visible){mapPreviewImage.removeAttribute('src');mapPreviewImage.hidden=true;mapPreviewEmpty.hidden=true;return}
    const imageUrl=resolveMapImageUrl(map?.imageUrl);
    mapPreviewName.textContent=map?.name||'未命名地图';
    mapPreviewVersion.textContent=map?.version?'版本 '+map.version:'未设置版本';
    mapPreviewImage.alt=(map?.name||'地图')+'预览图';
    mapPreviewImage.hidden=!imageUrl;
    mapPreviewEmpty.hidden=Boolean(imageUrl);
    mapPreviewEmptyTitle.textContent=imageUrl?'地图图片加载失败':'暂无地图图片';
    mapPreviewEmptyHint.textContent=imageUrl?'请检查图片地址或后端文件服务':'请先编辑地图并上传图片';
    mapPreviewImage.onload=()=>{mapPreviewImage.hidden=false;mapPreviewEmpty.hidden=true};
    mapPreviewImage.onerror=()=>{mapPreviewImage.hidden=true;mapPreviewEmpty.hidden=false};
    if(imageUrl)mapPreviewImage.src=imageUrl;else mapPreviewImage.removeAttribute('src');
  }
  function showMapDetails(config,label,fullDetail,{preview=false}={}){
    const source=fullDetail||config||{},counts=config?.counts||{machineCount:source.machines?.length||0,nodeCount:source.nodes?.length||0,pointCount:source.points?.length||0,linkCount:source.links?.length||0},map=source.map||config?.map||{};
    mapModalTitle.textContent=(labSummary?.name||'实验室')+' · '+label;renderMapPreview(map,preview);mapDetails.innerHTML='';addDetail('实验室','唯一实验室');addDetail('configId / 状态',configIdOf(config)+' / '+(source.status||config?.status||'-')+' · R'+(source.revision??config?.revision??'-'));addDetail('地图 / 版本',(map.name||'-')+' / '+(map.version||'-'),true);addDetail('地图图片',map.imageUrl||'-',true);addDetail('配置对象','机台 '+(counts.machineCount??0)+' · 节点 '+(counts.nodeCount??0)+' · 连线 '+(counts.linkCount??0)+' · 点位 '+(counts.pointCount??0),true);openModal('mapModal');
  }
  async function showMapPreview(config,trigger){const configId=configIdOf(config);if(!configId)return;if(trigger){trigger.disabled=true;trigger.setAttribute('aria-busy','true')}try{const result=await request('/api/lab-configs/'+encodeURIComponent(configId));showMapDetails(config,'查看地图',result.data||config,{preview:true})}catch(error){console.error('加载地图详情失败',error);showMapDetails(config,'查看地图',config,{preview:true});showToast('地图详情加载失败，已展示列表中的地图信息')}finally{if(trigger){trigger.disabled=false;trigger.removeAttribute('aria-busy')}}}
  async function showConfigDetails(config,label){const configId=configIdOf(config);if(!configId)return;try{const result=await request('/api/lab-configs/'+encodeURIComponent(configId));showMapDetails(config,label,result.data||null)}catch(error){console.error('加载配置详情失败',error);showToast('配置详情加载失败：'+error.message)}}
  function configUrl(page,config){return page+'?'+new URLSearchParams({configId:String(configIdOf(config))}).toString()}
  function twoLineCell(row,primary,secondary){const cell=document.createElement('td');cell.className='two-line';const strong=document.createElement('strong');strong.textContent=primary||'-';const span=document.createElement('span');span.textContent=secondary||'-';cell.append(strong,span);row.appendChild(cell)}
  function textCell(row,value){const cell=document.createElement('td');cell.textContent=value??'-';row.appendChild(cell)}
  function actionButton(label,className,handler){const item=document.createElement('button');item.type='button';item.className='row-btn'+(className?' '+className:'');item.textContent=label;item.addEventListener('click',()=>handler(item));return item}
  function iconAction(icon,label,handler){const item=document.createElement('button');item.type='button';item.className='icon-action';item.setAttribute('aria-label',label);item.title=label;item.innerHTML='<svg class="icon"><use href="assets/icons.svg#'+icon+'"/></svg>';item.addEventListener('click',()=>handler(item));return item}

  async function validateConfig(config,trigger){
    const original=trigger.textContent;trigger.disabled=true;trigger.textContent='校验中…';
    try{const result=await request('/api/lab-configs/'+configIdOf(config)+'/validate',{method:'POST'}),validation=result.data||{},issues=Array.isArray(validation.issues)?validation.issues:[];if(validation.valid)return showToast('配置校验通过，可以发布');mapModalTitle.textContent=(labSummary?.name||'实验室')+' · 校验未通过';renderMapPreview(null,false);mapDetails.innerHTML='';addDetail('问题数量',issues.length+' 项');const item=document.createElement('article');item.className='detail-item wide';const caption=document.createElement('span');caption.textContent='问题详情';const content=document.createElement('strong');content.className='validation-issues';content.textContent=issues.map(issue=>(issue.code?issue.code+'：':'')+(issue.message||'未知问题')).join('；')||'后端未返回详细问题';item.append(caption,content);mapDetails.appendChild(item);openModal('mapModal')}catch(error){console.error('校验配置失败',error);showToast('校验失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}
  }
  async function publishConfig(config,trigger){if(!window.confirm('确认发布当前实验室配置草稿吗？'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='发布中…';try{await request('/api/lab-configs/'+configIdOf(config)+'/publish',{method:'POST'});showToast('实验室配置已发布');await loadLab()}catch(error){console.error('发布配置失败',error);showToast('发布失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}
  async function deleteDraft(config,trigger){if(!window.confirm('确认删除当前配置草稿吗？此操作不可撤销。'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='删除中…';try{await request('/api/lab-configs/'+configIdOf(config),{method:'DELETE'});showToast('配置草稿已删除');await loadLab()}catch(error){console.error('删除草稿失败',error);showToast('删除失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}
  async function createDraft(trigger){if(!window.confirm('确认从已发布版本创建新草稿吗？'))return;const original=trigger.textContent;trigger.disabled=true;trigger.textContent='创建中…';try{const result=await request('/api/lab/drafts',{method:'POST'});showToast('草稿创建成功 · configId '+(result.data?.configId??'-'));await loadLab()}catch(error){console.error('创建草稿失败',error);showToast('草稿创建失败：'+error.message)}finally{trigger.disabled=false;trigger.textContent=original}}

  function renderLab(lab){
    labSummary=lab||null;tableBody.innerHTML='';
    if(!lab){tableBody.innerHTML='<tr class="empty-row"><td colspan="6">未获取到唯一实验室数据</td></tr>';totalLabel.textContent='共计 0 条数据';updateSummary(null);return}
    const config=lab.draft||lab.published,map=config?.map||{},counts=config?.counts||{},row=document.createElement('tr');twoLineCell(row,lab.name,'唯一实验室');twoLineCell(row,(map.name||'-')+(map.version?' '+map.version:''),map.imageUrl||'-');textCell(row,'机台 '+(counts.machineCount??0)+' · 节点 '+(counts.nodeCount??0)+' · 连线 '+(counts.linkCount??0));
    textCell(row,(counts.pointCount??0)+' 个点位');
    const statusCell=document.createElement('td'),status=document.createElement('span');status.className='badge '+(lab.draft?'badge-blue':lab.published?'badge-green':'');status.textContent=lab.draft?'草稿 R'+lab.draft.revision:lab.published?'已发布 R'+lab.published.revision:'未配置';statusCell.appendChild(status);row.appendChild(statusCell);
    const actionCell=document.createElement('td'),actions=document.createElement('div');actions.className='row-actions';actions.dataset.agvActionMenu='icon';const edit=iconAction('i-edit','编辑地图',()=>{if(lab.draft){setFormMode('map',lab.draft);openModal('spaceFormModal')}else showToast('请先创建地图草稿')});edit.disabled=!config;const view=iconAction('i-map','查看地图',trigger=>showMapPreview(config,trigger));view.disabled=!config;const detail=actionButton('配置详情','',()=>showConfigDetails(config,lab.draft?'当前草稿':'已发布配置'));detail.disabled=!config;const rename=actionButton('修改名称','blue',()=>{setFormMode('rename');openModal('spaceFormModal')});actions.append(edit,view,detail,rename);if(config)actions.appendChild(actionButton('配置通行/机台','blue',()=>location.href=configUrl('passage-rules.html',config)));if(lab.draft)actions.append(actionButton('校验','',trigger=>validateConfig(lab.draft,trigger)),actionButton('发布','blue',trigger=>publishConfig(lab.draft,trigger)),actionButton('删除草稿','danger',trigger=>deleteDraft(lab.draft,trigger)));else if(lab.published)actions.appendChild(actionButton('创建草稿','',trigger=>createDraft(trigger)));
    actionCell.appendChild(actions);row.appendChild(actionCell);if(config){row.classList.add('clickable-map-row');row.tabIndex=0;row.setAttribute('aria-label','查看 '+(map.name||'当前地图'));row.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,textarea'))return;showMapPreview(config)});row.addEventListener('keydown',event=>{if(event.target!==row||(event.key!=='Enter'&&event.key!==' '))return;event.preventDefault();showMapPreview(config)})}tableBody.appendChild(row);totalLabel.textContent='共计 1 条数据';updateSummary(lab);
  }

  function updateSummary(lab){const cards=[...document.querySelectorAll('.summary-card')],config=lab&&(lab.draft||lab.published),map=config?.map||{},counts=config?.counts||{};if(cards[0]){cards[0].querySelector('strong').textContent=lab?((lab.name||'-')+' / '+(map.name||'-')):'-';cards[0].querySelector('p').textContent=lab?'当前实验室空间与其发布地图':'暂无实验室数据'}if(cards[1]){cards[1].querySelector('strong').textContent=config?('1 : '+(counts.pointCount??0)):'-';cards[1].querySelector('p').textContent='一张地图可定义多个导航点'}if(cards[2]){cards[2].querySelector('strong').textContent=(counts.machineCount??0)+' / '+(counts.nodeCount??0)+' / '+(counts.pointCount??0);cards[2].querySelector('p').textContent='机台 / 通行节点 / 导航点'}}

  async function loadLab(){
    tableBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted)">正在加载唯一实验室…</td></tr>';
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
  uniqueLabButton.addEventListener('click',()=>{setFormMode('rename');openModal('spaceFormModal')});
  setFormMode('rename');loadLab();
})();
