(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const apiBaseUrl=typeof window.LOCATION_TYPE_API_BASE_URL==='string'
    ?window.LOCATION_TYPE_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+'/locationTypes';
  const body=document.getElementById('typeBody');
  const form=document.getElementById('typeForm');
  const addButton=document.getElementById('addType');
  const formTitle=document.getElementById('formTitle');
  const table=document.querySelector('table[aria-label="库位类型"]');
  if(!body||!form||!addButton||!table)return;

  let locationTypes=[];
  let selectedId=null;
  let editingId=null;
  let editingStatus=1;
  let listController=null;
  let saving=false;
  const deletingIds=new Set();


  table.querySelector('thead tr').innerHTML='<th>类型编码</th><th>名称</th><th>容量</th><th>兼容载具类型</th><th>状态判定来源</th><th>隔离/互斥规则</th><th>备注</th><th>更新时间</th><th>操作</th>';
  table.style.minWidth='1160px';

  const filter=document.createElement('div');
  filter.className='location-type-filter agv-filter-bar';
  filter.innerHTML='<label class="agv-filter-field"><span>查询类型</span><input id="locationTypeCodeFilter" placeholder="类型编码/名称"></label><div class="agv-filter-actions"><button type="button" id="locationTypeReset"><img class="filter-action-icon" src="assets/list-icons/refresh.svg" alt="">重置</button><button class="primary" type="button" id="locationTypeQuery"><img class="filter-action-icon" src="assets/list-icons/search.svg" alt="">搜索</button></div>';
  document.querySelector('.table-wrap').before(filter);
  const codeFilter=document.getElementById('locationTypeCodeFilter');

  form.querySelector('.form-grid').innerHTML='<label class="form-field"><span>类型编码 *</span><input id="formCode" required maxlength="64"></label><label class="form-field"><span>名称 *</span><input id="formName" required maxlength="100"></label><label class="form-field"><span>最大库位容量</span><input id="formCapacity" type="number" min="1" step="1" value="1"></label><label class="form-field wide"><span>兼容载具类型</span><input id="formCompatibleCarrierTypes" placeholder="多个类型编码用逗号分隔"></label><label class="form-field"><span>状态判定来源</span><input id="formStatusSource" placeholder="例如：PLC+扫码"></label><label class="form-field"><span>隔离/互斥规则</span><input id="formMutexRule"></label><label class="form-field wide"><span>备注</span><textarea id="formRemark" maxlength="500"></textarea></label>';
  const submitButton=form.querySelector('[type="submit"]');

  function setTextCell(row,value){
    const cell=document.createElement('td');
    cell.textContent=value===null||value===undefined||value===''?'-':String(value);
    row.appendChild(cell);
  }

  function setEmpty(message){
    body.innerHTML='';
    const row=document.createElement('tr'),cell=document.createElement('td');
    cell.colSpan=9;cell.className='location-type-empty';cell.textContent=message;row.appendChild(cell);body.appendChild(row);
  }
  function setLoading(message){body.innerHTML='';const row=document.createElement('tr'),cell=document.createElement('td'),indicator=document.createElement('div');cell.colSpan=9;cell.className='location-type-empty api-loading-cell';indicator.className='api-loading';indicator.textContent=message;cell.appendChild(indicator);row.appendChild(cell);body.appendChild(row)}

  function renderRows(){
    body.innerHTML='';
    if(!locationTypes.length){setEmpty('暂无库位类型数据');return}
    if(!locationTypes.some(item=>String(item.id)===String(selectedId)))selectedId=locationTypes[0].id;
    locationTypes.forEach(item=>{
      const row=document.createElement('tr');row.dataset.id=String(item.id);
      if(String(item.id)===String(selectedId))row.classList.add('selected');
      setTextCell(row,item.typeCode);setTextCell(row,item.typeName);setTextCell(row,item.capacity);
      setTextCell(row,item.compatibleCarrierTypes);setTextCell(row,item.statusSource);setTextCell(row,item.mutexRule);
      setTextCell(row,item.remark);setTextCell(row,item.updateTime||item.createTime);
      const operationCell=document.createElement('td'),actions=document.createElement('div');actions.className='location-type-actions';
      const rowEdit=document.createElement('button');rowEdit.type='button';rowEdit.className='location-type-row-btn';rowEdit.textContent='编辑';
      const rowDelete=document.createElement('button');rowDelete.type='button';rowDelete.className='location-type-row-btn delete';rowDelete.textContent=deletingIds.has(String(item.id))?'删除中…':'删除';rowDelete.disabled=deletingIds.has(String(item.id));
      rowEdit.addEventListener('click',event=>{event.stopPropagation();selectedId=item.id;renderRows();openEditForm(item.id)});
      rowDelete.addEventListener('click',event=>{event.stopPropagation();deleteLocationType(item)});
      actions.append(rowEdit,rowDelete);operationCell.appendChild(actions);row.appendChild(operationCell);
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

  async function loadLocationTypes(){
    listController?.abort();listController=new AbortController();setLoading('正在加载库位类型…');
    const params=new URLSearchParams();
    if(codeFilter.value.trim())params.set('typeCode',codeFilter.value.trim());
    try{
      const query=params.toString();
      const response=await fetch(endpoint+(query?'?'+query:''),{headers:{Accept:'application/json'},signal:listController.signal});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      locationTypes=Array.isArray(result.data)?result.data:[];renderRows();window.__locationTypeApi.items=locationTypes;
    }catch(error){
      if(error.name==='AbortError')return;
      console.error('加载库位类型失败',error);locationTypes=[];setEmpty('库位类型加载失败：'+error.message);showToast('库位类型加载失败：'+error.message);
    }
  }

  function fillForm(item){
    editingStatus=Number(item.status)===0?0:1;
    document.getElementById('formCode').value=item.typeCode||'';
    document.getElementById('formName').value=item.typeName||'';
    document.getElementById('formCapacity').value=item.capacity??1;
    document.getElementById('formCompatibleCarrierTypes').value=item.compatibleCarrierTypes||'';
    document.getElementById('formStatusSource').value=item.statusSource||'';
    document.getElementById('formMutexRule').value=item.mutexRule||'';
    document.getElementById('formRemark').value=item.remark||'';
  }

  function openAddForm(){
    editingId=null;formTitle.textContent='新增库位类型';fillForm({capacity:1,status:1});document.getElementById('formCode').disabled=false;openModal('typeFormModal');
  }

  async function openEditForm(id){
    if(id===null||id===undefined)return showToast('请先选择库位类型');
    try{
      const response=await fetch(endpoint+'/'+encodeURIComponent(id),{headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      const detail=result.data||result;editingId=detail.id??id;formTitle.textContent='编辑库位类型 · '+(detail.typeCode||id);fillForm(detail);document.getElementById('formCode').disabled=true;openModal('typeFormModal');
    }catch(error){console.error('加载库位类型详情失败',error);showToast('详情加载失败：'+error.message)}
  }

  function formPayload(){
    const capacityValue=document.getElementById('formCapacity').value.trim();
    return {
      typeCode:document.getElementById('formCode').value.trim(),
      typeName:document.getElementById('formName').value.trim(),
      capacity:capacityValue===''?null:Number(capacityValue),
      compatibleCarrierTypes:document.getElementById('formCompatibleCarrierTypes').value.trim(),
      statusSource:document.getElementById('formStatusSource').value.trim(),
      mutexRule:document.getElementById('formMutexRule').value.trim(),
      status:editingStatus,
      remark:document.getElementById('formRemark').value.trim()
    };
  }

  async function saveLocationType(){
    if(saving)return;
    const payload=formPayload();
    if(!payload.typeCode)return showToast('请填写类型编码');
    if(!payload.typeName)return showToast('请填写库位类型名称');
    if(payload.capacity!==null&&(!Number.isInteger(payload.capacity)||payload.capacity<1))return showToast('最大库位容量必须是大于 0 的整数');
    saving=true;submitButton.disabled=true;const originalText=submitButton.textContent;submitButton.textContent='保存中…';
    try{
      const response=await fetch(editingId===null?endpoint:endpoint+'/'+encodeURIComponent(editingId),{method:editingId===null?'POST':'PUT',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      closeModal('typeFormModal');showToast(editingId===null?'库位类型已新增':'库位类型已更新');
      const saved=result.data||{};selectedId=saved.id??editingId??selectedId;await loadLocationTypes();
    }catch(error){console.error('保存库位类型失败',error);showToast('保存失败：'+error.message)}
    finally{saving=false;submitButton.disabled=false;submitButton.textContent=originalText}
  }

  async function deleteLocationType(item){
    const id=String(item.id);if(deletingIds.has(id))return;
    if(!confirm('确认删除库位类型“'+(item.typeName||item.typeCode)+'”吗？'))return;
    deletingIds.add(id);renderRows();
    try{
      const response=await fetch(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      if(String(selectedId)===id)selectedId=null;showToast('库位类型已删除');await loadLocationTypes();
    }catch(error){console.error('删除库位类型失败',error);showToast('删除失败：'+error.message)}
    finally{deletingIds.delete(id);renderRows()}
  }

  addButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openAddForm()},true);
  form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();saveLocationType()},true);
  document.getElementById('locationTypeQuery').addEventListener('click',loadLocationTypes);
  document.getElementById('locationTypeReset').addEventListener('click',()=>{codeFilter.value='';loadLocationTypes()});
  codeFilter.addEventListener('keydown',event=>{if(event.key==='Enter')loadLocationTypes()});

  window.__locationTypeApi={endpoint,items:locationTypes,reload:loadLocationTypes,openAdd:openAddForm,openEdit:openEditForm};
  setLoading('正在加载库位类型…');loadLocationTypes();
})();
