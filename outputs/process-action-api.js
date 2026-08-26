(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const apiBaseUrl=typeof WORKFLOW_API_BASE_URL==='string'
    ?WORKFLOW_API_BASE_URL
    :(location.protocol==='file:'?DIRECT_API_BASE_URL:'');
  const endpoint=(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+'/api/actions';
  const palette=document.querySelector('.palette');
  const paletteSubtitle=palette?.querySelector(':scope>p');
  if(!palette||!paletteSubtitle)return;
  const originalSections=[...palette.querySelectorAll('.palette-section')];
  originalSections.slice(1).forEach(section=>{section.style.pointerEvents='none';section.style.opacity='.55'});
  paletteSubtitle.textContent='正在从动作服务加载…';


  const iconByActionKey={
    'MOVE':'↔',
    'ARM.PICK':'↑',
    'ARM.PICK_BATCH':'⇈',
    'ARM.PLACE':'↓',
    'ARM.PLACE_BATCH':'⇊',
    'ARM.HOME':'↻',
    'VISION.CAPTURE':'▣'
  };
  const legacyNameByActionKey={
    'MOVE':['移动'],
    'ARM.PICK':['单次取料'],
    'ARM.PICK_BATCH':['复合取料'],
    'ARM.PLACE':['单次放料'],
    'ARM.PLACE_BATCH':['复合放料'],
    'ARM.HOME':['协作臂归零'],
    'VISION.CAPTURE':['现场拍照']
  };

  async function parseApiResponse(response){
    const text=await response.text();
    if(!text)return{};
    try{return JSON.parse(text)}catch(error){return{message:text}}
  }

  function actionMetadata(action){
    return {
      actionKey:action.actionKey,
      actionId:action.id,
      actionRevision:action.revision,
      actionStatus:action.status,
      downstreamActionType:action.definition?.downstreamActionType||action.actionKey
    };
  }

  function createActionCard(action){
    const isActive=action.status==='ACTIVE',metadata=actionMetadata(action);
    const card=document.createElement('button');
    card.type='button';card.className='palette-card action-card'+(isActive?'':' action-draft');card.draggable=isActive;card.disabled=!isActive;
    card.title=(action.definition?.description||action.definition?.displayName||action.actionKey)+' · '+action.status+' · revision '+action.revision;
    const icon=document.createElement('span');icon.className='palette-icon';icon.textContent=iconByActionKey[action.actionKey]||'◇';
    const label=document.createElement('span');label.className='action-label';
    const name=document.createElement('span');name.textContent=action.definition?.displayName||action.actionKey;
    const key=document.createElement('small');key.textContent=action.actionKey;label.append(name,key);card.append(icon,label);
    if(isActive){
      let dragged=false;
      card.addEventListener('click',()=>{if(dragged)return;addNodeV2(name.textContent,'AGV 节点',icon.textContent,200+editorNodesV2.length%3*210,470,metadata)});
      card.addEventListener('dragstart',event=>{dragged=true;event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData('text/plain',JSON.stringify({name:name.textContent,type:'AGV 节点',icon:icon.textContent,...metadata}))});
      card.addEventListener('dragend',()=>setTimeout(()=>dragged=false,0));
    }
    return card;
  }

  function appendActionSection(label,actions){
    const section=document.createElement('div');section.className='palette-section';
    const heading=document.createElement('div');heading.className='palette-label';heading.textContent=label;
    const grid=document.createElement('div');grid.className='palette-grid';actions.forEach(action=>grid.appendChild(createActionCard(action)));
    section.append(heading,grid);palette.appendChild(section);
  }

  function syncCanvasActionMetadata(actions){
    const actionByKey=new Map(actions.map(action=>[action.actionKey,action]));
    editorNodesV2.forEach(node=>{
      let action=node.actionKey?actionByKey.get(node.actionKey):null;
      if(!action){
        action=actions.find(candidate=>(legacyNameByActionKey[candidate.actionKey]||[]).includes(node.name));
      }
      if(!action)return;
      const oldNames=legacyNameByActionKey[action.actionKey]||[];
      if(oldNames.includes(node.name))node.name=action.definition?.displayName||node.name;
      Object.assign(node,actionMetadata(action));
    });
    renderCanvasV2();
  }

  async function loadActions(){
    try{
      const response=await fetch(endpoint,{headers:{Accept:'application/json'}});
      const result=await parseApiResponse(response);
      if(!response.ok)throw new Error(result.message||('HTTP '+response.status));
      if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
      const actions=Array.isArray(result.data)?result.data:[];
      const active=actions.filter(action=>action.status==='ACTIVE'),draft=actions.filter(action=>action.status!=='ACTIVE');
      originalSections.slice(1).forEach(section=>section.remove());
      appendActionSection('可用动作（'+active.length+'）',active);
      if(draft.length)appendActionSection('草稿动作（'+draft.length+' · 不可使用）',draft);
      paletteSubtitle.textContent='已同步动作服务 · '+active.length+' 个可用 / '+draft.length+' 个草稿';
      syncCanvasActionMetadata(actions);
      window.__actionCatalogApi={endpoint,actions,activeCount:active.length,draftCount:draft.length,reload:loadActions,sync(){syncCanvasActionMetadata(actions)}};
    }catch(error){
      console.error('加载动作清单失败',error);
      originalSections.slice(1).forEach(section=>{section.style.pointerEvents='';section.style.opacity=''});
      paletteSubtitle.textContent='动作服务加载失败，已保留本地清单';
      showToast('动作清单加载失败：'+error.message);
    }
  }

  window.__actionCatalogApi={endpoint,actions:[],activeCount:0,draftCount:0,reload:loadActions,sync(){}};
  loadActions();
})();
