(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const apiBaseUrl=typeof window.CARRIER_TYPE_API_BASE_URL==='string'
    ?window.CARRIER_TYPE_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+'/carrierTypes';
  const body=document.getElementById('typeBody');
  const form=document.getElementById('typeForm');
  const addButton=document.getElementById('addType');
  const formTitle=document.getElementById('formTitle');
  const listHeading=document.querySelector('.list-head h2');
  const table=document.querySelector('table[aria-label="载具类型"]');
  if(!body||!form||!addButton||!table)return;

  let carrierTypes=[];
  let selectedId=null;
  let editingId=null;
  let listController=null;
  let saving=false;
  const deletingIds=new Set();

  const statusMeta={
    DRAFT:{label:'草稿',className:'status-waiting'},
    PUBLISHED:{label:'已发布',className:'state-published'},
    DISABLED:{label:'已停用',className:'state-disabled'}
  };


  if(listHeading)listHeading.textContent='载具类型列表';
  table.querySelector('thead tr').innerHTML='<th>类型编码</th><th>名称</th><th>外形尺寸</th><th>最大载重</th><th>条码规则</th><th>状态</th><th>备注</th><th>更新时间</th><th>操作</th>';
  table.style.minWidth='1120px';

  const filter=document.createElement('div');
  filter.className='carrier-filter agv-filter-bar';
  filter.innerHTML='<label class="agv-filter-field"><span>查询类型</span><input id="carrierTypeCodeFilter" placeholder="类型编码/名称"></label><label class="agv-filter-field"><span>状态选择</span><select id="carrierTypeStatusFilter"><option value="">全部状态</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="DISABLED">已停用</option></select></label><div class="agv-filter-actions"><button type="button" id="carrierTypeReset"><img class="filter-action-icon" src="assets/list-icons/refresh.svg" alt="">重置</button><button class="primary" type="button" id="carrierTypeQuery"><img class="filter-action-icon" src="assets/list-icons/search.svg" alt="">搜索</button></div>';
  document.querySelector('.table-wrap').before(filter);
  const codeFilter=document.getElementById('carrierTypeCodeFilter');
  const statusFilter=document.getElementById('carrierTypeStatusFilter');

  form.querySelector('.form-grid').innerHTML='<label class="form-field"><span>类型编码 *</span><input id="formCode" required maxlength="64"></label><label class="form-field"><span>名称 *</span><input id="formName" required maxlength="100"></label><label class="form-field"><span>外形尺寸</span><input id="formDimension" placeholder="例如：320×220×45 mm"></label><label class="form-field"><span>最大载重（kg）</span><input id="formMaxWeight" type="number" min="0" step="0.001"></label><label class="form-field"><span>条码规则</span><input id="formBarcodeRule" placeholder="例如：BC-TRAY-******"></label><label class="form-field"><span>状态</span><select id="formStatus"><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="DISABLED">已停用</option></select></label><label class="form-field wide"><span>备注</span><textarea id="formRemark" maxlength="500"></textarea></label>';
  const submitButton=form.querySelector('[type="submit"]');

  function setTextCell(row,value){
    const cell=document.createElement('td');
    cell.textContent=value===null||value===undefined||value===''?'-':String(value);
    row.appendChild(cell);
  }

  function formatWeight(value){
    if(value===null||value===undefined||value==='')return'-';
    const number=Number(value);
    return(Number.isFinite(number)?number:value)+' kg';
  }

  function setEmpty(message){
    body.innerHTML='';
    const row=document.createElement('tr'),cell=document.createElement('td');
    cell.colSpan=9;cell.className='carrier-empty';cell.textContent=message;row.appendChild(cell);body.appendChild(row);
  }
  function setLoading(message){body.innerHTML='';const row=document.createElement('tr'),cell=document.createElement('td'),indicator=document.createElement('div');cell.colSpan=9;cell.className='carrier-empty api-loading-cell';indicator.className='api-loading';indicator.textContent=message;cell.appendChild(indicator);row.appendChild(cell);body.appendChild(row)}

  function renderRows(){
    body.innerHTML='';
    if(!carrierTypes.length){setEmpty('暂无载具类型数据');return}
    if(!carrierTypes.some(item=>String(item.id)===String(selectedId)))selectedId=carrierTypes[0].id;
    carrierTypes.forEach(item=>{
      const row=document.createElement('tr');
      row.dataset.id=String(item.id);
      if(String(item.id)===String(selectedId))row.classList.add('selected');
      setTextCell(row,item.typeCode);
      setTextCell(row,item.typeName);
      setTextCell(row,item.dimension);
      setTextCell(row,formatWeight(item.maxWeight));
      setTextCell(row,item.barcodeRule);
      const statusCell=document.createElement('td'),status=document.createElement('span'),meta=statusMeta[item.status]||{label:item.status||'-',className:'state-disabled'};
      status.className='status-tag '+meta.className;status.textContent=meta.label;statusCell.appendChild(status);row.appendChild(statusCell);
      setTextCell(row,item.remark);
      setTextCell(row,item.updateTime||item.createTime);
      const operationCell=document.createElement('td'),actions=document.createElement('div');actions.className='carrier-actions';
      const rowEdit=document.createElement('button');rowEdit.type='button';rowEdit.className='carrier-row-btn';rowEdit.textContent='编辑';
      const rowDelete=document.createElement('button');rowDelete.type='button';rowDelete.className='carrier-row-btn delete';rowDelete.textContent=deletingIds.has(String(item.id))?'删除中…':'删除';rowDelete.disabled=deletingIds.has(String(item.id));
      rowEdit.addEventListener('click',event=>{event.stopPropagation();selectedId=item.id;renderRows();openEditForm(item.id)});
      rowDelete.addEventListener('click',event=>{event.stopPropagation();deleteCarrierType(item)});
      actions.append(rowEdit,rowDelete);operationCell.appendChild(actions);row.appendChild(operationCell);
      row.addEventListener('click',()=>{selectedId=item.id;renderRows()});
      body.appendChild(row);
    });
  }

  async function parseApiResponse(response){
    const text=await response.text();
    if(!text)return{};
    try{return JSON.parse(text)}catch(error){return{message:text}}
  }

  function assertApiSuccess(response,result){
    if(!response.ok)throw new Error(result.message||result.error||('HTTP '+response.status));
    if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
  }

  async function loadCarrierTypes(){
    listController?.abort();
    listController=new AbortController();
    setLoading('正在加载载具类型…');
    const params=new URLSearchParams();
    if(codeFilter.value.trim())params.set('typeCode',codeFilter.value.trim());
    if(statusFilter.value)params.set('status',statusFilter.value);
    try{
      const response=await fetch(endpoint+(params.size?'?'+params.toString():''),{headers:{Accept:'application/json'},signal:listController.signal});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      carrierTypes=Array.isArray(result.data)?result.data:[];
      renderRows();
      window.__carrierTypeApi.items=carrierTypes;
    }catch(error){
      if(error.name==='AbortError')return;
      console.error('加载载具类型失败',error);carrierTypes=[];setEmpty('载具类型加载失败：'+error.message);showToast('载具类型加载失败：'+error.message);
    }
  }

  function fillForm(item){
    document.getElementById('formCode').value=item.typeCode||'';
    document.getElementById('formName').value=item.typeName||'';
    document.getElementById('formDimension').value=item.dimension||'';
    document.getElementById('formMaxWeight').value=item.maxWeight??'';
    document.getElementById('formBarcodeRule').value=item.barcodeRule||'';
    document.getElementById('formStatus').value=item.status||'DRAFT';
    document.getElementById('formRemark').value=item.remark||'';
  }

  function openAddForm(){
    editingId=null;formTitle.textContent='新增载具类型';fillForm({status:'DRAFT'});document.getElementById('formCode').disabled=false;openModal('typeFormModal');
  }

  async function openEditForm(id){
    if(id===null||id===undefined)return showToast('请先选择载具类型');
    try{
      const response=await fetch(endpoint+'/'+encodeURIComponent(id),{headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      const detail=result.data||result;
      editingId=detail.id??id;formTitle.textContent='编辑载具类型 · '+(detail.typeCode||id);fillForm(detail);document.getElementById('formCode').disabled=true;openModal('typeFormModal');
    }catch(error){console.error('加载载具类型详情失败',error);showToast('详情加载失败：'+error.message)}
  }

  function formPayload(){
    const maxWeightValue=document.getElementById('formMaxWeight').value.trim();
    return {
      typeCode:document.getElementById('formCode').value.trim(),
      typeName:document.getElementById('formName').value.trim(),
      dimension:document.getElementById('formDimension').value.trim(),
      maxWeight:maxWeightValue===''?null:Number(maxWeightValue),
      barcodeRule:document.getElementById('formBarcodeRule').value.trim(),
      status:document.getElementById('formStatus').value,
      remark:document.getElementById('formRemark').value.trim()
    };
  }

  async function saveCarrierType(){
    if(saving)return;
    const payload=formPayload();
    if(!payload.typeCode)return showToast('请填写类型编码');
    if(!payload.typeName)return showToast('请填写载具类型名称');
    if(payload.maxWeight!==null&&(!Number.isFinite(payload.maxWeight)||payload.maxWeight<0))return showToast('最大载重必须是非负数字');
    saving=true;submitButton.disabled=true;const originalText=submitButton.textContent;submitButton.textContent='保存中…';
    try{
      const response=await fetch(editingId===null?endpoint:endpoint+'/'+encodeURIComponent(editingId),{method:editingId===null?'POST':'PUT',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      closeModal('typeFormModal');showToast(editingId===null?'载具类型已新增':'载具类型已更新');
      const saved=result.data||{};selectedId=saved.id??editingId??selectedId;await loadCarrierTypes();
    }catch(error){console.error('保存载具类型失败',error);showToast('保存失败：'+error.message)}
    finally{saving=false;submitButton.disabled=false;submitButton.textContent=originalText}
  }

  async function deleteCarrierType(item){
    const id=String(item.id);
    if(deletingIds.has(id))return;
    if(!confirm('确认删除载具类型“'+(item.typeName||item.typeCode)+'”吗？'))return;
    deletingIds.add(id);renderRows();
    try{
      const response=await fetch(endpoint+'/'+encodeURIComponent(id),{method:'DELETE',headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);assertApiSuccess(response,result);
      if(String(selectedId)===id)selectedId=null;showToast('载具类型已删除');await loadCarrierTypes();
    }catch(error){console.error('删除载具类型失败',error);showToast('删除失败：'+error.message)}
    finally{deletingIds.delete(id);renderRows()}
  }

  addButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openAddForm()},true);
  form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();saveCarrierType()},true);
  document.getElementById('carrierTypeQuery').addEventListener('click',loadCarrierTypes);
  document.getElementById('carrierTypeReset').addEventListener('click',()=>{codeFilter.value='';statusFilter.value='';loadCarrierTypes()});
  codeFilter.addEventListener('keydown',event=>{if(event.key==='Enter')loadCarrierTypes()});
  statusFilter.addEventListener('change',loadCarrierTypes);

  window.__carrierTypeApi={endpoint,items:carrierTypes,reload:loadCarrierTypes,openAdd:openAddForm,openEdit:openEditForm};
  setLoading('正在加载载具类型…');loadCarrierTypes();
})();
