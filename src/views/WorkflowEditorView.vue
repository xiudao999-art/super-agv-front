<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { getActions, getWorkflow, saveWorkflow } from '../api/agv'

const route = useRoute()
const editingId = Number(route.query.id) || null
const meta = reactive({ id:editingId, templateNumber:'TPL-WH-LABEL', templateName:'智能仓储-贴标模板', applicableObject:'贴标工作站', status:'新增' })
const fallbackPalette = [
  {name:'开始',type:'通用节点',icon:'start'},{name:'结束',type:'通用节点',icon:'end'},
  {name:'移动',type:'主节点',icon:'move',actionKey:'MOVE'},{name:'单次取料',type:'主节点',icon:'pick',actionKey:'ARM.PICK'},
  {name:'单次放料',type:'主节点',icon:'place',actionKey:'ARM.PLACE'},{name:'复合取料',type:'主节点',icon:'multi-pick',actionKey:'ARM.BATCH_PICK'},
  {name:'复合放料',type:'主节点',icon:'multi-place',actionKey:'ARM.BATCH_PLACE'},{name:'协作臂归零',type:'主节点',icon:'reset',actionKey:'ARM.HOME'},
  {name:'现场拍照',type:'主节点',icon:'camera',actionKey:'VISION.CAPTURE'},{name:'自动门',type:'其他节点',icon:'door',actionKey:'DOOR.OPEN'},
  {name:'手套箱',type:'其他节点',icon:'glovebox',actionKey:'GLOVEBOX.RUN'},{name:'贴标机台',type:'其他节点',icon:'labeler',actionKey:'LABEL.RUN'},
  {name:'后处理机台',type:'其他节点',icon:'post-process',actionKey:'POST.RUN'},
]
const palette = ref(structuredClone(fallbackPalette))
const nodes = ref([
  {id:1,name:'开始',type:'通用节点',icon:'start',x:40,y:135,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:2,name:'移动',type:'AGV 节点',icon:'move',actionKey:'MOVE',x:310,y:125,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:3,name:'单次取料',type:'AGV 节点',icon:'pick',actionKey:'ARM.PICK',x:580,y:125,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:4,name:'现场拍照',type:'AGV 节点',icon:'camera',actionKey:'VISION.CAPTURE',x:580,y:345,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:5,name:'移动',type:'AGV 节点',icon:'move',actionKey:'MOVE',x:310,y:345,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:6,name:'单次放料',type:'AGV 节点',icon:'place',actionKey:'ARM.PLACE',x:40,y:345,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
  {id:7,name:'结束',type:'通用节点',icon:'end',x:40,y:555,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'},
])
const connections = ref([
  {id:1,from:1,to:2,fromPort:'right',toPort:'left'},{id:2,from:2,to:3,fromPort:'right',toPort:'left'},
  {id:3,from:3,to:4,fromPort:'right',toPort:'left'},{id:4,from:4,to:5,fromPort:'right',toPort:'left'},
  {id:5,from:5,to:6,fromPort:'right',toPort:'left'},{id:6,from:6,to:7,fromPort:'right',toPort:'left'},
])
const subflows = reactive({})
const selectedNodeId = ref(1)
const selectedConnectionId = ref(null)
const pendingPort = ref(null)
const subflowParentId = ref(null)
const selectedSubNodeId = ref(null)
const zoom = ref(1)
const subZoom = ref(1)
const paletteCollapsed = ref(false)
const propertiesCollapsed = ref(false)
const saving = ref(false)
const loading = ref(Boolean(editingId))
const workspace = ref(null)
const canvas = ref(null)

const selectedNode = computed(() => nodes.value.find(node => node.id === selectedNodeId.value) || null)
const subflowOpen = computed(() => subflowParentId.value != null)
const subNodes = computed(() => subflows[subflowParentId.value] || [])
const selectedSubNode = computed(() => subNodes.value.find(node => node.id === selectedSubNodeId.value) || null)
const selectedEntry = computed(() => subflowOpen.value ? selectedSubNode.value : selectedNode.value)
const selectedConnection = computed(() => connections.value.find(item => item.id === selectedConnectionId.value) || null)
const selectedConnectionNames = computed(() => selectedConnection.value ? `${nodeById(selectedConnection.value.from)?.name || ''} → ${nodeById(selectedConnection.value.to)?.name || ''}` : '')
const subConnections = computed(() => subNodes.value.slice(0,-1).map((node,index) => ({ id:index+1,from:node.id,to:subNodes.value[index+1].id,fromPort:'right',toPort:'left' })))

const iconPaths = {
  start:'M3.3 10.1 20.2 4.2c.9-.3 1.7.6 1.3 1.4l-7.2 15.1c-.4.9-1.7.8-2-.1l-1.9-6.2-6.2-2c-1-.3-1-1.9-.1-2.3Z',
  end:'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 8v6m-6 2c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5-2.7 2.5-6 2.5S6 20.4 6 19Z',
  move:'M12 3v18M3 12h18M12 3 9 6m3-3 3 3m-3 15-3-3m3 3 3-3M3 12l3-3m-3 3 3 3m15-3-3-3m3 3-3 3',
  pick:'M12 18V6m0 0-4 4m4-4 4 4M4 20h16', place:'M12 6v12m0 0-4-4m4 4 4-4M4 4h16',
  'multi-pick':'M5 14 12 7l7 7M5 20l7-7 7 7','multi-place':'M5 4l7 7 7-7M5 10l7 7 7-7',
  reset:'M20 7v5h-5M19.2 12a7.5 7.5 0 1 1-2.1-5.2L20 9.6', camera:'M4 7h3l1.4-2h7.2L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 3a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z',
  door:'M5 3.5h12.5v17H5zM14 12h.01M17.5 5.5H20v15h-2.5', glovebox:'M4 5h16v14H4zM4 10h16M8 14h8',
  labeler:'M5 4h12v6H5zM4 10h16v8H4zM8 18v2h8v-2M8 7h6M8 13h8M8 16h5', 'post-process':'M4 3h16v18H4zM4 9h16M4 15h16M8 6h8M8 12h8M8 18h8',
  arm:'M4 21h6M6 18l5-8 6-5 2 2-6 6-3 7', gripper:'M12 3v7M7 6h10M7 6v5l3 3v6M17 6v5l-3 3v6M10 20h4', action:'M12 3l8 5v8l-8 5-8-5V8z',
}

const iconPath = (node) => iconPaths[node?.icon] || iconPaths.action
const nodeById = (id) => nodes.value.find(node => node.id === Number(id))
const nodeWidth = (node) => ['开始','结束'].includes(node?.name) ? 64 : 180
function linePath(connection,list=nodes.value) {
  const from=list.find(node=>String(node.id)===String(connection.from)),to=list.find(node=>String(node.id)===String(connection.to)); if(!from||!to)return''
  const width = node => list === nodes.value ? nodeWidth(node) : 160
  const start={x:from.x+(connection.fromPort==='right'?width(from):0),y:from.y+32},end={x:to.x+(connection.toPort==='right'?width(to):0),y:to.y+32}
  const lead=28, sx=start.x+(connection.fromPort==='right'?lead:-lead), tx=end.x+(connection.toPort==='right'?lead:-lead), mid=(sx+tx)/2
  return `M ${start.x} ${start.y} H ${sx} H ${mid} V ${end.y} H ${tx} H ${end.x}`
}
const occupied = (nodeId,port) => connections.value.some(item => (item.from===nodeId&&item.fromPort===port)||(item.to===nodeId&&item.toPort===port))

function dragPalette(event,item) { event.dataTransfer.setData('application/json',JSON.stringify({source:'palette',item})) }
function dragNode(event,node) { event.stopPropagation(); event.dataTransfer.setData('application/json',JSON.stringify({source:'node',id:node.id})) }
function dropNode(event) {
  event.preventDefault(); let data; try{data=JSON.parse(event.dataTransfer.getData('application/json'))}catch{return}
  const rect=canvas.value.getBoundingClientRect(),x=Math.max(0,(event.clientX-rect.left)/zoom.value-90),y=Math.max(0,(event.clientY-rect.top)/zoom.value-32)
  if(data.source==='node'){const node=nodeById(data.id);if(node){node.x=x;node.y=y}}else if(data.item)addNode(data.item,x,y)
}
function addNode(item,x=60+(nodes.value.length%3)*270,y=125+Math.floor(nodes.value.length/3)*210) {
  if(['开始','结束'].includes(item.name)&&nodes.value.some(node=>node.name===item.name))return ElMessage.warning(`同一个流程只能有一个${item.name}节点`)
  const id=Math.max(0,...nodes.value.map(node=>node.id))+1
  nodes.value.push({...item,id,type:item.type==='主节点'?'AGV 节点':item.type==='其他节点'?'设备节点':item.type,x,y,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'})
  selectedNodeId.value=id;selectedConnectionId.value=null
}
function selectNode(node){selectedNodeId.value=node.id;selectedConnectionId.value=null;pendingPort.value=null}
function deleteNode(node=selectedNode.value){if(!node)return;nodes.value=nodes.value.filter(item=>item.id!==node.id);connections.value=connections.value.filter(item=>item.from!==node.id&&item.to!==node.id);delete subflows[node.id];selectedNodeId.value=nodes.value[0]?.id||null}
function handlePort(event,node,port){event.stopPropagation();if(occupied(node.id,port))return ElMessage.warning('当前端点已有连线');if(!pendingPort.value){pendingPort.value={nodeId:node.id,port};selectedNodeId.value=node.id;return ElMessage.info('请选择另一个节点端点完成连线')}const from=pendingPort.value;if(from.nodeId===node.id){pendingPort.value=null;return ElMessage.warning('节点不能连接到自身')}connections.value.push({id:Math.max(0,...connections.value.map(item=>item.id))+1,from:from.nodeId,to:node.id,fromPort:from.port,toPort:port});pendingPort.value=null;ElMessage.success('连线已添加')}
function deleteConnection(){if(!selectedConnection.value)return;connections.value=connections.value.filter(item=>item.id!==selectedConnectionId.value);selectedConnectionId.value=null;ElMessage.success('选中连线已删除')}
function moveSelected(direction){const list=subflowOpen.value?subNodes.value:nodes.value,id=subflowOpen.value?selectedSubNodeId.value:selectedNodeId.value,index=list.findIndex(item=>item.id===id),target=index+direction;if(index<0||target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]]}

function openSubflow(node){subflowParentId.value=node.id;if(!subflows[node.id])subflows[node.id]=[];selectedSubNodeId.value=subflows[node.id][0]?.id||null}
function closeSubflow(){subflowParentId.value=null;selectedSubNodeId.value=null}
function addSubNode(item){const list=subNodes.value,id=`C${Math.max(0,...Object.values(subflows).flat().map(node=>Number(String(node.id).replace(/\D/g,''))||0))+1}`;list.push({...item,id,icon:item.icon||'action',type:'子节点',x:30+(list.length%3)*210,y:35+Math.floor(list.length/3)*95,parameterText:'参数待确认',failureStrategy:'按策略重试后挂起',completionBasis:'设备反馈 + 状态校验，待技术确认'});selectedSubNodeId.value=id}
function deleteSubNode(){const list=subNodes.value,index=list.findIndex(node=>node.id===selectedSubNodeId.value);if(index>=0)list.splice(index,1);selectedSubNodeId.value=list[0]?.id||null}

async function toggleFullscreen(){if(!document.fullscreenElement)await workspace.value?.requestFullscreen?.();else await document.exitFullscreen()}
const escapeXml=value=>String(value??'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[char])
function buildPayload(){
  const ids=new Map(nodes.value.map(node=>[node.id,['开始','结束'].includes(node.name)?`node_${node.id}`:String(node.actionKey||`node_${node.id}`).replace(/[^a-zA-Z0-9_.-]/g,'_')+'_'+node.id]))
  const elements=nodes.value.map(node=>node.name==='开始'?`<startEvent id="${ids.get(node.id)}" name="开始"/>`:node.name==='结束'?`<endEvent id="${ids.get(node.id)}" name="结束"/>`:`<receiveTask id="${ids.get(node.id)}" name="${escapeXml(node.name)}" flowable:failureStrategy="RETRY_THEN_SUSPEND"/>`).join('')
  const flows=connections.value.map((line,index)=>`<sequenceFlow id="flow_${index+1}" sourceRef="${ids.get(line.from)}" targetRef="${ids.get(line.to)}"/>`).join('')
  const editorNodes=nodes.value.map(node=>({...node,bpmnNodeId:ids.get(node.id),nodeType:node.type,position:{x:node.x,y:node.y},nodeCategory:['开始','结束'].includes(node.name)?'EVENT':'MAIN',actionType:node.actionKey||'CUSTOM',downstreamActionType:node.actionKey||'CUSTOM',executionParams:{raw:node.parameterText||''},failureStrategy:node.failureStrategy==='立即挂起'?'SUSPEND':node.failureStrategy==='跳过并记录'?'SKIP':'RETRY_THEN_SUSPEND'}))
  return {...(meta.id?{id:meta.id}:{}),templateName:meta.templateName.trim(),applicableObject:meta.applicableObject,bpmnXml:`<?xml version="1.0" encoding="UTF-8"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://kunling.com/workflow"><process id="workflowTemplate" name="${escapeXml(meta.templateName)}" isExecutable="true">${elements}${flows}</process></definitions>`,editorData:{zoom:zoom.value,nodes:editorNodes,connections:connections.value.map(line=>({...line,sourceRef:ids.get(line.from),targetRef:ids.get(line.to)})),nodeProperties:Object.fromEntries(editorNodes.map(node=>[node.bpmnNodeId,node])),subflows:structuredClone(subflows),subflowConnections:Object.fromEntries(Object.entries(subflows).map(([key,value])=>[key,value.slice(0,-1).map((node,index)=>({id:index+1,from:node.id,to:value[index+1].id,fromPort:'right',toPort:'left'}))]))}}
}
async function save(){if(!meta.templateName.trim()||!meta.templateNumber.trim())return ElMessage.warning('请填写模板编号和名称');if(nodes.value.filter(node=>node.name==='开始').length!==1||nodes.value.filter(node=>node.name==='结束').length!==1)return ElMessage.warning('主流程必须且只能包含一个开始节点和一个结束节点');saving.value=true;try{const result=await saveWorkflow(buildPayload());meta.id=result?.id||meta.id;meta.templateNumber=result?.templateNumber||meta.templateNumber;meta.status=result?.status==='ENABLED'?'已启用 · 修改后转草稿':'草稿';ElMessage.success('流程模板已保存')}catch(error){ElMessage.error(`保存失败：${error.message}`)}finally{saving.value=false}}

async function load(){
  try{
    const actionRows=await getActions()
    if(actionRows.length){palette.value=[fallbackPalette[0],fallbackPalette[1],...actionRows.filter(action=>action.status==='ACTIVE').map(action=>({name:action.definition?.displayName||action.actionKey,type:action.actionKey?.startsWith('ARM.')||action.actionKey==='MOVE'?'主节点':'其他节点',icon:action.actionKey==='MOVE'?'move':action.actionKey?.includes('PICK')?'pick':action.actionKey?.includes('PLACE')?'place':action.actionKey?.includes('VISION')?'camera':'action',actionId:action.id,actionKey:action.actionKey,actionRevision:action.revision,actionStatus:action.status}))]}
  }catch(error){ElMessage.warning(`动作清单加载失败，已保留本地清单：${error.message}`)}
  if(!editingId){loading.value=false;return}
  try{
    const detail=await getWorkflow(editingId);Object.assign(meta,{id:detail.id,templateNumber:detail.templateNumber||String(editingId),templateName:detail.templateName||'',applicableObject:detail.applicableObject||'贴标工作站',status:detail.status==='ENABLED'||detail.deployedVersion?'已启用 · 修改后转草稿':'草稿'})
    const data=typeof detail.editorData==='string'?JSON.parse(detail.editorData):detail.editorData||{}
    if(Array.isArray(data.nodes)&&data.nodes.length){nodes.value=data.nodes.map((node,index)=>({...node,id:Number(node.id)||index+1,x:node.x??node.position?.x??40+(index%3)*270,y:node.y??node.position?.y??125+Math.floor(index/3)*210,parameterText:node.parameterText||node.executionParams?.raw||'参数待确认',failureStrategy:node.failureStrategy==='SUSPEND'?'立即挂起':node.failureStrategy==='SKIP'?'跳过并记录':'按策略重试后挂起',completionBasis:node.completionBasis||'设备反馈 + 状态校验，待技术确认'}));connections.value=(data.connections||[]).map((line,index)=>({...line,id:Number(line.id)||index+1,from:Number(line.from),to:Number(line.to),fromPort:line.fromPort||'right',toPort:line.toPort||'left'}));Object.assign(subflows,data.subflows||{});zoom.value=Number(data.zoom)||1;selectedNodeId.value=nodes.value[0]?.id||null}
    ElMessage.success(`模板详情已加载 · ${meta.templateNumber}`)
  }catch(error){meta.status='加载失败';ElMessage.error(`加载详情失败：${error.message}`)}finally{loading.value=false}
}
onMounted(load)
</script>

<template>
  <div class="page-view workflow-editor-reference-page">
    <PageHeader class="page-head" title="流程模板" description="通过模板列表管理可复用的流程节点、参数和连线，业务流程只选择已经定义的模板"><div class="tools"><router-link class="tool-btn" to="/workflows/templates">‹ 返回模板列表</router-link><button class="head-btn" type="button" :disabled="saving||loading" @click="save">{{ saving?'保存中…':loading?'加载中…':'保存模板' }}</button></div></PageHeader>
    <div class="page-canvas editor-shell">
      <section class="page-panel editor-meta"><div class="editor-meta-head"><div><h2>{{ editingId ? `编辑模板 · ${meta.templateNumber}` : '新建模板' }}</h2><p>模板由一组有顺序的受控动作组成；每个动作的具体参数仍待技术确认</p></div><span class="status-tag" style="color:var(--blue);background:#f1f8fd;border-color:#cfe3f3">{{ meta.status }}</span></div><div class="editor-fields"><label class="editor-field"><span>模板编号</span><input v-model="meta.templateNumber"></label><label class="editor-field"><span>模板名称</span><input v-model="meta.templateName"></label><label class="editor-field"><span>适用对象</span><select v-model="meta.applicableObject"><option>贴标工作站</option><option>手套箱</option><option>后处理机台</option><option>复合机器人</option><option>检测工作站</option></select></label></div></section>
      <section class="page-panel editor-layout"><div class="editor-canvas-heading"><h2>Canvas 动作组合画布</h2><p>从左侧动作清单拖入节点；分类标题不能拖动。点击画布中的节点后，可在右侧设置名称、参数、顺序以及它要连接到的后续节点。</p></div>
        <div ref="workspace" :class="['editor-workspace',{'palette-collapsed':paletteCollapsed,'properties-collapsed':propertiesCollapsed,'subflow-mode':subflowOpen}]">
          <button class="panel-reopen panel-reopen-left" type="button" aria-label="展开动作清单" @click="paletteCollapsed=false">动作清单 <span>⌄</span></button><button class="panel-reopen panel-reopen-right" type="button" aria-label="展开节点属性" @click="propertiesCollapsed=false">节点属性 <span>⌄</span></button>
          <aside class="palette"><h2>动作清单 <button class="panel-collapse" type="button" aria-label="收起动作清单" @click="paletteCollapsed=true">⌃</button></h2><p>模板主节点和子节点选择自动切换</p>
            <div v-if="subflowOpen" class="subflow-palette-content"><section class="subflow-palette-section"><div class="palette-label">通用节点</div><div class="subflow-palette-grid"><button v-for="item in [{name:'开始',icon:'start'},{name:'结束',icon:'end'}]" :key="item.name" class="sub-palette-card child-palette-card" type="button" @click="addSubNode(item)"><span class="child-palette-icon"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(item)"/></svg></span><span>{{ item.name }}</span></button></div></section><section class="subflow-palette-section"><div class="palette-label">子节点</div><div class="subflow-palette-grid"><button v-for="item in [{name:'机械臂运动',icon:'arm'},{name:'夹抓',icon:'gripper'},{name:'视觉',icon:'camera'}]" :key="item.name" class="sub-palette-card child-palette-card" type="button" @click="addSubNode(item)"><span class="child-palette-icon"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(item)"/></svg></span><span>{{ item.name }}</span></button></div></section></div>
            <template v-else><section v-for="group in ['通用节点','主节点','其他节点']" :key="group" class="palette-section"><div class="palette-label">{{ group }}</div><div class="palette-grid"><button v-for="item in palette.filter(entry=>entry.type===group)" :key="`${item.name}-${item.actionKey||''}`" class="palette-card" type="button" draggable="true" :disabled="['开始','结束'].includes(item.name)&&nodes.some(node=>node.name===item.name)" @dragstart="dragPalette($event,item)" @click="addNode(item)"><span :class="['palette-icon',item.icon]"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(item)"/></svg></span><span>{{ item.name }}</span></button></div></section></template>
          </aside>
          <section class="canvas-column"><div ref="canvas" class="canvas-board" @dragover.prevent @drop="dropNode"><div class="canvas-stage" :style="{transform:`scale(${zoom})`}"><svg class="flow-lines" width="1000" height="742"><defs><marker id="editorArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#87919a"/></marker><marker id="editorArrowSelected" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1677d2"/></marker></defs><path v-for="line in connections" :key="line.id" :class="['flow-path',{selected:selectedConnectionId===line.id}]" :d="linePath(line)" :marker-end="selectedConnectionId===line.id?'url(#editorArrowSelected)':'url(#editorArrow)'" @click.stop="selectedConnectionId=line.id;selectedNodeId=null" /></svg>
              <button v-for="node in nodes" :key="node.id" :class="['flow-node',{start:node.name==='开始',end:node.name==='结束',selected:selectedNodeId===node.id,'connection-target':pendingPort&&pendingPort.nodeId!==node.id}]" :style="{left:`${node.x}px`,top:`${node.y}px`}" type="button" draggable="true" @dragstart="dragNode($event,node)" @click="selectNode(node)"><span class="flow-node-delete" role="button" aria-label="删除节点" title="删除节点" @click.stop="deleteNode(node)">×</span><span :class="['node-handle','handle-in',{occupied:occupied(node.id,'left'),'connection-target':pendingPort?.nodeId===node.id&&pendingPort?.port==='left'}]" title="左侧端点" @click="handlePort($event,node,'left')"/><template v-if="['开始','结束'].includes(node.name)"><span class="flow-node-icon"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(node)"/></svg></span></template><template v-else><span class="flow-node-copy"><strong>{{ node.id }} · {{ node.name }}</strong><small class="flow-node-meta"><button class="flow-node-subflow-entry" type="button" @click.stop="openSubflow(node)"><span v-if="subflows[node.id]?.length" class="flow-node-child-count">{{ subflows[node.id].length }} 个子节点</span><span v-else>配置子节点</span><b>›</b></button></small></span><span class="flow-node-icon"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(node)"/></svg></span></template><span :class="['node-handle','handle-out',{occupied:occupied(node.id,'right'),'connection-target':pendingPort?.nodeId===node.id&&pendingPort?.port==='right'}]" title="右侧端点" @click="handlePort($event,node,'right')"/></button>
            </div></div><div class="canvas-controls"><button class="canvas-control canvas-expand-control" type="button" title="放大画布" @click="toggleFullscreen">⛶<span>放大画布</span></button><button class="canvas-control" type="button" @click="zoom=Math.max(.6,zoom-.1)">−</button><strong style="min-width:45px;text-align:center;font-size:12px">{{ Math.round(zoom*100) }}%</strong><button class="canvas-control" type="button" @click="zoom=Math.min(1.5,zoom+.1)">＋</button></div>
            <section v-if="subflowOpen" class="subflow-panel"><header class="subflow-head"><button class="subflow-back" type="button" @click="closeSubflow">← <span>返回主节点：{{ subflowParentId }} · {{ nodeById(subflowParentId)?.name }}</span></button><button class="subflow-save" type="button" @click="closeSubflow">保存并返回</button><div class="subflow-meta"><h3>{{ subflowParentId }} · {{ nodeById(subflowParentId)?.name }} - 子节点流程</h3><p>子流程不设置开始和结束节点；节点按照连线顺序执行</p><span>{{ subNodes.length }} 个子节点</span></div></header><div class="subflow-workspace"><aside class="subflow-palette"><h4>子节点</h4><p>点击添加至右侧画布</p><button v-for="item in [{name:'机械臂运动',icon:'arm'},{name:'夹抓',icon:'gripper'},{name:'视觉',icon:'camera'}]" :key="item.name" class="sub-palette-card" type="button" @click="addSubNode(item)">{{ item.name }}</button></aside><div class="subflow-canvas"><div class="subflow-stage" :style="{transform:`scale(${subZoom})`}"><svg class="subflow-lines" width="780" height="295"><defs><marker id="subArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#5d92bd"/></marker></defs><path v-for="line in subConnections" :key="line.id" class="subflow-path" :d="linePath(line,subNodes)" marker-end="url(#subArrow)"/></svg><button v-for="node in subNodes" :key="node.id" :class="['subflow-node',{selected:selectedSubNodeId===node.id}]" :style="{left:`${node.x}px`,top:`${node.y}px`}" type="button" @click="selectedSubNodeId=node.id"><span class="node-handle handle-in"/><span><strong>{{ node.name }}</strong><small>{{ node.id }}</small></span><span class="subflow-node-icon"><svg class="flow-action-icon" viewBox="0 0 24 24"><path :d="iconPath(node)"/></svg></span><span class="node-handle handle-out"/></button><div v-if="!subNodes.length" class="subflow-empty">暂无子节点，请从左侧添加</div></div><p class="subflow-note">拖入子节点后自动按顺序连接；点击子节点后可在最右侧设置属性和后续顺序。</p></div></div><div class="subflow-controls"><button type="button" @click="toggleFullscreen">⛶</button><button type="button" @click="subZoom=Math.max(.6,subZoom-.1)">−</button><strong>{{ Math.round(subZoom*100) }}%</strong><button type="button" @click="subZoom=Math.min(1.5,subZoom+.1)">＋</button></div></section>
          </section>
          <aside class="properties"><h2>节点属性 <button class="panel-collapse" type="button" aria-label="收起节点属性" @click="propertiesCollapsed=true">⌃</button></h2><p>根据主节点或子节点选择自动切换</p><div v-if="selectedEntry" class="property-fields"><div class="property-field"><span>选择节点</span><div class="property-note">{{ subflowOpen?'当前子节点':'当前节点' }}：{{ selectedEntry.name }}</div></div><div v-if="!subflowOpen&&!['开始','结束'].includes(selectedEntry.name)" class="property-field subflow-entry-field"><span>子节点流程</span><button class="subflow-entry-button" type="button" @click="openSubflow(selectedEntry)">{{ subflows[selectedEntry.id]?.length ? `${subflows[selectedEntry.id].length} 个子节点` : '配置子节点' }} ›</button></div><label class="property-field"><span>节点名称</span><input v-model="selectedEntry.name" class="property-input"></label><label class="property-field"><span>节点分类</span><input v-model="selectedEntry.type" class="property-input" disabled></label><label class="property-field"><span>执行参数</span><input v-model="selectedEntry.parameterText" class="property-input"></label><label class="property-field"><span>失败策略</span><select v-model="selectedEntry.failureStrategy" class="property-input"><option>按策略重试后挂起</option><option>立即挂起</option><option>跳过并记录</option></select></label><label class="property-field"><span>完成依据</span><input v-model="selectedEntry.completionBasis" class="property-input"></label></div><div v-else-if="selectedConnection" class="property-fields"><div class="property-field"><span>选择连线</span><div class="property-note">当前连线：{{ selectedConnection.from }} → {{ selectedConnection.to }}</div></div></div><div v-else class="property-note">当前未选择节点或连线</div>
            <details class="property-advanced"><summary>连线与节点操作</summary><div class="property-block connection-block"><h2>节点连线</h2><p>{{ pendingPort?'请选择目标端点':'点击画布节点左右端点连接' }}</p><div class="link-card"><strong>{{ selectedConnection ? `${selectedConnection.from} → ${selectedConnection.to}` : '暂无选中连线' }}</strong><small>{{ selectedConnectionNames || '单击节点或连线进行选择' }}</small><button v-if="selectedConnection" class="row-btn delete connection-delete" type="button" @click="deleteConnection">删除选中连线</button></div></div><div class="property-block property-actions"><button class="tool-btn" type="button" @click="moveSelected(-1)">‹ 前移</button><button class="tool-btn" type="button" @click="moveSelected(1)">后移 ›</button><button class="tool-btn danger" type="button" :disabled="!selectedEntry" @click="subflowOpen?deleteSubNode():deleteNode()">删除当前节点</button></div></details>
          </aside>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
/* Terminal-node uniqueness states */
.palette-card.limit-reached{opacity:.52;cursor:not-allowed}.palette-card.limit-reached:hover{border-color:#e5e8eb;background:#fff}.property-input[readonly]{color:#8d949c;background:#fafbfc}
:root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif}
*{box-sizing:border-box}body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}button{color:inherit}svg{display:block}[hidden]{display:none!important}.icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.page-head{min-height:92px;display:flex;align-items:center;justify-content:space-between;padding:17px 20px;background:#fff}.page-head h1{margin:0 0 7px;font-size:20px}.page-head p{margin:0;color:var(--muted);font-size:13px}.page-canvas{min-height:calc(100vh - 145px);padding:20px}.page-panel{overflow:hidden;border-radius:11px;background:#fff}.tabs-row{padding:16px;border-bottom:1px solid var(--line)}.tabs{width:fit-content;display:inline-flex;align-items:center;padding:2px;border-radius:9px;background:#f3f5f7}.tab-btn{height:34px;display:inline-flex;align-items:center;padding:0 15px;border:0;border-radius:8px;color:var(--ink);background:transparent;font-size:13px;text-decoration:none;white-space:nowrap}.tab-btn.active{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(17,36,54,.08)}.tab-divider{width:1px;height:18px;margin:0 2px;background:#d8dde1}
.content{padding:20px 16px 18px}.list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 0 14px}.list-head h2{margin:0;font-size:15px}.list-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.tools{display:flex;gap:10px}.tool-btn,.head-btn{height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border:0;border-radius:8px;background:#f4f6f8;font-size:13px;font-weight:650;white-space:nowrap;cursor:pointer}.tool-btn.primary,.head-btn{color:#fff;background:var(--blue)}.tool-btn .icon,.head-btn .icon{width:18px;height:18px}.filter{width:min(460px,100%);height:40px;display:flex;align-items:center;margin:15px 0;padding:0 12px;border:1px solid #e0e4e8;border-radius:8px;background:#fff}.filter span{color:#9aa1a8;margin-right:12px}.filter input{min-width:0;flex:1;border:0;outline:0;color:var(--ink)}
.table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;min-width:1320px;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;text-align:left;white-space:nowrap;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;font-weight:700}td{height:55px}.truncate{display:block;max-width:235px;overflow:hidden;text-overflow:ellipsis}.status-tag{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:62px;padding:5px 9px;border:1px solid currentColor;border-radius:18px;font-size:11px}.status-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.valid{color:var(--green);border-color:#d1efdf;background:#f4fcf7}.draft,.standby{color:var(--yellow);border-color:#f7e8b8;background:#fffaf0}.row-actions{display:flex;gap:7px}.row-btn{height:27px;padding:0 10px;border:1px solid #cde2f3;border-radius:15px;color:var(--blue-strong);background:#f1f8fd;font-size:11px;font-weight:650;cursor:pointer}.row-btn.delete{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.total{margin-top:14px;color:var(--muted);font-size:12px}.pager-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px}.pagination{display:flex;align-items:center;gap:7px}.page-btn{min-width:34px;height:34px;border:0;border-radius:7px;background:transparent;cursor:pointer}.page-btn.active{background:#eef0f2}.page-size{height:34px;padding:0 10px;border:1px solid #dfe3e7;border-radius:8px;background:#fff}.jump{width:48px;height:34px;border:1px solid #dfe3e7;border-radius:8px}
.modal-overlay,.alert-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s}.modal-overlay.open,.alert-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(590px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:14px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22)}.modal-card h2{margin:0 0 17px;font-size:19px}.status-list{display:grid;gap:12px}.status-item{padding:15px;border-radius:7px;background:#fff}.status-item strong{display:block;margin-bottom:7px;font-size:16px}.status-item p{margin:0;color:var(--muted);font-size:12px}.normal strong{color:#23c36b}.limited strong{color:#ffb000}.abnormal strong{color:#ff493d}.maintenance strong{color:#59616a}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.form-field{display:grid;gap:7px}.form-field.wide{grid-column:1/-1}.form-field span{color:#7c858e;font-size:11px}.form-field input,.form-field select{height:39px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;background:#fff;font-size:12px}.modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}.modal-close,.modal-primary{height:36px;padding:0 15px;border:0;border-radius:8px;font-size:13px;font-weight:650;cursor:pointer}.modal-close{background:#e9edf1}.modal-primary{color:#fff;background:var(--blue)}
.alert-overlay{z-index:75}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:.24s}.alert-overlay.open .alert-drawer{transform:none}.alert-header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.alert-header h2{margin:0 0 5px;font-size:20px}.alert-header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{overflow-y:auto;padding:16px}.alert-card{padding:14px;border-radius:11px;background:#fff}.alert-card+.alert-card{margin-top:12px}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:#77808a;font-size:11px}.alert-footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.alert-primary{width:240px;height:37px;border:0;border-radius:8px;color:#fff;background:var(--blue)}.toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s}.toast.show{opacity:1;transform:translate(-50%,0)}
.clickable-row{cursor:pointer}.clickable-row:hover td{background:#f7fbff}.editor-shell{display:grid;gap:16px}.editor-meta{padding:20px}.editor-meta-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:18px}.editor-meta-head h2,.canvas-heading h2,.palette h2,.properties h2{margin:0;font-size:16px}.editor-meta-head p,.canvas-heading p,.palette>p,.properties>p{margin:7px 0 0;color:var(--muted);font-size:12px}.editor-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}.editor-field{height:42px;display:flex;align-items:center;gap:11px;padding:0 12px;border:1px solid #dfe4e8;border-radius:8px}.editor-field span{color:#969da5;font-size:12px;white-space:nowrap}.editor-field input,.editor-field select{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font-size:13px}.editor-layout{min-height:750px;display:grid;grid-template-columns:220px minmax(690px,1fr) 280px;overflow:hidden}.palette,.properties{padding:20px 16px;background:#fff}.palette{border-right:1px solid var(--line)}.properties{border-left:1px solid var(--line)}.palette-section{margin-top:18px}.palette-label{margin-bottom:8px;color:#87919a;font-size:12px}.palette-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.palette-card{min-height:74px;display:grid;place-items:center;gap:6px;padding:9px 6px;border:1px solid #e5e8eb;border-radius:9px;background:#fff;cursor:grab;font-size:12px;font-weight:650}.palette-card:hover{border-color:#bcdcf5;background:#f8fbfe}.palette-icon{width:36px;height:30px;display:grid;place-items:center;border-radius:7px;color:var(--blue);background:#edf6fd;font-size:18px}.palette-icon.start{color:#182c40;background:#c9dcf3}.palette-icon.end{color:#fff;background:#324b61}.canvas-column{min-width:0;padding:20px;background:#fff}.canvas-heading{margin-bottom:14px}.canvas-board{position:relative;min-height:650px;overflow:auto;border-radius:10px;background-color:#fafbfc;background-image:radial-gradient(#e6e9ec 1.4px,transparent 1.4px);background-size:18px 18px}.canvas-stage{position:relative;width:1000px;height:650px;transform-origin:0 0}.flow-lines{position:absolute;inset:0;overflow:visible;pointer-events:none}.flow-node{position:absolute;width:180px;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 13px;border:1px solid #dce2e7;border-left:4px solid var(--blue);border-radius:10px;background:#fff;box-shadow:0 7px 18px rgba(22,48,71,.08);cursor:pointer;text-align:left}.flow-node strong{display:block;margin-bottom:5px;font-size:13px}.flow-node small{color:#8b949d;font-size:11px}.flow-node-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:8px;color:var(--blue);background:#eaf4fd;font-size:20px}.flow-node.start,.flow-node.end{justify-content:center;border:3px solid var(--blue);background:#c8d9ef;text-align:center}.flow-node.end{color:#fff;border-color:#324b61;background:#324b61}.flow-node.selected{outline:3px solid rgba(33,130,209,.22)}.canvas-controls{position:sticky;right:16px;bottom:14px;z-index:4;width:max-content;display:flex;align-items:center;gap:7px;margin:0 14px 14px auto;padding:7px 9px;border-radius:9px;background:#fff;box-shadow:0 6px 20px rgba(12,29,47,.12)}.canvas-control{height:28px;min-width:30px;border:0;border-radius:6px;background:#f4f6f8;cursor:pointer}.property-block{margin-top:18px}.property-block h3{margin:0 0 11px;font-size:13px}.property-input{width:100%;height:40px;margin-bottom:12px;padding:0 11px;border:1px solid #dfe4e8;border-radius:8px;background:#fff;font-size:12px}.property-input[disabled]{color:#8d949c;background:#fafbfc}.property-note{padding:12px;border:1px solid #cce2f4;border-radius:8px;color:var(--blue-strong);background:#eff8ff;font-size:12px}.property-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.property-actions .tool-btn{justify-content:center;padding:0 8px}.property-actions .danger{grid-column:1/-1;color:var(--red);background:#fff1ef}.link-card{margin-top:10px;padding:12px;border:1px solid #e5e8eb;border-radius:8px}.link-card small{display:block;margin-top:6px;color:#8b949d}.canvas-fullscreen{position:fixed;inset:12px;z-index:80;min-height:auto;border:1px solid #e4e8eb;border-radius:12px;background:#fff}.canvas-fullscreen .canvas-board{height:calc(100vh - 110px)}
.flow-node{cursor:grab;touch-action:none;user-select:none}.flow-node.dragging{cursor:grabbing;opacity:.94;box-shadow:0 12px 28px rgba(22,48,71,.18)}.node-handle{position:absolute;top:50%;z-index:3;width:14px;height:14px;padding:0;border:3px solid #fff;border-radius:50%;background:var(--blue);box-shadow:0 0 0 1px #8cc2eb;transform:translateY(-50%);cursor:crosshair}.node-handle.handle-in{left:-9px}.node-handle.handle-out{right:-9px}.flow-node.start .handle-in,.flow-node.end .handle-out{display:none}.flow-path{fill:none;stroke:#87919a;stroke-width:2.3;pointer-events:stroke;cursor:pointer}.flow-path:hover,.flow-path.selected{stroke:var(--blue);stroke-width:3.5}.flow-preview{fill:none;stroke:var(--blue);stroke-width:2.5;stroke-dasharray:7 5;pointer-events:none}.canvas-board.connecting{cursor:crosshair}.connection-delete{width:100%;margin-top:10px}.canvas-tip{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:6px 9px;border-radius:6px;color:#2478b8;background:#eef7ff;font-size:11px}.canvas-tip:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--blue)}
.recovery-tabs{padding:16px;border-bottom:1px solid var(--line)}.severity-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border:1px solid currentColor;border-radius:18px;font-size:11px}.severity-tag:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.severity-critical{color:var(--red);border-color:#f3d2cf;background:#fff5f4}.severity-warning{color:var(--yellow);border-color:#f3e1ad;background:#fffaf0}.anomaly-count{color:var(--red);border-color:#f3d2cf;background:#fff5f4}.anomaly-message strong{display:block;font-size:12px}.anomaly-message small{display:block;margin-top:7px;color:var(--muted);font-size:11px;letter-spacing:.03em}.record-search{height:40px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid #dfe4e8;border-radius:8px}.record-search input{min-width:0;flex:1;border:0;outline:0}.record-list{display:grid;gap:12px;margin-top:14px}.record-card{width:100%;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px;border:1px solid #e5e8eb;border-radius:9px;background:#fff;cursor:pointer;text-align:left}.record-card:hover,.record-card.selected{border-color:#bfdcf2;background:#eef7ff}.record-card strong{display:block;margin-bottom:7px;font-size:13px}.record-card small{color:var(--muted);font-size:11px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-box{padding:14px;border:1px solid #e4e8eb;border-radius:9px;background:#fff}.detail-box.wide{grid-column:1/-1}.detail-box strong{display:block;margin-bottom:8px;font-size:12px}.detail-box p{margin:0;color:#79828b;font-size:12px;line-height:1.65}.record-modal .modal-card{width:min(720px,calc(100vw - 32px));background:#f7f9fb}
.recovery-process-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,.8fr);gap:20px;margin-top:20px}.recovery-process,.recovery-rules{padding:20px;border-radius:11px;background:#fff}.recovery-process-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.recovery-process-head h2,.recovery-rules h2{margin:0;font-size:16px}.recovery-process-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.recovery-step,.recovery-rule{margin-top:14px;padding:16px;border:1px solid #e5e9ec;border-radius:9px;background:#fff}.recovery-step{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:12px;align-items:flex-start}.step-number{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;color:var(--blue);background:#eaf4fd;font-weight:700}.recovery-step h3,.recovery-rule h3{margin:2px 0 7px;font-size:13px}.recovery-step p,.recovery-rule p{margin:0;color:var(--muted);font-size:12px;line-height:1.65}.recovery-row.selected td{background:#eaf4fd}.blue-state{color:var(--blue);border-color:#cde2f3;background:#f1f8fd}.gray-state{color:#89939d;border-color:#e1e5e8;background:#fafbfc}.recovery-table table{min-width:1100px}.anomaly-table table{min-width:1420px}.recovery-launch{margin-left:auto}
@media(max-width:1000px){.list-head{align-items:flex-start;flex-direction:column}.tools{width:100%;overflow-x:auto}.pager-row{align-items:flex-start;flex-direction:column}}@media(max-width:760px){.page-head{padding:14px}.page-head h1{font-size:18px}.page-head p{font-size:12px}.page-canvas{padding:12px}.tabs-row{padding:12px;overflow-x:auto}.content{padding:16px 12px}.tool-btn{flex:0 0 auto}.form-grid{grid-template-columns:1fr}.form-field.wide{grid-column:auto}.alert-drawer{width:100vw}.recovery-process-grid{grid-template-columns:1fr}}
@media(max-width:1100px){.recovery-process-grid{grid-template-columns:1fr}}
@media(max-width:1200px){.editor-fields{grid-template-columns:1fr}.editor-layout{min-width:1190px}.editor-shell{overflow-x:auto}}

.subflow-panel{margin-top:16px;padding:14px;border:1px solid #b8d7ef;border-radius:10px;background:#f7fbff}.subflow-panel[hidden]{display:none}.subflow-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.subflow-head h3{margin:0;font-size:14px}.subflow-head p{margin:7px 0 0;color:#51677a;font-size:12px}.subflow-workspace{display:grid;grid-template-columns:170px minmax(0,1fr);gap:12px;margin-top:14px}.subflow-palette{padding:12px;border:1px solid #d7e3ec;border-radius:9px;background:#fff}.subflow-palette h4{margin:0;font-size:13px}.subflow-palette>p{margin:7px 0 14px;color:#778592;font-size:11px}.sub-palette-card{width:100%;min-height:40px;margin-top:8px;padding:0 11px;border:1px solid #d6e1e9;border-radius:8px;background:#f4f8fb;cursor:grab;text-align:left;font-size:12px}.sub-palette-card:hover{border-color:#9bc9eb;background:#eef7ff}.subflow-canvas{position:relative;min-height:330px;overflow:auto;border:1px solid #d7e3ec;border-radius:9px;background-color:#fbfdff;background-image:radial-gradient(#dfebf4 1.25px,transparent 1.25px);background-size:18px 18px}.subflow-stage{position:relative;width:780px;height:295px}.subflow-lines{position:absolute;inset:0;overflow:visible;pointer-events:none}.subflow-path{fill:none;stroke:#5d92bd;stroke-width:2.2}.subflow-node{position:absolute;width:160px;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border:1px solid #cddce8;border-left:4px solid var(--blue);border-radius:9px;background:#fff;box-shadow:0 6px 16px rgba(22,48,71,.09);cursor:grab;touch-action:none;user-select:none}.subflow-node.dragging{cursor:grabbing;opacity:.94}.subflow-node.selected{outline:3px solid rgba(33,130,209,.22)}.subflow-node strong{font-size:12px}.subflow-node small{display:block;margin-top:5px;color:#8b949d;font-size:10px}.subflow-node-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:7px;color:var(--blue);background:#eaf4fd}.subflow-note{position:sticky;left:0;margin:0;padding:8px 10px;color:#6d7e8d;background:rgba(247,251,255,.94);font-size:10px}.subflow-empty{position:absolute;inset:0;display:grid;place-items:center;color:#94a1ac;font-size:12px;pointer-events:none}.subflow-panel.flash{animation:subflowFlash .35s ease}@keyframes subflowFlash{50%{box-shadow:0 0 0 4px rgba(33,130,209,.13)}}
@media(max-width:1200px){.subflow-workspace{grid-template-columns:1fr}.subflow-palette{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.subflow-palette h4,.subflow-palette>p{grid-column:1/-1}.sub-palette-card{margin-top:0}}

/* Controller-rendered states */
.palette-card.action-card{position:relative;min-height:86px}.palette-card.action-card .action-label{display:grid;gap:3px;text-align:center}.palette-card.action-card small{max-width:88px;overflow:hidden;color:#7d8b97;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.palette-card.action-draft{opacity:.5;cursor:not-allowed}.palette-card.action-draft:after{content:"草稿";position:absolute;right:4px;top:4px;padding:2px 4px;border-radius:5px;color:#9a6d00;background:#fff3c4;font-size:8px}
</style>
<style>
/* Figma: template editor workspace (nodes 35209:14046 / 35227:18448 / 35209:17232). */
body:has(.editor-shell) .editor-shell {
  gap: 20px;
  min-height: calc(100vh - 145px);
  padding: 24px;
  background: #f5f6f7;
}
body:has(.editor-shell) .editor-meta {
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
}
body:has(.editor-shell) .editor-meta-head {
  align-items: flex-start;
  gap: 16px;
  margin: 0;
  padding: 20px;
  border-bottom: 1px solid rgba(8, 24, 41, .06);
}
body:has(.editor-shell) .editor-meta-head h2 {
  color: #081829;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}
body:has(.editor-shell) .editor-meta-head p {
  margin-top: 4px;
  color: rgba(8, 24, 41, .48);
  font-size: 12px;
  line-height: 16px;
}
body:has(.editor-shell) .editor-meta-head .status-tag {
  min-width: auto;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}
body:has(.editor-shell) .editor-meta-head .status-tag::before { display: none; }
body:has(.editor-shell) .editor-fields {
  gap: 16px;
  padding: 16px 20px;
}
body:has(.editor-shell) .editor-field {
  height: 42px;
  gap: 12px;
  padding: 0 12px;
  border-color: rgba(8, 24, 41, .1);
  border-radius: 8px;
}
body:has(.editor-shell) .editor-field span {
  color: rgba(8, 24, 41, .48);
  font-size: 14px;
  line-height: 20px;
}
body:has(.editor-shell) .editor-field input,
body:has(.editor-shell) .editor-field select {
  color: #081829;
  font-size: 14px;
  line-height: 20px;
}

body:has(.editor-shell) .editor-layout {
  display: block;
  min-height: 0;
  overflow: visible;
  padding: 20px;
  border: 0;
  border-radius: 12px;
  background: #fff;
}
body:has(.editor-shell) .editor-canvas-heading {
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
}
body:has(.editor-shell) .editor-canvas-heading h2 {
  margin: 0;
  color: #081829;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}
body:has(.editor-shell) .editor-canvas-heading p {
  margin: 0;
  color: rgba(8, 24, 41, .48);
  font-size: 12px;
  line-height: 16px;
}
body:has(.editor-shell) .editor-workspace {
  display: grid;
  grid-template-columns: 240px minmax(620px, 1fr) 240px;
  gap: 12px;
  height: 758px;
  min-height: 758px;
  overflow: hidden;
  padding: 8px;
  border-radius: 12px;
  background: #f5f6f7 url("/assets/template-editor/dot-grid.png") repeat;
  background-size: 16px 16px;
}
body:has(.editor-shell) .palette,
body:has(.editor-shell) .properties {
  z-index: 1;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  border: 0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 10px -2px rgba(8, 24, 41, .06);
}
body:has(.editor-shell) .palette h2,
body:has(.editor-shell) .properties h2 {
  color: #081829;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
body:has(.editor-shell) .palette > p,
body:has(.editor-shell) .properties > p {
  margin: 4px 0 0;
  color: rgba(8, 24, 41, .48);
  font-size: 12px;
  line-height: 16px;
}
body:has(.editor-shell) .palette-section { margin-top: 16px; }
body:has(.editor-shell) .palette-label {
  margin-bottom: 8px;
  color: rgba(8, 24, 41, .48);
  font-size: 12px;
  line-height: 16px;
}
body:has(.editor-shell) .palette-grid { gap: 8px; }
body:has(.editor-shell) .palette-card {
  min-height: 72px;
  gap: 6px;
  padding: 8px 4px;
  border-color: rgba(8, 24, 41, .06);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}
body:has(.editor-shell) .palette-card:hover {
  border-color: rgba(21, 119, 210, .35);
  background: #f7fbff;
}
body:has(.editor-shell) .palette-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: #1677d2;
  background: transparent;
  font-size: 18px;
}
body:has(.editor-shell) .palette-icon.start,
body:has(.editor-shell) .palette-icon.end {
  color: #1677d2;
  background: transparent;
}

body:has(.editor-shell) .canvas-column {
  position: relative;
  display: flex;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  padding: 0;
  background: transparent;
}
body:has(.editor-shell) .canvas-heading { display: none; }
body:has(.editor-shell) .canvas-board {
  width: 100%;
  cursor: grab;
  touch-action: none;
  user-select: none;
  height: 742px;
  min-height: 742px;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  background-image: none;
}
body:has(.editor-shell) .canvas-stage {
  width: 1000px;
  min-height: 742px;
  height: 742px;
}
body:has(.editor-shell) .flow-node {
  width: 180px;
  height: 64px;
  padding: 0 12px;
  border: 1px solid rgba(8, 24, 41, .08);
  border-left: 4px solid #1677d2;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 20px -4px rgba(8, 24, 41, .06);
}
body:has(.editor-shell) .flow-node.start,
body:has(.editor-shell) .flow-node.end {
  justify-content: space-between;
  border: 1px solid #1677d2;
  border-left: 4px solid #1677d2;
  color: #081829;
  background: #fff;
  text-align: left;
}
body:has(.editor-shell) .flow-node strong {
  margin-bottom: 3px;
  color: #081829;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}
body:has(.editor-shell) .flow-node small {
  color: rgba(8, 24, 41, .48);
  font-size: 10px;
  line-height: 16px;
}
body:has(.editor-shell) .flow-node-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  color: #1677d2;
  background: rgba(21, 119, 210, .08);
  font-size: 18px;
}
body:has(.editor-shell) .flow-node.selected {
  outline: 2px solid #1677d2;
  outline-offset: 0;
}
body:has(.editor-shell) .flow-path {
  stroke: #87919a;
  stroke-width: 2;
}
body:has(.editor-shell) .canvas-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 5;
  gap: 8px;
  margin: 0;
  padding: 6px 8px;
  border-radius: 8px;
  box-shadow: 0 4px 10px -2px rgba(8, 24, 41, .08);
}
body:has(.editor-shell) .canvas-control {
  height: 28px;
  min-width: 28px;
  border-radius: 6px;
  background: #fff;
}
body:has(.editor-shell) .property-block { margin-top: 16px; }
body:has(.editor-shell) .property-block h3 {
  margin-bottom: 8px;
  color: #081829;
  font-size: 12px;
  line-height: 16px;
}
body:has(.editor-shell) .property-input {
  height: 32px;
  margin-bottom: 14px;
  padding: 0 10px;
  border-color: rgba(8, 24, 41, .1);
  border-radius: 6px;
  font-size: 12px;
}
body:has(.editor-shell) .property-note {
  padding: 6px 10px;
  border-color: #bae0ff;
  border-radius: 6px;
  color: #1677d2;
  background: #e6f4ff;
  font-size: 12px;
  line-height: 20px;
}
body:has(.editor-shell) .link-card {
  padding: 12px;
  border-color: rgba(8, 24, 41, .06);
  border-radius: 8px;
}
body:has(.editor-shell) .subflow-panel {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
body:has(.editor-shell) .subflow-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 10px -2px rgba(8, 24, 41, .06);
}
body:has(.editor-shell) .subflow-head h3 {
  color: #081829;
  font-size: 14px;
  line-height: 20px;
}
body:has(.editor-shell) .subflow-head p { color: rgba(8, 24, 41, .48); }
body:has(.editor-shell) .subflow-workspace {
  flex: 1;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  margin: 0;
}
body:has(.editor-shell) .subflow-palette,
body:has(.editor-shell) .subflow-canvas {
  border-color: rgba(8, 24, 41, .06);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 10px -2px rgba(8, 24, 41, .06);
}
body:has(.editor-shell) .subflow-palette { padding: 14px; }
body:has(.editor-shell) .subflow-canvas {
  min-height: 0;
  background-color: #f5f6f7;
  background-image: url("/assets/template-editor/dot-grid.png");
  background-size: 16px 16px;
}
body:has(.editor-shell) .subflow-node {
  height: 64px;
  border-color: rgba(8, 24, 41, .08);
  border-left-color: #28bd6b;
  background: #fff;
}
body:has(.editor-shell) .subflow-node-icon {
  color: #28bd6b;
  background: rgba(40, 189, 107, .08);
}
body:has(.editor-shell) .subflow-node.selected { outline-color: rgba(40, 189, 107, .24); }

@media (max-width: 1200px) {
  body:has(.editor-shell) .editor-workspace {
    grid-template-columns: 220px minmax(620px, 1fr) 240px;
    overflow: auto;
  }
}
@media (max-width: 760px) {
  body:has(.editor-shell) .editor-shell { padding: 12px; }
  body:has(.editor-shell) .editor-fields { grid-template-columns: 1fr; padding: 12px; }
  body:has(.editor-shell) .editor-layout { padding: 12px; }
  body:has(.editor-shell) .editor-workspace { height: 560px; min-height: 560px; }
}

/* Interactive Figma editor states: collapsible trays and a focused canvas dialog. */
body:has(.editor-shell) .editor-workspace { position: relative; isolation: isolate; overflow: hidden !important; transition: grid-template-columns .2s ease; }
body:has(.editor-shell) .palette h2,
body:has(.editor-shell) .properties h2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
body:has(.editor-shell) .panel-collapse {
  display: grid; width: 20px; height: 20px; place-items: center; padding: 0;
  border: 0; border-radius: 4px; color: #081829; background: transparent;
  font-size: 13px; line-height: 1; cursor: pointer;
}
body:has(.editor-shell) .panel-collapse:hover { color: #1677d2; background: #f0f7ff; }
body:has(.editor-shell) .panel-reopen {
  position: absolute; top: 8px; z-index: 40; display: none; align-items: center; gap: 6px;
  height: 32px; padding: 0 10px; border: 1px solid rgba(8,24,41,.08); border-radius: 6px;
  color: #081829; background: #fff; box-shadow: 0 4px 10px -2px rgba(8,24,41,.08);
  font-size: 12px; font-weight: 600; line-height: 16px; cursor: pointer; pointer-events: auto;
}
body:has(.editor-shell) .panel-reopen span { color: #081829; font-size: 12px; line-height: 1; }
body:has(.editor-shell) .panel-reopen:hover { border-color: #91caff; color: #1677d2; }
body:has(.editor-shell) .panel-reopen-left { left: 8px; }
body:has(.editor-shell) .panel-reopen-right { right: 8px; }
body:has(.editor-shell) .editor-workspace.palette-collapsed { grid-template-columns: minmax(620px,1fr) 240px; }
body:has(.editor-shell) .editor-workspace.properties-collapsed { grid-template-columns: 240px minmax(620px,1fr); }
body:has(.editor-shell) .editor-workspace.palette-collapsed.properties-collapsed { grid-template-columns: minmax(620px,1fr); }
body:has(.editor-shell) .editor-workspace.palette-collapsed .palette,
body:has(.editor-shell) .editor-workspace.properties-collapsed .properties { display: none; }
body:has(.editor-shell) .editor-workspace.palette-collapsed .panel-reopen-left,
body:has(.editor-shell) .editor-workspace.properties-collapsed .panel-reopen-right { display: inline-flex; visibility: visible; pointer-events: auto; }

body:has(.editor-shell) .property-fields { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
body:has(.editor-shell) .property-field { display: grid; gap: 8px; color: #081829; font-size: 12px; font-weight: 600; line-height: 16px; }
body:has(.editor-shell) .property-field .property-input { height: 32px; margin: 0; font-weight: 400; }
body:has(.editor-shell) .property-field .property-note { margin: 0; font-weight: 400; }
body:has(.editor-shell) .properties > .property-block { margin-top: 16px; }
body:has(.editor-shell) .properties > .property-block > h3 { margin: 0 0 8px; line-height: 16px; }
body:has(.editor-shell) .properties > .property-block > .property-input { margin: 0 0 12px; }
body:has(.editor-shell) .properties > .property-block > .property-input:last-child { margin-bottom: 0; }
body:has(.editor-shell) .properties > .property-block > .property-note { margin: 0; }
body:has(.editor-shell) .properties > .property-block > h2 { margin: 0; }
body:has(.editor-shell) .properties > .property-block > h2 + p { margin: 4px 0 12px; color: rgba(8,24,41,.48); font-size: 12px; line-height: 16px; }

body:has(.editor-shell) .editor-workspace,
body:has(.editor-shell) .subflow-canvas {
  background-color: #f8f9fa;
  background-image: radial-gradient(circle, rgba(8,24,41,.12) 1px, transparent 1.2px);
  background-size: 16px 16px;
  background-position: 1px 1px;
}
body:has(.editor-shell) .canvas-board { background: transparent; }
body:has(.editor-shell) .canvas-board.panning { cursor: grabbing; }
body:has(.editor-shell) .canvas-board.panning .canvas-stage { transition: none; }
body:has(.editor-shell) .canvas-stage.viewport-animate { transition: transform .18s ease; }
body:has(.editor-shell) .canvas-expand-control { display: inline-flex; align-items: center; gap: 4px; padding: 0 7px; }
body:has(.editor-shell) .canvas-expand-control span { font-size: 12px; font-weight: 500; white-space: nowrap; }

body.canvas-modal-open { overflow: hidden; }

body:has(.editor-shell) .canvas-column.canvas-fullscreen {
  position: fixed; inset: 0; z-index: 2000; display: flex; flex-direction: column;
  padding: 20px; border: 0; border-radius: 0; background: #fff;
  box-shadow: none; pointer-events: auto; isolation: isolate;
}
body:has(.editor-shell) .canvas-column.canvas-fullscreen::before {
  content: "Canvas 动作组合画布"; display: block; flex: 0 0 auto; padding: 0 4px 14px;
  color: #081829; font-size: 16px; font-weight: 600; line-height: 24px;
}
body:has(.editor-shell) .canvas-column.canvas-fullscreen .canvas-board {
  flex: 1; height: auto; min-height: 0; border: 1px solid rgba(8,24,41,.06);
  background-color: #f8f9fa;
  background-image: radial-gradient(circle, rgba(8,24,41,.12) 1px, transparent 1.2px);
  background-size: 16px 16px; background-position: 1px 1px;
}
body:has(.editor-shell) .canvas-column.canvas-fullscreen .canvas-stage { width: 1260px; height: 760px; min-height: 760px; }
body:has(.editor-shell) .canvas-controls { z-index: 30; }
body:has(.editor-shell) .canvas-column.canvas-fullscreen .canvas-controls { right: 32px; bottom: 32px; z-index: 60; }
body:has(.editor-shell) .canvas-column.canvas-fullscreen .subflow-panel { z-index: 20; }
@media (max-width: 760px) {
  body:has(.editor-shell) .canvas-column.canvas-fullscreen { inset: 0; padding: 12px; }
  body:has(.editor-shell) .canvas-column.canvas-fullscreen .canvas-stage { width: 1000px; height: 650px; min-height: 650px; }
  body:has(.editor-shell) .canvas-expand-control span { display: none; }
}


/* Child-flow navigation: keep the return path visible and compact. */
body:has(.editor-shell) .subflow-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 0;
  min-height: 32px;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

body:has(.editor-shell) .subflow-back,
body:has(.editor-shell) .subflow-save {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  line-height: 30px;
  white-space: nowrap;
  cursor: pointer;
}

body:has(.editor-shell) .subflow-back {
  color: #081829;
  background: #fff;
  border: 1px solid rgba(8, 24, 41, 0.14);
}

body:has(.editor-shell) .subflow-back:hover {
  color: #1677ff;
  border-color: #69b1ff;
}

body:has(.editor-shell) .subflow-save {
  color: #fff;
  background: #1677ff;
  border: 1px solid #1677ff;
}

body:has(.editor-shell) .subflow-save:hover {
  background: #4096ff;
  border-color: #4096ff;
}

body:has(.editor-shell) .subflow-meta {
  display: none;
}

/* Keep the core node form short; reveal lower-frequency business actions on demand. */
body:has(.editor-shell) .properties {
  display: flex;
  flex-direction: column;
}

body:has(.editor-shell) .property-advanced {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid rgba(8, 24, 41, 0.06);
}

body:has(.editor-shell) .property-advanced > summary {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border: 1px solid rgba(8, 24, 41, 0.1);
  border-radius: 6px;
  color: #081829;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  line-height: 30px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

body:has(.editor-shell) .property-advanced > summary::-webkit-details-marker {
  display: none;
}

body:has(.editor-shell) .property-advanced > summary::after {
  content: "⌄";
  color: #5f6b7a;
  font-size: 13px;
}

body:has(.editor-shell) .property-advanced[open] {
  max-height: 310px;
  overflow: auto;
}

body:has(.editor-shell) .property-advanced[open] > summary {
  position: sticky;
  top: 0;
  z-index: 2;
}

body:has(.editor-shell) .property-advanced[open] > summary::after {
  content: "⌃";
}

body:has(.editor-shell) .property-advanced .property-block {
  margin-top: 12px;
}

/* Match the public filter row: one outer border, borderless native select. */
body:has(.editor-shell) .editor-field:has(> select) {
  height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(8, 24, 41, 0.1);
  border-radius: 8px;
  background: #fff;
}

body:has(.editor-shell) .editor-field:has(> select):focus-within {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

body:has(.editor-shell) .editor-field > select {
  appearance: none !important;
  -webkit-appearance: none !important;
  align-self: stretch;
  min-width: 0;
  height: 38px !important;
  padding: 0 28px 0 0 !important;
  color: #081829;
  background-color: transparent !important;
  background-image: url("/assets/list-icons/arrow-down.svg") !important;
  background-repeat: no-repeat !important;
  background-position: right 8px center !important;
  background-size: 12px 12px !important;
  border: 0 !important;
  border-radius: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}


body:has(.editor-shell) .subflow-panel[hidden] {
  display: none;
}

body:has(.editor-shell) .properties {
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(8, 24, 41, 0.16) transparent;
}


/* The select enhancer replaces the native select with this trigger.
   Keep the public filter single-border treatment after enhancement. */
body:has(.editor-shell) .editor-field > .agv-select-trigger {
  flex: 1 1 auto !important;
  width: auto !important;
  min-width: 0 !important;
  height: 38px !important;
  min-height: 38px !important;
  margin: 0 !important;
  padding: 0 28px 0 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  color: #081829 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 20px !important;
  box-shadow: none !important;
}

body:has(.editor-shell) .editor-field > .agv-select-trigger:hover,
body:has(.editor-shell) .editor-field > .agv-select-trigger:focus-visible,
body:has(.editor-shell) .editor-field > .agv-select-trigger[aria-expanded="true"] {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

body:has(.editor-shell) .editor-field > .agv-select-trigger::after {
  right: 10px;
}

body:has(.editor-shell) .property-advanced[hidden] {
  display: none !important;
}


/* Child flow replaces the main canvas instead of appearing as a translucent layer. */
body:has(.editor-shell) .canvas-column.subflow-active > .canvas-board,
body:has(.editor-shell) .canvas-column.subflow-active > .canvas-controls {
  visibility: hidden;
  pointer-events: none;
}

body:has(.editor-shell) .canvas-column.subflow-active > .subflow-panel {
  z-index: 90;
  background: #f5f6f7;
  isolation: isolate;
}

body:has(.editor-shell) .canvas-column.canvas-fullscreen.subflow-active > .subflow-panel {
  z-index: 100;
}


/* Figma child-flow state: reuse the outer three-column editor shell. */
body:has(.editor-shell) .subflow-palette-content {
  display: none;
}

body:has(.editor-shell) .editor-workspace.subflow-mode .palette > .palette-section {
  display: none;
}

body:has(.editor-shell) .editor-workspace.subflow-mode .subflow-palette-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

body:has(.editor-shell) .subflow-palette-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

body:has(.editor-shell) .subflow-palette-section .palette-label {
  margin: 0;
}

body:has(.editor-shell) .subflow-palette-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

body:has(.editor-shell) .child-palette-card {
  width: 100%;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 12px 4px;
  overflow: hidden;
  border: 1px solid rgba(8, 24, 41, 0.06);
  border-radius: 10px;
  color: #081829;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  text-align: center;
}

body:has(.editor-shell) .child-palette-card:hover {
  border-color: rgba(40, 189, 107, 0.35);
  background: rgba(40, 189, 107, 0.04);
}

body:has(.editor-shell) .child-palette-icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  color: #28bd6b;
  font-size: 20px;
  line-height: 24px;
}

body:has(.editor-shell) .canvas-column.subflow-active > .subflow-panel {
  inset: 0;
  display: block;
  overflow: hidden;
  background: #f5f6f7;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-head {
  position: absolute;
  top: 8px;
  right: 8px;
  left: 8px;
  z-index: 6;
  margin: 0;
  pointer-events: none;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-back,
body:has(.editor-shell) .canvas-column.subflow-active .subflow-save {
  pointer-events: auto;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-workspace {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-palette {
  display: none !important;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-canvas {
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background-color: #f5f6f7;
  background-image: radial-gradient(circle, rgba(8, 24, 41, 0.12) 1px, transparent 1.2px);
  background-position: 1px 1px;
  background-size: 16px 16px;
  box-shadow: none;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-stage {
  width: 1000px;
  height: 650px;
  min-height: 650px;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-note {
  display: none;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-node {
  width: 180px;
  height: 64px;
  padding: 0 12px;
  border: 1px solid rgba(8, 24, 41, 0.08);
  border-left: 4px solid #28bd6b;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 20px -4px rgba(8, 24, 41, 0.06), 0 0 0 1px rgba(8, 24, 41, 0.04);
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-node.selected {
  outline: 2px solid rgba(40, 189, 107, 0.3);
  outline-offset: 1px;
}

body:has(.editor-shell) .canvas-column.subflow-active .subflow-node-icon {
  width: 40px;
  height: 40px;
  color: #28bd6b;
  background: rgba(40, 189, 107, 0.08);
}

body:has(.editor-shell) .editor-workspace.subflow-mode .properties .property-note {
  color: #28bd6b;
  border-color: rgba(40, 189, 107, 0.15);
  background: rgba(40, 189, 107, 0.08);
}


body:has(.editor-shell) .subflow-controls {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 7;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 10px -2px rgba(8, 24, 41, 0.06);
}

body:has(.editor-shell) .subflow-controls button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  color: #081829;
  background: #fff;
  cursor: pointer;
}

body:has(.editor-shell) .subflow-controls button:hover {
  color: #1577d2;
  background: #f5f9fd;
}

body:has(.editor-shell) .subflow-controls strong {
  width: 50px;
  color: #081829;
  font-size: 12px;
  font-weight: 500;
  line-height: 36px;
  text-align: center;
}

/* Hover deletion affordances for main-canvas nodes and selected connections. */
body:has(.editor-shell) .flow-node-delete {
  position: absolute;
  top: -11px;
  right: -11px;
  z-index: 8;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  background: #e1473f;
  box-shadow: 0 4px 12px rgba(225, 71, 63, 0.28);
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: scale(.78);
  transition: opacity .14s ease, transform .14s ease, background .14s ease;
}

body:has(.editor-shell) .flow-node:hover .flow-node-delete {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

body:has(.editor-shell) .flow-node-delete:hover { background: #c8322b; }

body:has(.editor-shell) .flow-path.selected {
  stroke: #e1473f;
  stroke-width: 4.2;
  filter: drop-shadow(0 0 4px rgba(225, 71, 63, 0.5));
}

body:has(.editor-shell) .flow-line-delete {
  cursor: pointer;
  pointer-events: all;
  filter: drop-shadow(0 3px 6px rgba(225, 71, 63, 0.3));
}

body:has(.editor-shell) .flow-line-delete circle {
  fill: #e1473f;
  stroke: #fff;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

body:has(.editor-shell) .flow-line-delete path {
  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}

body:has(.editor-shell) .flow-line-delete:hover circle { fill: #c8322b; }

body:has(.editor-shell) .subflow-lines { pointer-events: none; }

body:has(.editor-shell) .subflow-path {
  pointer-events: stroke;
  cursor: pointer;
}

body:has(.editor-shell) .subflow-path:hover,
body:has(.editor-shell) .subflow-path.selected {
  stroke: #e1473f;
  stroke-width: 4;
  filter: drop-shadow(0 0 4px rgba(225, 71, 63, 0.42));
}

body:has(.editor-shell) .subflow-preview {
  fill: none;
  stroke: #28bd6b;
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
  pointer-events: none;
}

body:has(.editor-shell) .subflow-node .node-handle {
  background: #28bd6b;
  box-shadow: 0 0 0 1px #75dca3;
}

body:has(.editor-shell) .subflow-canvas.connecting { cursor: crosshair; }

/* Workflow SVG icons, child counts and bidirectional left/right connection ports. */
body:has(.editor-shell) .flow-action-icon {
  width: 22px;
  height: 22px;
  display: block;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

body:has(.editor-shell) .flow-action-icon .icon-solid {
  fill: currentColor;
  stroke: none;
}

body:has(.editor-shell) .flow-action-icon .icon-cut {
  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
}

body:has(.editor-shell) .flow-action-icon .icon-cut-fill {
  fill: #fff;
  stroke: none;
}

body:has(.editor-shell) .flow-node.start,
body:has(.editor-shell) .flow-node.end {
  width: 64px;
  height: 64px;
  justify-content: center;
  padding: 0;
  border: 2px solid #1677d2;
  border-radius: 50%;
  background: #fff;
  text-align: center;
}

body:has(.editor-shell) .flow-node.end {
  border-color: #5f6b7a;
}

body:has(.editor-shell) .flow-node.start .flow-node-icon,
body:has(.editor-shell) .flow-node.end .flow-node-icon {
  width: 42px;
  height: 42px;
  color: #1677d2;
  background: rgba(21, 119, 210, .08);
}

body:has(.editor-shell) .flow-node.end .flow-node-icon {
  color: #5f6b7a;
  background: rgba(95, 107, 122, .09);
}

body:has(.editor-shell) .flow-node.start .flow-action-icon,
body:has(.editor-shell) .flow-node.end .flow-action-icon {
  width: 26px;
  height: 26px;
}

body:has(.editor-shell) .palette-icon .flow-action-icon,
body:has(.editor-shell) .child-palette-icon .flow-action-icon {
  width: 20px;
  height: 20px;
}

/* Never paint legacy character glyphs while the SVG icon system initializes. */
body:has(.editor-shell) .palette-icon:not(:has(.flow-action-icon)),
body:has(.editor-shell) .child-palette-icon:not(:has(.flow-action-icon)) {
  font-size: 0;
}

body:has(.editor-shell) .palette-icon:not(:has(.flow-action-icon))::after,
body:has(.editor-shell) .child-palette-icon:not(:has(.flow-action-icon))::after {
  width: 13px;
  height: 13px;
  border: 1.8px solid currentColor;
  border-radius: 4px;
  transform: rotate(45deg);
  content: "";
}

body:has(.editor-shell) .flow-node-copy {
  min-width: 0;
  flex: 1 1 auto;
}

body:has(.editor-shell) .flow-node-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

body:has(.editor-shell) .flow-node-child-count {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  color: #1577d2;
  background: rgba(21, 119, 210, .09);
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
}

body:has(.editor-shell) .flow-node-subflow-entry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  padding: 2px 6px;
  border: 1px solid rgba(40, 189, 107, .24);
  border-radius: 999px;
  color: #159352;
  background: rgba(40, 189, 107, .08);
  font-size: 9px;
  font-weight: 600;
  line-height: 14px;
  cursor: pointer;
  transition: border-color .14s ease, background .14s ease, transform .14s ease;
}

body:has(.editor-shell) .flow-node-subflow-entry:hover,
body:has(.editor-shell) .flow-node-subflow-entry:focus-visible {
  border-color: rgba(40, 189, 107, .55);
  background: rgba(40, 189, 107, .15);
  outline: 0;
  transform: translateX(1px);
}

body:has(.editor-shell) .flow-node-subflow-entry .flow-node-child-count {
  min-height: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  font-size: inherit;
  line-height: inherit;
}

body:has(.editor-shell) .flow-node-subflow-entry b {
  font-size: 13px;
  font-weight: 700;
  line-height: 12px;
}

body:has(.editor-shell) .subflow-entry-field {
  padding: 10px;
  border: 1px solid rgba(40, 189, 107, .18);
  border-radius: 8px;
  background: rgba(40, 189, 107, .06);
}

body:has(.editor-shell) .subflow-entry-field > span {
  color: #159352;
}

body:has(.editor-shell) .subflow-entry-button {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid rgba(40, 189, 107, .25);
  border-radius: 7px;
  color: #0d6f3d;
  background: #fff;
  font-size: 11px;
  cursor: pointer;
}

body:has(.editor-shell) .subflow-entry-button:hover,
body:has(.editor-shell) .subflow-entry-button:focus-visible {
  border-color: #28bd6b;
  outline: 2px solid rgba(40, 189, 107, .14);
  outline-offset: 1px;
}

body:has(.editor-shell) .subflow-entry-button span { color: rgba(8, 24, 41, .55); }
body:has(.editor-shell) .subflow-entry-button strong { color: #159352; font-weight: 600; }

body:has(.editor-shell) .canvas-stage,
body:has(.editor-shell) .subflow-stage {
  isolation: isolate;
}

body:has(.editor-shell) .flow-lines,
body:has(.editor-shell) .subflow-lines {
  z-index: 1;
}

body:has(.editor-shell) .flow-node,
body:has(.editor-shell) .subflow-node {
  z-index: 2;
}

body:has(.editor-shell) :is(.flow-path,.flow-preview,.subflow-path,.subflow-preview) {
  stroke-linecap: butt;
  stroke-linejoin: miter;
  shape-rendering: geometricPrecision;
}

body:has(.editor-shell) :is(.flow-node,.subflow-node).connection-target {
  outline: 3px solid rgba(40, 189, 107, .28);
  outline-offset: 3px;
  box-shadow: 0 8px 22px -4px rgba(40, 189, 107, .24);
}

body:has(.editor-shell) :is(.flow-node,.subflow-node) .node-handle.connection-target {
  background: #28bd6b;
  box-shadow: 0 0 0 4px rgba(40, 189, 107, .18);
  transform: translateY(-50%) scale(1.22);
}

body:has(.editor-shell) :is(.flow-node,.subflow-node).start .handle-in,
body:has(.editor-shell) :is(.flow-node,.subflow-node).end .handle-out {
  display: block;
}

body:has(.editor-shell) :is(.flow-node,.subflow-node) .node-handle.occupied {
  border-color: #fff;
  background: #aab4bd;
  box-shadow: 0 0 0 1px #d5dbe0;
  cursor: not-allowed;
}

body:has(.editor-shell) :is(.flow-node,.subflow-node) .node-handle:not(.occupied):hover {
  box-shadow: 0 0 0 4px rgba(33, 130, 209, .16);
  transform: translateY(-50%) scale(1.18);
}
</style>
<style scoped>
.workflow-editor-reference-page{padding:0}.workflow-editor-reference-page>.page-head{margin:0}.api-empty{text-align:center;color:var(--muted)}
</style>
