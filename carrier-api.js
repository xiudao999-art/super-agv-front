(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
  const apiBaseUrl=typeof window.CARRIER_API_BASE_URL==='string'
    ?window.CARRIER_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const baseUrl=apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'';
  const endpoint=baseUrl+'/carriers';
  const carrierTypeEndpoint=baseUrl+'/carrierTypes';
  const locationEndpoint=baseUrl+'/locations';
  const body=document.getElementById('carrierBody');
  const form=document.getElementById('carrierForm');
  const addButton=document.getElementById('addCarrier');
  const formTitle=document.getElementById('formTitle');
  const detailTitle=document.getElementById('positionTitle');
  const detailContent=document.getElementById('positionDetail');
  const table=document.querySelector('table[aria-label="载具记录"]');
  if(!body||!form||!addButton||!table)return;

  let carrierRecords=[];
  let carrierTypes=[];
  let locations=[];
  let selectedId=null;
  let editingId=null;
  let listController=null;
  let saving=false;
  const deletingIds=new Set();

  const statusMeta={
    IDLE:{label:'空闲',className:'idle'},
    STORED:{label:'在库',className:'stored'},
    PENDING:{label:'待处理',className:'pending'},
    TRANSPORTING:{label:'运输中',className:'transporting'},
    PROCESSING:{label:'机台处理中',className:'processing'},
    IN_USE:{label:'使用中',className:'processing'},
    LOCKED:{label:'锁定',className:'pending'},
    ABNORMAL:{label:'异常',className:'abnormal'}
  };

  const style=document.createElement('style');
  style.textContent='.carrier-filter{display:flex;align-items:center;gap:10px;margin:0 0 14px}.carrier-filter input,.carrier-filter select{height:38px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font-size:12px}.carrier-filter input{width:min(230px,38vw)}.carrier-filter button{height:38px;padding:0 15px;border:0;border-radius:8px;color:var(--blue-strong);background:var(--blue-pale);font-size:12px;font-weight:650;cursor:pointer}.carrier-empty{text-align:center;color:var(--muted)}.carrier-actions{display:flex;gap:7px}.carrier-row-btn{height:27px;padding:0 10px;border:1px solid #cde2f3;border-radius:15px;color:var(--blue-strong);background:#f1f8fd;font-size:11px;font-weight:650;cursor:pointer}.carrier-row-btn.delete{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.carrier-row-btn:disabled{cursor:not-allowed;opacity:.55}.state-idle{color:#59616a;border-color:#dfe4e8;background:#f7f8f9}.state-abnormal{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.enabled-tag{display:inline-flex;padding:4px 8px;border-radius:12px;color:var(--green);background:#edf9f3;font-size:11px}.enabled-tag.disabled{color:#8d949c;background:#f1f3f5}.form-field textarea{min-height:76px;padding:10px 11px;resize:vertical;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font:inherit;font-size:12px}@media(max-width:760px){.carrier-filter{align-items:stretch;flex-direction:column}.carrier-filter input,.carrier-filter select,.carrier-filter button{width:100%}}';
  style.textContent+='.api-loading-cell{height:120px!important;text-align:center}.api-loading{display:inline-flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:12px}.api-loading:before{content:"";width:17px;height:17px;border:2px solid #dbe8f2;border-top-color:var(--blue);border-radius:50%;animation:api-loading-spin .7s linear infinite}@keyframes api-loading-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  table.querySelector('thead tr').innerHTML='<th>载具编码</th><th>条码</th><th>载具类型</th><th>当前库位</th><th>载具状态</th><th>关联订单</th><th>启用状态</th><th>最后扫描/更新</th><th>操作</th>';
  table.style.minWidth='1220px';
  const banner=document.querySelector('.rule-banner');
  if(banner)banner.textContent='载具信息由后端统一维护；当前位置已通过库位接口解析为库位名称和编码。';

  const filter=document.createElement('div');
  filter.className='carrier-filter';
  filter.innerHTML='<input id="carrierCodeFilter" placeholder="按载具编码查询"><select id="carrierStatusFilter"><option value="">全部载具状态</option><option value="IDLE">空闲</option><option value="STORED">在库</option><option value="PENDING">待处理</option><option value="TRANSPORTING">运输中</option><option value="PROCESSING">机台处理中</option><option value="ABNORMAL">异常</option></select><select id="carrierEnabledFilter"><option value="">全部启用状态</option><option value="1">启用</option><option value="0">停用</option></select><button type="button" id="carrierQuery">查询</button><button type="button" id="carrierReset">重置</button>';
  document.querySelector('.table-wrap').before(filter);
  const codeFilter=document.getElementById('carrierCodeFilter');
  const statusFilter=document.getElementById('carrierStatusFilter');
  const enabledFilter=document.getElementById('carrierEnabledFilter');

  form.querySelector('.form-grid').innerHTML='<label class="form-field"><span>载具编码 *</span><input id="formId" required maxlength="64" placeholder="例如 TRAY-000280"></label><label class="form-field"><span>条码</span><input id="formBarcode" maxlength="100" placeholder="例如 BC-TRAY-000280"></label><label class="form-field"><span>载具类型</span><select id="formType"><option value="">请选择载具类型</option></select></label><label class="form-field"><span>载具状态</span><select id="formStatus"><option value="IDLE">空闲</option><option value="STORED">在库</option><option value="PENDING">待处理</option><option value="TRANSPORTING">运输中</option><option value="PROCESSING">机台处理中</option><option value="IN_USE">使用中</option><option value="LOCKED">锁定</option><option value="ABNORMAL">异常</option></select></label><label class="form-field"><span>当前库位</span><select id="formLocation"><option value="">未分配库位</option></select></label><label class="form-field"><span>启用状态</span><select id="formEnabled"><option value="1">启用</option><option value="0">停用</option></select></label><label class="form-field"><span>关联业务订单编码</span><input id="formRelatedOrderCode"></label><label class="form-field"><span>最后扫描时间</span><input id="formLastScanTime" placeholder="例如 2026-08-25 14:30:00"></label><label class="form-field wide"><span>备注</span><textarea id="formRemark" maxlength="500"></textarea></label>';
  const submitButton=form.querySelector('[type="submit"]');
  const formTypeSelect=document.getElementById('formType');
  const formLocationSelect=document.getElementById('formLocation');

  function statusInfo(value){return statusMeta[value]||{label:value||'-',className:'idle'}}
  function carrierTypeName(id){const match=carrierTypes.find(item=>String(item.id)===String(id));return match?match.typeName+' · '+match.typeCode:(id===null||id===undefined||id===''?'-':'类型 #'+id)}
  function locationName(id){const match=locations.find(item=>String(item.id)===String(id));return match?match.locationName+' · '+match.locationCode:(id===null||id===undefined||id===''?'-':'库位 #'+id)}

  function setTextCell(row,value){
    const cell=document.createElement('td');cell.textContent=value===null||value===undefined||value===''?'-':String(value);row.appendChild(cell);
  }

  function setEmpty(message){
    body.innerHTML='';const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=9;cell.className='carrier-empty';cell.textContent=message;row.appendChild(cell);body.appendChild(row);
  }
  function setLoading(message){body.innerHTML='';const row=document.createElement('tr'),cell=document.createElement('td'),indicator=document.createElement('div');cell.colSpan=9;cell.className='carrier-empty api-loading-cell';indicator.className='api-loading';indicator.textContent=message;cell.appendChild(indicator);row.appendChild(cell);body.appendChild(row)}

  function renderRows(){
    body.innerHTML='';
    if(!carrierRecords.length){setEmpty('暂无载具数据');return}
    if(!carrierRecords.some(item=>String(item.id)===String(selectedId)))selectedId=carrierRecords[0].id;
    carrierRecords.forEach(item=>{
      const row=document.createElement('tr');row.dataset.id=String(item.id);if(String(item.id)===String(selectedId))row.classList.add('selected');
      setTextCell(row,item.carrierCode);setTextCell(row,item.barcode);setTextCell(row,carrierTypeName(item.carrierTypeId));setTextCell(row,locationName(item.currentLocationId));
      const meta=statusInfo(item.carrierStatus),statusCell=document.createElement('td'),status=document.createElement('span');status.className='status-tag state-'+meta.className;status.textContent=meta.label;statusCell.appendChild(status);row.appendChild(statusCell);
      setTextCell(row,item.relatedOrderCode);
      const enabledCell=document.createElement('td'),enabled=document.createElement('span');enabled.className='enabled-tag'+(Number(item.enabled)===1?'':' disabled');enabled.textContent=Number(item.enabled)===1?'启用':'停用';enabledCell.appendChild(enabled);row.appendChild(enabledCell);
      setTextCell(row,item.lastScanTime||item.updateTime||item.createTime);
      const operationCell=document.createElement('td'),actions=document.createElement('div');actions.className='carrier-actions';
      const detailButton=document.createElement('button');detailButton.type='button';detailButton.className='carrier-row-btn';detailButton.textContent='详情';
      const rowEdit=document.createElement('button');rowEdit.type='button';rowEdit.className='carrier-row-btn';rowEdit.textContent='编辑';
      const rowDelete=document.createElement('button');rowDelete.type='button';rowDelete.className='carrier-row-btn delete';rowDelete.textContent=deletingIds.has(String(item.id))?'删除中…':'删除';rowDelete.disabled=deletingIds.has(String(item.id));
      detailButton.addEventListener('click',event=>{event.stopPropagation();selectedId=item.id;renderRows();openCarrierDetail(item.id)});
      rowEdit.addEventListener('click',event=>{event.stopPropagation();selectedId=item.id;renderRows();openEditForm(item.id)});
      rowDelete.addEventListener('click',event=>{event.stopPropagation();deleteCarrier(item)});
      actions.append(detailButton,rowEdit,rowDelete);operationCell.appendChild(actions);row.appendChild(operationCell);
      row.addEventListener('click',()=>{selectedId=item.id;renderRows()});body.appendChild(row);
    });
  }

  async function parseApiResponse(response){
    const text=await response.text();if(!text)return{};
    try{return JSON.parse(text)}catch(error){return{message:text}}
  }
  function assertApiSuccess(response,result){
    if(!response.ok)throw new Error(result.message||result.error||('HTTP '+response.status));
    if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
  }

  async function loadCarrierTypes(){
    try{
      const response=await fetch(carrierTypeEndpoint,{headers:{Accept:'application/json'}});const result=await parseApiResponse(response);assertApiSuccess(response,result);
      carrierTypes=Array.isArray(result.data)?result.data:[];
    }catch(error){console.error('加载载具类型选项失败',error);carrierTypes=[]}
    formTypeSelect.innerHTML='<option value="">请选择载具类型</option>';
    carrierTypes.forEach(item=>{const option=document.createElement('option');option.value=String(item.id);option.textContent=(item.typeName||item.typeCode)+' · '+item.typeCode;formTypeSelect.appendChild(option)});
  }

  async function loadLocations(){
    try{const response=await fetch(locationEndpoint,{headers:{Accept:'application/json'}});const result=await parseApiResponse(response);assertApiSuccess(response,result);locations=Array.isArray(result.data)?result.data:[]}
    catch(error){console.error('加载库位选项失败',error);locations=[]}
    formLocationSelect.innerHTML='<option value="">未分配库位</option>';locations.forEach(item=>{const option=document.createElement('option');option.value=String(item.id);option.textContent=(item.locationName||item.locationCode)+' · '+item.locationCode;formLocationSelect.appendChild(option)});
  }

  async function loadCarriers(){
    listController?.abort();listController=new AbortController();setLoading('正在加载载具…');
    const params=new URLSearchParams();if(codeFilter.value.trim())params.set('carrierCode',codeFilter.value.trim());if(statusFilter.value)params.set('carrierStatus',statusFilter.value);if(enabledFilter.value!=='')params.set('enabled',enabledFilter.value);
    try{
      const query=params.toString();const response=await fetch(endpoint+(query?'?'+query:''),{headers:{Accept:'application/json'},signal:listController.signal});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);carrierRecords=Array.isArray(result.data)?result.data:[];renderRows();window.__carrierApi.items=carrierRecords;
    }catch(error){if(error.name==='AbortError')return;console.error('加载载具失败',error);carrierRecords=[];setEmpty('载具加载失败：'+error.message);showToast('载具加载失败：'+error.message)}
  }

  async function fetchDetail(id){
    const response=await fetch(endpoint+'/'+encodeURIComponent(id),{headers:{Accept:'application/json'}});const result=await parseApiResponse(response);assertApiSuccess(response,result);return result.data||result;
  }

  function addDetailItem(label,value,wide){
    const article=document.createElement('article');article.className='detail-item'+(wide?' wide':'');const name=document.createElement('span'),content=document.createElement('strong');name.textContent=label;content.textContent=value===null||value===undefined||value===''?'-':String(value);article.append(name,content);detailContent.appendChild(article);
  }

  async function openCarrierDetail(id){
    try{
      const item=await fetchDetail(id),meta=statusInfo(item.carrierStatus);detailTitle.textContent='载具详情 · '+(item.carrierCode||id);detailContent.innerHTML='';
      addDetailItem('载具编码',item.carrierCode);addDetailItem('条码',item.barcode);addDetailItem('载具类型',carrierTypeName(item.carrierTypeId));addDetailItem('载具状态',meta.label);addDetailItem('当前库位',locationName(item.currentLocationId));addDetailItem('启用状态',Number(item.enabled)===1?'启用':'停用');addDetailItem('关联订单',item.relatedOrderCode);addDetailItem('最后扫描时间',item.lastScanTime);addDetailItem('备注',item.remark,true);
      document.getElementById('openStorage').href='storage-and-carriers.html?carrier='+encodeURIComponent(item.carrierCode||'');openModal('positionModal');
    }catch(error){console.error('加载载具详情失败',error);showToast('详情加载失败：'+error.message)}
  }

  function ensureSelectOption(select,value,label){if(value===null||value===undefined||value==='')return;if(![...select.options].some(option=>option.value===String(value))){const option=document.createElement('option');option.value=String(value);option.textContent=label||String(value);select.appendChild(option)}}
  function fillForm(item){
    document.getElementById('formId').value=item.carrierCode||'';document.getElementById('formBarcode').value=item.barcode||'';
    ensureSelectOption(formTypeSelect,item.carrierTypeId,'类型 #'+item.carrierTypeId);formTypeSelect.value=item.carrierTypeId??'';
    const statusSelect=document.getElementById('formStatus');ensureSelectOption(statusSelect,item.carrierStatus,item.carrierStatus);statusSelect.value=item.carrierStatus||'IDLE';
    ensureSelectOption(formLocationSelect,item.currentLocationId,'库位 #'+item.currentLocationId);formLocationSelect.value=item.currentLocationId??'';document.getElementById('formEnabled').value=Number(item.enabled)===0?'0':'1';document.getElementById('formRelatedOrderCode').value=item.relatedOrderCode||'';document.getElementById('formLastScanTime').value=item.lastScanTime||'';document.getElementById('formRemark').value=item.remark||'';
  }
  function openAddForm(){editingId=null;formTitle.textContent='新增载具';fillForm({carrierStatus:'IDLE',enabled:1});document.getElementById('formId').disabled=false;openModal('carrierFormModal')}
  async function openEditForm(id){
    if(id===null||id===undefined)return showToast('请选择要编辑的载具');
    try{const detail=await fetchDetail(id);editingId=detail.id??id;formTitle.textContent='编辑载具 · '+(detail.carrierCode||id);fillForm(detail);document.getElementById('formId').disabled=true;openModal('carrierFormModal')}
    catch(error){console.error('加载载具详情失败',error);showToast('详情加载失败：'+error.message)}
  }

  function formPayload(){
    const locationValue=formLocationSelect.value;
    return{carrierCode:document.getElementById('formId').value.trim(),barcode:document.getElementById('formBarcode').value.trim(),carrierTypeId:formTypeSelect.value===''?null:Number(formTypeSelect.value),currentLocationId:locationValue===''?null:Number(locationValue),carrierStatus:document.getElementById('formStatus').value,relatedOrderCode:document.getElementById('formRelatedOrderCode').value.trim(),lastScanTime:document.getElementById('formLastScanTime').value.trim(),enabled:Number(document.getElementById('formEnabled').value),remark:document.getElementById('formRemark').value.trim()};
  }
  async function saveCarrier(){
    if(saving)return;const payload=formPayload();if(!payload.carrierCode)return showToast('请填写载具编码');if(payload.currentLocationId!==null&&(!Number.isInteger(payload.currentLocationId)||payload.currentLocationId<1))return showToast('当前库位 ID 必须是大于 0 的整数');
    saving=true;submitButton.disabled=true;const originalText=submitButton.textContent;submitButton.textContent='保存中…';
    try{const response=await fetch(editingId===null?endpoint:endpoint+'/'+encodeURIComponent(editingId),{method:editingId===null?'POST':'PUT',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});const result=await parseApiResponse(response);assertApiSuccess(response,result);closeModal('carrierFormModal');showToast(editingId===null?'载具已新增':'载具已更新');const saved=result.data||{};selectedId=saved.id??editingId??selectedId;await loadCarriers()}
    catch(error){console.error('保存载具失败',error);showToast('保存失败：'+error.message)}finally{saving=false;submitButton.disabled=false;submitButton.textContent=originalText}
  }
  async function deleteCarrier(item){
    const id=String(item.id);if(deletingIds.has(id))return;if(!confirm('确认删除载具“'+(item.carrierCode||id)+'”吗？'))return;deletingIds.add(id);renderRows();
    try{const response=await fetch(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',headers:{Accept:'application/json'}});const result=await parseApiResponse(response);assertApiSuccess(response,result);if(String(selectedId)===id)selectedId=null;showToast('载具已删除');await loadCarriers()}
    catch(error){console.error('删除载具失败',error);showToast('删除失败：'+error.message)}finally{deletingIds.delete(id);renderRows()}
  }

  addButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openAddForm()},true);
  form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();saveCarrier()},true);
  document.getElementById('carrierQuery').addEventListener('click',loadCarriers);
  document.getElementById('carrierReset').addEventListener('click',()=>{codeFilter.value='';statusFilter.value='';enabledFilter.value='';loadCarriers()});
  codeFilter.addEventListener('keydown',event=>{if(event.key==='Enter')loadCarriers()});statusFilter.addEventListener('change',loadCarriers);enabledFilter.addEventListener('change',loadCarriers);

  window.__carrierApi={endpoint,items:carrierRecords,reload:loadCarriers,openAdd:openAddForm,openEdit:openEditForm,openDetail:openCarrierDetail};
  setLoading('正在加载载具…');Promise.allSettled([loadCarrierTypes(),loadLocations()]).then(loadCarriers);
})();
