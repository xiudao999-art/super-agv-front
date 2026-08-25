(function(){
  'use strict';

  const DIRECT_API_BASE_URL='http://192.168.20.187:8081';
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
  const apiUrl=path=>(apiBaseUrl?apiBaseUrl.replace(/\/$/,''):'')+path;
  const mapArt=document.querySelector('.map-art');
  const routeLayer=mapArt?.querySelector('.route-layer');
  const legend=mapArt?.querySelector('.map-legend');
  const taskTitle=document.querySelector('.task-title');
  const taskMeta=document.querySelector('.task-meta');
  if(!mapArt||!routeLayer)return;

  const SVG_NS='http://www.w3.org/2000/svg';
  const style=document.createElement('style');
  style.textContent='.map-art.lab-map-loading{background-image:none!important}.lab-map-loading:before,.lab-map-error:before{content:attr(data-map-state);position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:28px;color:#69737d;background:#f7f9fa;font-size:13px;text-align:center}.lab-map-error:before{color:#e1473f;background:#fff8f7}.lab-map-node{cursor:pointer;pointer-events:all;vector-effect:non-scaling-stroke;filter:drop-shadow(0 2px 3px rgba(12,29,47,.22))}.lab-map-node:hover,.lab-map-node:focus{filter:drop-shadow(0 0 5px rgba(33,130,209,.6));outline:0}.lab-map-link{fill:none;stroke:#27558b;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;opacity:.9}.lab-map-label{fill:#102133;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round;font-size:13px;font-weight:700;pointer-events:none}.lab-map-point{fill:#7b4bb7;stroke:#fff;stroke-width:2.2}.lab-map-origin-line{fill:none;stroke:#566574;stroke-width:1.6;vector-effect:non-scaling-stroke}.lab-map-origin-label{fill:#354454;paint-order:stroke;stroke:#fff;stroke-width:4px;font-size:12px;font-weight:700}.lab-map-status{position:absolute;left:10px;bottom:10px;z-index:2;max-width:calc(100% - 20px);padding:7px 10px;border:1px solid rgba(12,29,47,.09);border-radius:7px;color:#354454;background:rgba(255,255,255,.92);font-size:10px;line-height:1.45;backdrop-filter:blur(5px)}';
  document.head.appendChild(style);

  let currentLab=null,currentConfig=null,currentDetail=null;

  async function parseApiResponse(response){const text=await response.text();if(!text)return{};try{return JSON.parse(text)}catch(error){return{message:text}}}
  function checkApiResult(response,result){if(!response.ok)throw new Error(result.message||('HTTP '+response.status));if(typeof result.code==='number'&&![0,200,201].includes(result.code))throw new Error(result.message||('业务错误 '+result.code))}
  async function request(path){const response=await fetch(apiUrl(path),{headers:{Accept:'application/json'}}),result=await parseApiResponse(response);checkApiResult(response,result);return result}
  function configIdOf(config){return config?.configId??config?.id??null}
  function finite(value){const number=Number(value);return Number.isFinite(number)?number:null}
  function svg(tag,attributes){const node=document.createElementNS(SVG_NS,tag);Object.entries(attributes||{}).forEach(([name,value])=>node.setAttribute(name,String(value)));return node}

  function showState(message,error){mapArt.dataset.mapState=message;mapArt.classList.toggle('lab-map-error',Boolean(error));mapArt.classList.toggle('lab-map-loading',!error)}
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
    const width=1024,height=551,clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    return item=>({x:clamp(item.x,0,width),y:height-clamp(item.y,0,height)});
  }

  function pointLabel(item){
    return('点位 ID '+item.id+' · '+(item.name||item.code||item.id)+' · X '+item.x+' / Y '+item.y+(item.coordinateNote?' · '+item.coordinateNote:''));
  }

  function addInteractiveNode(group,item,position,index){
    const wrapper=svg('g',{class:'lab-map-node',tabindex:'0',role:'button','aria-label':pointLabel(item),'data-map-label':pointLabel(item)}),shape=svg('path',{class:'lab-map-point',d:'M '+position.x+' '+(position.y-9)+' L '+(position.x+9)+' '+position.y+' L '+position.x+' '+(position.y+9)+' L '+(position.x-9)+' '+position.y+' Z'});
    const title=svg('title');title.textContent=pointLabel(item);wrapper.append(title,shape);
    if(index<24){const label=svg('text',{class:'lab-map-label',x:position.x+11,y:position.y-10});label.textContent='ID '+item.id;wrapper.appendChild(label)}
    const announcePoint=()=>announce(pointLabel(item));wrapper.addEventListener('click',announcePoint);wrapper.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();announcePoint()}});group.appendChild(wrapper);
  }

  function renderLegend(){
    if(!legend)return;
    legend.innerHTML='<span class="legend-item" style="color:#7b4bb7"><i class="legend-line"></i><span>点位</span></span><span class="legend-item legend-blue"><i class="legend-line"></i><span>先横后竖</span></span><span class="legend-item"><span>左下角 (0,0)</span></span>';
  }

  function renderStatus(detail,entities){
    mapArt.querySelector('.lab-map-status')?.remove();const status=document.createElement('div');status.className='lab-map-status';
    status.textContent=(detail.map?.name||'实验室地图')+' · '+entities.points.length+' 个点位 · 左下角为 (0,0) · 先横后竖';mapArt.appendChild(status);
  }

  function applyMapImage(imageUrl){
    if(!imageUrl)throw new Error('配置详情未返回地图图片');
    const fullUrl=apiUrl(imageUrl);mapArt.style.setProperty('--map-image','url("'+fullUrl.replace(/"/g,'%22')+'")');
    const image=new Image();image.onload=()=>{if(image.naturalWidth&&image.naturalHeight)mapArt.style.aspectRatio=image.naturalWidth+' / '+image.naturalHeight};image.src=fullUrl;
  }

  function rightAnglePath(start,end){
    const verticalDirection=end.y>=start.y?1:-1,arrowEndY=end.y-verticalDirection*13;
    return'M '+start.x+' '+start.y+' H '+end.x+' V '+arrowEndY;
  }

  function renderOrigin(){
    const group=svg('g',{'aria-label':'地图坐标原点，左下角 0 0'}),xAxis=svg('path',{class:'lab-map-origin-line',d:'M 0 551 H 74'}),yAxis=svg('path',{class:'lab-map-origin-line',d:'M 0 551 V 477'}),label=svg('text',{class:'lab-map-origin-label',x:12,y:531});label.textContent='(0,0)';group.append(xAxis,yAxis,label);routeLayer.appendChild(group);
  }

  function renderDetail(lab,config,detail){
    clearState();const imageUrl=detail.map?.imageUrl||config.map?.imageUrl;if(imageUrl)applyMapImage(imageUrl);else{mapArt.style.removeProperty('--map-image');mapArt.style.removeProperty('aspect-ratio')}routeLayer.replaceChildren();routeLayer.setAttribute('viewBox','0 0 1024 551');routeLayer.setAttribute('preserveAspectRatio','none');routeLayer.setAttribute('aria-label',DEMO_MODE?'四个写死点位的静态演示图层':'后端实验室地图点位图层');
    const title=svg('title');title.textContent=(lab.name||detail.labName||'实验室')+' 地图与点位';routeLayer.appendChild(title);
    const entities=resolveSpatialEntities(detail),project=createProjector(),positions=entities.points.map(point=>project(point));
    const defs=svg('defs'),marker=svg('marker',{id:'pointSequenceArrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'}),arrow=svg('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:'#27558b'});marker.appendChild(arrow);defs.appendChild(marker);routeLayer.appendChild(defs);
    const linksGroup=svg('g',{'aria-label':'点位按 ID 从小到大的直角箭头路线'});
    renderOrigin();for(let index=0;index<entities.points.length-1;index+=1){const startPoint=entities.points[index],endPoint=entities.points[index+1],path=svg('path',{class:'lab-map-link',d:rightAnglePath(positions[index],positions[index+1]),'marker-end':'url(#pointSequenceArrow)'}),pathTitle=svg('title');pathTitle.textContent='点位 ID '+startPoint.id+' → ID '+endPoint.id+' · 先横后竖';path.appendChild(pathTitle);linksGroup.appendChild(path)}routeLayer.appendChild(linksGroup);
    const markers=svg('g',{'aria-label':'按 ID 升序排列的机台点位'});entities.points.forEach((item,index)=>addInteractiveNode(markers,item,positions[index],index));routeLayer.appendChild(markers);renderLegend();renderStatus(detail,entities);
    if(taskTitle)taskTitle.textContent='实验室地图：'+(detail.map?.name||config.map?.name||'-');
    if(taskMeta)taskMeta.textContent=(lab.name||detail.labName||'实验室')+' · 配置 #'+detail.id+' · '+detail.status+' · '+entities.points.length+' 个点位 · 左下角 (0,0) · 先横后竖';
    const oldAction=mapArt.querySelector('.map-action');if(oldAction)oldAction.hidden=true;
  }

  async function load(){
    if(DEMO_MODE){currentLab=DEMO_LAB;currentConfig=DEMO_CONFIG;currentDetail=DEMO_DETAIL;renderDetail(DEMO_LAB,DEMO_CONFIG,DEMO_DETAIL);return}
    showState('正在加载唯一实验室和地图点位…',false);
    try{
      const labResult=await request('/api/lab'),lab=labResult.data;if(!lab)throw new Error('未找到唯一实验室');
      const config=lab.published||lab.draft,configId=configIdOf(config);if(!configId)throw new Error('唯一实验室暂无可用 configId');
      const detailResult=await request('/api/lab-configs/'+encodeURIComponent(configId)),detail=detailResult.data;if(!detail)throw new Error('配置详情为空');
      currentLab=lab;currentConfig=config;currentDetail=detail;renderDetail(lab,config,detail);
    }catch(error){console.error('加载运行总览实验室地图失败',error);showState('地图加载失败：'+error.message,true);if(taskMeta)taskMeta.textContent='请检查唯一实验室和配置详情接口'}
  }

  window.__dashboardLabMapApi={mode:DEMO_MODE?'demo':'api',reload:load,get lab(){return currentLab},get config(){return currentConfig},get detail(){return currentDetail},renderDetail};
  load();
})();
