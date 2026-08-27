import { getLaboratory, getLaboratoryConfig, resolveDashboardAssetUrl } from './assets/data/dashboard-data.js';

(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://121.196.164.163:8081';
  const DEMO_MODE=false;
  const DEMO_LAB={name:'点位路线演示'};
  const DEMO_CONFIG={id:'DEMO',revision:'-',status:'STATIC',map:{name:'四点位直角路线演示'}};
  const DEMO_DETAIL={id:'DEMO',labName:'点位路线演示',revision:'-',status:'静态数据',map:{name:'四点位直角路线演示'},machines:[],points:[
    {id:1,code:'P-01',name:'起始点',type:'ACTION_POINT',frame:'MAP',x:200,y:80,z:0,rx:0,ry:0,rz:0},
    {id:2,code:'P-02',name:'缓存点',type:'ACTION_POINT',frame:'MAP',x:320,y:220,z:0,rx:0,ry:0,rz:0},
    {id:3,code:'P-03',name:'检测点',type:'ACTION_POINT',frame:'MAP',x:610,y:150,z:0,rx:0,ry:0,rz:0},
    {id:4,code:'P-04',name:'终点',type:'ACTION_POINT',frame:'MAP',x:850,y:370,z:0,rx:0,ry:0,rz:0}
  ]};
  const apiBaseUrl=location.protocol==='file:'?DIRECT_API_BASE_URL:'';
  const mapArt=document.querySelector('.map-art');
  const routeLayer=mapArt?.querySelector('.route-layer');
  const legend=mapArt?.querySelector('.map-legend');
  const taskTitle=document.querySelector('.task-title');
  const taskMeta=document.querySelector('.task-meta');
  if(!mapArt||!routeLayer)return;

  const tooltip=document.createElement('div');
  tooltip.className='lab-map-tooltip';
  tooltip.setAttribute('role','tooltip');
  tooltip.setAttribute('aria-hidden','true');
  tooltip.hidden=true;
  mapArt.appendChild(tooltip);

  const SVG_NS='http://www.w3.org/2000/svg';
  const MAP_COORDINATE_WIDTH=1024;
  const MAP_COORDINATE_HEIGHT=551;


  let currentLab=null,currentConfig=null,currentDetail=null;

  function configIdOf(config){return config?.configId??config?.id??null}
  function finite(value){const number=Number(value);return Number.isFinite(number)?number:null}
  function svg(tag,attributes){const node=document.createElementNS(SVG_NS,tag);Object.entries(attributes||{}).forEach(([name,value])=>node.setAttribute(name,String(value)));return node}

  function hideTooltip(){tooltip.hidden=true;tooltip.setAttribute('aria-hidden','true')}
  function positionTooltip(anchor){
    const mapRect=mapArt.getBoundingClientRect(),anchorRect=anchor.getBoundingClientRect(),offset=10,padding=8;
    tooltip.style.left='0px';tooltip.style.top='0px';
    const width=tooltip.offsetWidth,height=tooltip.offsetHeight,anchorX=anchorRect.left+anchorRect.width/2-mapRect.left,anchorTop=anchorRect.top-mapRect.top;
    const left=Math.max(padding,Math.min(anchorX-width/2,mapRect.width-width-padding));
    const top=Math.max(padding,anchorTop-height-offset);
    tooltip.style.left=left+'px';
    tooltip.style.top=top+'px';
    tooltip.style.setProperty('--tooltip-arrow-x',Math.max(12,Math.min(anchorX-left,width-12))+'px');
  }
  function showTooltip(label,anchor){tooltip.textContent=label;tooltip.hidden=false;tooltip.setAttribute('aria-hidden','false');positionTooltip(anchor)}
  function showState(message,error){hideTooltip();mapArt.dataset.mapState=message;mapArt.classList.toggle('lab-map-error',Boolean(error));mapArt.classList.toggle('lab-map-loading',!error)}
  function clearState(){mapArt.classList.remove('lab-map-loading','lab-map-error');delete mapArt.dataset.mapState}
  function announce(message){if(typeof window.showToast==='function')window.showToast(message);else{const toast=document.getElementById('toast');if(toast){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2400)}}}

  function resolveSpatialEntities(detail){
    const machines=(Array.isArray(detail.machines)?detail.machines:[]).map(machine=>({kind:'machine',id:machine.id,code:machine.code,name:machine.name||machine.code,x:finite(machine.anchorX),y:finite(machine.anchorY),yaw:finite(machine.anchorYaw),raw:machine})).filter(item=>item.x!==null&&item.y!==null);
    const machineMap=new Map(machines.map(machine=>[machine.id,machine]));
    const points=(Array.isArray(detail.points)?detail.points:[]).map(point=>{
      let x=finite(point.x),y=finite(point.y),coordinateNote=point.frame||'MAP';
      if(point.frame==='MACHINE'){
        const machine=machineMap.get(point.machineId);
        if(machine&&x!==null&&y!==null){const radians=(machine.yaw||0)*Math.PI/180,rotatedX=x*Math.cos(radians)-y*Math.sin(radians),rotatedY=x*Math.sin(radians)+y*Math.cos(radians);x=machine.x+rotatedX;y=machine.y+rotatedY;coordinateNote='MACHINE → MAP'}
        else{x=null;y=null}
      }
      return{kind:'point',id:point.id,code:point.code,name:point.name||point.code,x,y,yaw:finite(point.rz),coordinateNote,raw:point};
    }).filter(item=>item.x!==null&&item.y!==null).sort((a,b)=>{const left=Number(a.id),right=Number(b.id);if(Number.isFinite(left)&&Number.isFinite(right))return left-right;return String(a.id).localeCompare(String(b.id),'zh-CN',{numeric:true})});
    return{machines,points};
  }

  function createProjector(){
    return item=>({x:item.x,y:MAP_COORDINATE_HEIGHT-item.y});
  }

  function pointLabel(item){
    return('点位 ID '+item.id+' · '+(item.name||item.code||item.id)+' · X '+item.x+' / Y '+item.y+(item.coordinateNote?' · '+item.coordinateNote:''));
  }

  function addInteractiveNode(group,item,position,index){
    const labelText=pointLabel(item),wrapper=svg('g',{class:'lab-map-node',tabindex:'0',role:'button','aria-label':labelText,'data-map-label':labelText,'data-point-id':item.id,'data-point-x':item.x,'data-point-y':item.y}),shape=svg('path',{class:'lab-map-point',d:'M '+position.x+' '+(position.y-9)+' L '+(position.x+9)+' '+position.y+' L '+position.x+' '+(position.y+9)+' L '+(position.x-9)+' '+position.y+' Z'});
    wrapper.appendChild(shape);
    if(index<24){const label=svg('text',{class:'lab-map-label',x:position.x+11,y:position.y-10});label.textContent='ID '+item.id;wrapper.appendChild(label)}
    const announcePoint=()=>announce(labelText);
    wrapper.addEventListener('pointerenter',()=>showTooltip(labelText,shape));
    wrapper.addEventListener('pointerleave',hideTooltip);
    wrapper.addEventListener('focus',()=>showTooltip(labelText,shape));
    wrapper.addEventListener('blur',hideTooltip);
    wrapper.addEventListener('click',announcePoint);wrapper.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();announcePoint()}});group.appendChild(wrapper);
  }

  function renderLegend(){
    if(!legend)return;
    legend.innerHTML='<span class="legend-item" style="color:#7b4bb7"><i class="legend-line"></i><span>原始点位坐标</span></span><span class="legend-item legend-blue"><i class="legend-line"></i><span>先横后竖（单直角）</span></span><span class="legend-item"><span>左下角 (0,0) · X→右 · Y→上</span></span>';
  }

  function renderStatus(detail,entities){
    mapArt.querySelector('.lab-map-status')?.remove();const status=document.createElement('div');status.className='lab-map-status';
    status.textContent=(detail.map?.name||'地图')+' · '+entities.points.length+' 个点位 · 原始坐标不缩放';mapArt.appendChild(status);
  }

  function applyMapImage(imageUrl){
    if(!imageUrl)throw new Error('配置详情未返回地图图片');
    const fullUrl=resolveDashboardAssetUrl(imageUrl,apiBaseUrl);mapArt.style.setProperty('--map-image','url("'+fullUrl.replace(/"/g,'%22')+'")');
  }

  function rightAnglePath(start,end){
    return'M '+start.x+' '+start.y+' H '+end.x+' V '+end.y;
  }

  function renderOrigin(){
    const group=svg('g',{'aria-label':'地图坐标原点：左下角为 0,0；X 向右；Y 向上'}),xAxis=svg('path',{class:'lab-map-origin-line',d:'M 0 '+MAP_COORDINATE_HEIGHT+' H 74'}),yAxis=svg('path',{class:'lab-map-origin-line',d:'M 0 '+MAP_COORDINATE_HEIGHT+' V '+(MAP_COORDINATE_HEIGHT-74)}),xArrow=svg('path',{class:'lab-map-origin-arrow',d:'M 74 '+MAP_COORDINATE_HEIGHT+' l -8 -5 v 10 Z'}),yArrow=svg('path',{class:'lab-map-origin-arrow',d:'M 0 '+(MAP_COORDINATE_HEIGHT-74)+' l -5 8 h 10 Z'}),label=svg('text',{class:'lab-map-origin-label',x:12,y:MAP_COORDINATE_HEIGHT-15}),xLabel=svg('text',{class:'lab-map-axis-label',x:80,y:MAP_COORDINATE_HEIGHT-7}),yLabel=svg('text',{class:'lab-map-axis-label',x:7,y:MAP_COORDINATE_HEIGHT-82});label.textContent='(0,0)';xLabel.textContent='X';yLabel.textContent='Y';group.append(xAxis,yAxis,xArrow,yArrow,label,xLabel,yLabel);routeLayer.appendChild(group);
  }

  function renderDetail(lab,config,detail){
    hideTooltip();clearState();const imageUrl=detail.map?.imageUrl||config.map?.imageUrl;if(imageUrl)applyMapImage(imageUrl);else{mapArt.style.removeProperty('--map-image');mapArt.style.removeProperty('aspect-ratio')}routeLayer.removeAttribute('hidden');if(legend)legend.removeAttribute('hidden');routeLayer.replaceChildren();routeLayer.setAttribute('viewBox','0 0 '+MAP_COORDINATE_WIDTH+' '+MAP_COORDINATE_HEIGHT);routeLayer.setAttribute('preserveAspectRatio','none');routeLayer.setAttribute('aria-label',DEMO_MODE?'四个写死点位的静态演示图层':'后端实验室地图点位图层；左下角为原点；原始坐标不缩放');
    const entities=resolveSpatialEntities(detail),project=createProjector(),positions=entities.points.map(point=>project(point));
    const defs=svg('defs'),marker=svg('marker',{id:'pointSequenceArrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'}),arrow=svg('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:'#27558b'});marker.appendChild(arrow);defs.appendChild(marker);routeLayer.appendChild(defs);
    const linksGroup=svg('g',{'aria-label':'点位按 ID 从小到大的直角箭头路线'});
    renderOrigin();for(let index=0;index<entities.points.length-1;index+=1){const startPoint=entities.points[index],endPoint=entities.points[index+1],path=svg('path',{class:'lab-map-link',d:rightAnglePath(positions[index],positions[index+1]),'marker-end':'url(#pointSequenceArrow)','aria-label':'点位 ID '+startPoint.id+' → ID '+endPoint.id+' · 先横后竖'});linksGroup.appendChild(path)}routeLayer.appendChild(linksGroup);
    const markers=svg('g',{'aria-label':'按 ID 升序排列的点位'});entities.points.forEach((item,index)=>addInteractiveNode(markers,item,positions[index],index));routeLayer.appendChild(markers);renderLegend();renderStatus(detail,entities);
    if(taskTitle)taskTitle.textContent='地图：'+(detail.map?.name||config.map?.name||'-');
    if(taskMeta)taskMeta.textContent=(lab.name||detail.labName||'实验室')+' · 配置 #'+detail.id+' · '+detail.status+' · '+entities.points.length+' 个点位 · 左下角 (0,0) · X→右 · Y→上 · 原始坐标 · 先横后竖';
    const oldAction=mapArt.querySelector('.map-action');if(oldAction)oldAction.hidden=true;
  }

  async function load(){
    if(DEMO_MODE){currentLab=DEMO_LAB;currentConfig=DEMO_CONFIG;currentDetail=DEMO_DETAIL;renderDetail(DEMO_LAB,DEMO_CONFIG,DEMO_DETAIL);return}
    showState('正在加载唯一实验室和地图点位…',false);
    try{
      const labResult=await getLaboratory({baseUrl:apiBaseUrl,timeout:30000}),lab=labResult.data;if(!lab)throw new Error('未找到唯一实验室');
      const config=lab.published||lab.draft,configId=configIdOf(config);if(!configId)throw new Error('唯一实验室暂无可用 configId');
      const detailResult=await getLaboratoryConfig(configId,{baseUrl:apiBaseUrl,timeout:30000}),detail=detailResult.data;if(!detail)throw new Error('配置详情为空');
      currentLab=lab;currentConfig=config;currentDetail=detail;renderDetail(lab,config,detail);
    }catch(error){console.error('加载运行总览实验室地图失败',error);showState('地图加载失败：'+error.message,true);if(taskMeta)taskMeta.textContent='请检查唯一实验室和配置详情接口'}
  }

  window.__dashboardLabMapApi={mode:DEMO_MODE?'demo':'api',reload:load,get lab(){return currentLab},get config(){return currentConfig},get detail(){return currentDetail},renderDetail};
  load();
})();
