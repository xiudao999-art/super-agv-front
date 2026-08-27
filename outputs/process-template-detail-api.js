(function(){
  'use strict';

  const templateId=new URLSearchParams(location.search).get('id')?.trim();
  if(!templateId)return;

  const endpoint=WORKFLOW_TEMPLATE_ENDPOINT+'/'+encodeURIComponent(templateId);
  const editorTitle=document.querySelector('.editor-meta-head h2');
  const originalSaveLabel=saveTemplateButtonV2?.textContent||'保存模板';
  let detailLoaded=false;

  function parseApiResponse(response){
    return response.text().then(text=>{
      if(!text)return{};
      try{return JSON.parse(text)}catch(error){return{message:text}}
    });
  }

  function parseEditorData(value){
    if(!value)return{};
    if(typeof value==='object')return value;
    if(typeof value!=='string')return{};
    try{return JSON.parse(value)}catch(error){throw new Error('模板画布数据格式错误')}
  }

  function finiteNumber(value,fallback){
    const number=Number(value);
    return Number.isFinite(number)?number:fallback;
  }

  function defaultPosition(index){
    const preset=[
      {x:40,y:135},{x:310,y:125},{x:580,y:125},{x:580,y:345},
      {x:310,y:345},{x:40,y:345},{x:40,y:555},{x:310,y:555},{x:580,y:555}
    ];
    return preset[index]||{x:40+(index%3)*270,y:135+Math.floor(index/3)*210};
  }

  function iconForNode(name,tagName,actionKey){
    if(tagName==='startEvent'||name==='开始')return'start';
    if(tagName==='endEvent'||name==='结束')return'end';
    const value=String(actionKey||name||'');
    if(value.includes('PICK')||value.includes('取料')||value.includes('抓取'))return value.includes('BATCH')||value.includes('复合')?'multi-pick':'pick';
    if(value.includes('PLACE')||value.includes('放料')||value.includes('放置'))return value.includes('BATCH')||value.includes('复合')?'multi-place':'place';
    if(value.includes('VISION')||value.includes('拍照')||value.includes('视觉'))return'camera';
    if(value.includes('MOVE')||value.includes('移动'))return'move';
    if(value.includes('HOME')||value.includes('归零'))return'reset';
    if(tagName==='userTask'||tagName==='subProcess')return'action';
    return'action';
  }

  function normalizeStoredNodes(rawNodes,nodeProperties){
    const usedIds=new Set();
    return rawNodes.map((raw,index)=>{
      let id=finiteNumber(raw.id,index+1);
      while(usedIds.has(id))id+=1;
      usedIds.add(id);
      const position=defaultPosition(index);
      const bpmnNodeId=raw.bpmnNodeId||String(raw.id??'');
      const properties=nodeProperties?.[bpmnNodeId]||{};
      const name=String(raw.name||properties.displayName||('节点 '+id));
      return {
        ...raw,
        ...properties,
        id,
        name,
        type:String(raw.type||properties.nodeType||(name==='开始'||name==='结束'?'通用节点':'AGV 节点')),
        icon:String(raw.icon||properties.icon||iconForNode(name,'',raw.actionKey||properties.actionKey)),
        x:finiteNumber(raw.x??properties.position?.x,position.x),
        y:finiteNumber(raw.y??properties.position?.y,position.y),
        bpmnNodeId,
        actionKey:raw.actionKey||properties.actionKey,
        actionId:raw.actionId||properties.actionId,
        actionRevision:raw.actionRevision??properties.actionRevision,
        actionStatus:raw.actionStatus||properties.actionStatus,
        downstreamActionType:raw.downstreamActionType||properties.actionType
      };
    });
  }

  function normalizeStoredConnections(rawConnections,nodeIds){
    const usedIds=new Set();
    return rawConnections.map((raw,index)=>{
      let id=finiteNumber(raw.id,index+1);
      while(usedIds.has(id))id+=1;
      usedIds.add(id);
      return {...raw,id,from:finiteNumber(raw.from,NaN),to:finiteNumber(raw.to,NaN),fromPort:raw.fromPort==='left'||raw.fromPort==='right'?raw.fromPort:'right',toPort:raw.toPort==='left'||raw.toPort==='right'?raw.toPort:'left'};
    }).filter(connection=>nodeIds.has(connection.from)&&nodeIds.has(connection.to));
  }

  function parseBpmn(bpmnXml,nodeProperties){
    if(!bpmnXml)return{nodes:[],connections:[],subflows:{},subflowConnections:{}};
    const xml=new DOMParser().parseFromString(bpmnXml,'application/xml');
    const parserError=xml.querySelector('parsererror');
    if(parserError)throw new Error('模板 BPMN XML 无法解析');
    const process=[...xml.getElementsByTagNameNS('*','process')][0];
    if(!process)return{nodes:[],connections:[],subflows:{},subflowConnections:{}};
    const nodeTags=new Set(['startEvent','endEvent','receiveTask','serviceTask','userTask','manualTask','task','subProcess','callActivity']);
    const nodeElements=[...process.children].filter(element=>nodeTags.has(element.localName));
    const nodes=nodeElements.map((element,index)=>{
      const id=index+1,bpmnNodeId=element.getAttribute('id')||('node_'+id);
      const properties=nodeProperties?.[bpmnNodeId]||{};
      const name=element.getAttribute('name')||(element.localName==='startEvent'?'开始':element.localName==='endEvent'?'结束':bpmnNodeId);
      const position=defaultPosition(index);
      return {
        id,
        bpmnNodeId,
        name,
        type:properties.nodeType||(element.localName==='startEvent'||element.localName==='endEvent'?'通用节点':'AGV 节点'),
        icon:properties.icon||iconForNode(name,element.localName,properties.actionKey||properties.actionType),
        x:finiteNumber(properties.position?.x,position.x),
        y:finiteNumber(properties.position?.y,position.y),
        actionKey:properties.actionKey,
        actionId:properties.actionId,
        actionRevision:properties.actionRevision,
        actionStatus:properties.actionStatus,
        downstreamActionType:properties.actionType
      };
    });
    const idByBpmnNode=new Map(nodes.map(node=>[node.bpmnNodeId,node.id]));
    const connections=[...process.children]
      .filter(element=>element.localName==='sequenceFlow')
      .map((element,index)=>({
        id:index+1,
        from:idByBpmnNode.get(element.getAttribute('sourceRef')),
        to:idByBpmnNode.get(element.getAttribute('targetRef')),
        fromPort:'right',
        toPort:'left',
        sourceRef:element.getAttribute('sourceRef'),
        targetRef:element.getAttribute('targetRef')
      }))
      .filter(connection=>connection.from!==undefined&&connection.to!==undefined);
    const subflows={},subflowConnections={};
    nodeElements.filter(element=>element.localName==='subProcess').forEach(element=>{
      const parentKey=element.getAttribute('id');
      if(!parentKey)return;
      const children=[...element.children]
        .filter(child=>nodeTags.has(child.localName)&&child.localName!=='startEvent'&&child.localName!=='endEvent')
        .map((child,index)=>{
          const childKey=child.getAttribute('id')||('C'+(index+1));
          const properties=nodeProperties?.[childKey]||{};
          const name=child.getAttribute('name')||childKey;
          return {
            id:childKey,
            name,
            icon:properties.icon||iconForNode(name,child.localName,properties.actionKey||properties.actionType),
            x:30+(index%3)*210,
            y:35+Math.floor(index/3)*95,
            actionType:properties.actionType
          };
        });
      if(children.length){
        subflows[parentKey]=children;
        const childIds=new Set(children.map(child=>child.id));
        subflowConnections[parentKey]=[...element.children]
          .filter(child=>child.localName==='sequenceFlow')
          .map((flow,index)=>({id:index+1,from:flow.getAttribute('sourceRef'),to:flow.getAttribute('targetRef'),fromPort:'right',toPort:'left'}))
          .filter(connection=>childIds.has(connection.from)&&childIds.has(connection.to));
      }
    });
    return{nodes,connections,subflows,subflowConnections};
  }

  function restoreSubflows(rawSubflows,nodes){
    subflowDataV2.clear();
    const nodeByBpmnId=new Map(nodes.map(node=>[node.bpmnNodeId,node.id]));
    let largestSubNodeId=0;
    Object.entries(rawSubflows||{}).forEach(([parentKey,children])=>{
      if(!Array.isArray(children))return;
      const numericParentId=Number(parentKey);
      const parentId=nodeByBpmnId.get(parentKey)||(Number.isFinite(numericParentId)&&nodes.some(node=>node.id===numericParentId)?numericParentId:null);
      if(parentId===null||parentId===undefined)return;
      const normalizedChildren=children.map((child,index)=>{
        const match=String(child.id||'').match(/(\d+)$/);
        if(match)largestSubNodeId=Math.max(largestSubNodeId,Number(match[1]));
        return {
          ...child,
          id:String(child.id||('C'+(largestSubNodeId+index+1))),
          name:String(child.name||'未命名子节点'),
          icon:String(child.icon||iconForNode(child.name||'','',child.actionKey||child.actionType)),
          x:finiteNumber(child.x,30+(index%3)*210),
          y:finiteNumber(child.y,35+Math.floor(index/3)*95)
        };
      });
      subflowDataV2.set(parentId,normalizedChildren);
    });
    nextSubNodeIdV2=Math.max(1,largestSubNodeId+1);
  }

  function restoreSubflowConnections(rawConnections,nodes){
    subflowConnectionsV2.clear();
    const nodeByBpmnId=new Map(nodes.map(node=>[node.bpmnNodeId,node.id]));
    let largestConnectionId=0;
    Object.entries(rawConnections||{}).forEach(([parentKey,connections])=>{
      if(!Array.isArray(connections))return;
      const numericParentId=Number(parentKey);
      const parentId=nodeByBpmnId.get(parentKey)||(Number.isFinite(numericParentId)&&nodes.some(node=>node.id===numericParentId)?numericParentId:null);
      if(parentId===null||parentId===undefined)return;
      const childIds=new Set((subflowDataV2.get(parentId)||[]).map(child=>child.id));
      const normalized=connections.map((connection,index)=>{
        const id=finiteNumber(connection.id,index+1);
        largestConnectionId=Math.max(largestConnectionId,id);
        return {...connection,id,from:String(connection.from||''),to:String(connection.to||''),fromPort:connection.fromPort==='left'||connection.fromPort==='right'?connection.fromPort:'right',toPort:connection.toPort==='left'||connection.toPort==='right'?connection.toPort:'left'};
      }).filter(connection=>connection.from!==connection.to&&childIds.has(connection.from)&&childIds.has(connection.to));
      subflowConnectionsV2.set(parentId,normalized);
    });
    nextSubConnectionIdV2=Math.max(1,largestConnectionId+1);
  }

  function restoreTemplate(detail){
    const editorData=parseEditorData(detail.editorData);
    const nodeProperties=editorData.nodeProperties&&typeof editorData.nodeProperties==='object'?editorData.nodeProperties:{};
    let restored;
    if(Array.isArray(editorData.nodes)&&editorData.nodes.length){
      const nodes=normalizeStoredNodes(editorData.nodes,nodeProperties);
      restored={nodes,connections:normalizeStoredConnections(Array.isArray(editorData.connections)?editorData.connections:[],new Set(nodes.map(node=>node.id)))};
    }else{
      restored=parseBpmn(detail.bpmnXml,nodeProperties);
    }
    if(!restored.nodes.length)throw new Error('详情中没有可回显的流程节点');

    editorNodesV2=restored.nodes;
    editorConnectionsV2=restored.connections;
    const storedSubflows=editorData.subflows&&Object.keys(editorData.subflows).length?editorData.subflows:restored.subflows;
    restoreSubflows(storedSubflows,editorNodesV2);
    const storedSubflowConnections=editorData.subflowConnections&&typeof editorData.subflowConnections==='object'?editorData.subflowConnections:(restored.subflowConnections||Object.fromEntries(Object.entries(storedSubflows||{}).map(([parentKey,children])=>[parentKey,Array.isArray(children)?children.slice(0,-1).map((child,index)=>({id:index+1,from:String(child.id),to:String(children[index+1].id),fromPort:'right',toPort:'left'})):[]])));
    restoreSubflowConnections(storedSubflowConnections,editorNodesV2);
    nextNodeIdV2=Math.max(0,...editorNodesV2.map(node=>node.id))+1;
    nextConnectionIdV2=Math.max(0,...editorConnectionsV2.map(connection=>connection.id))+1;
    selectedNodeIdV2=editorNodesV2[0]?.id??null;
    selectedConnectionIdV2=null;
    subflowParentIdV2=null;
    selectedSubNodeIdV2=null;
    selectedSubConnectionIdV2=null;
    subSelectionActiveV2=false;

    if(templateNumberInputV2)templateNumberInputV2.value=detail.templateNumber||'';
    if(templateNameInputV2)templateNameInputV2.value=detail.templateName||'';
    if(applicableObjectInputV2&&detail.applicableObject){
      if(![...applicableObjectInputV2.options].some(option=>option.value===detail.applicableObject)){
        applicableObjectInputV2.add(new Option(detail.applicableObject,detail.applicableObject));
      }
      applicableObjectInputV2.value=detail.applicableObject;
    }
    if(Number.isFinite(Number(editorData.zoom)))applyZoomV2(Number(editorData.zoom));
    renderCanvasV2();
    window.__actionCatalogApi?.sync?.();
    window.__loadedWorkflowTemplate=detail;
  }

  async function loadTemplateDetail(){
    detailLoaded=false;
    templateSaveStatusV2.textContent='加载中';
    if(editorTitle)editorTitle.textContent='编辑模板 · '+templateId;
    if(saveTemplateButtonV2){saveTemplateButtonV2.disabled=true;saveTemplateButtonV2.textContent='加载中…'}
    const controller=new AbortController(),timeoutId=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(endpoint,{headers:{Accept:'application/json'},signal:controller.signal});
      const result=await parseApiResponse(response);
      if(!response.ok)throw new Error(result.message||result.error||('HTTP '+response.status));
      if(typeof result.code==='number'&&result.code!==0&&result.code!==200)throw new Error(result.message||('业务错误 '+result.code));
      const detail=result.data||result;
      restoreTemplate(detail);
      detailLoaded=true;
      if(editorTitle)editorTitle.textContent='编辑模板 · '+(detail.templateNumber||templateId);
      templateSaveStatusV2.textContent=detail.status==='ENABLED'||detail.deployedVersion?'已启用 · 修改后转草稿':'草稿';
      showToast('模板详情已加载 · '+(detail.templateNumber||templateId));
      return detail;
    }catch(error){
      detailLoaded=false;
      console.error('加载模板详情失败',error);
      templateSaveStatusV2.textContent='加载失败';
      showToast(error.name==='AbortError'?'加载详情超时，请检查 121.196.164.163':'加载详情失败：'+error.message);
      throw error;
    }finally{
      clearTimeout(timeoutId);
      if(saveTemplateButtonV2){saveTemplateButtonV2.disabled=!detailLoaded;saveTemplateButtonV2.textContent=detailLoaded?originalSaveLabel:'详情加载失败'}
    }
  }

  window.__workflowTemplateDetailApi={templateId,endpoint,get loaded(){return detailLoaded},reload:loadTemplateDetail};
  loadTemplateDetail().catch(()=>{});
})();
