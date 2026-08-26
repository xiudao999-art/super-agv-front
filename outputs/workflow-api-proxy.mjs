import http from 'node:http';
import {createReadStream, stat} from 'node:fs';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const HOST='0.0.0.0';
const PORT=4173;
const BACKEND_HOST ='192.168.20.40';
const BACKEND_PORT = 8081;
const ROOT=fileURLToPath(new URL('.',import.meta.url));
const MIME_TYPES={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml'
};

function proxyApi(request,response){
  const upstream=http.request({
    hostname:BACKEND_HOST,
    port:BACKEND_PORT,
    path:request.url,
    method:request.method,
    headers:{...request.headers,host:BACKEND_HOST+':'+BACKEND_PORT,origin:'http://'+BACKEND_HOST+':'+BACKEND_PORT}
  },upstreamResponse=>{
    response.writeHead(upstreamResponse.statusCode||502,upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error',error=>{
    if(response.headersSent)return response.destroy(error);
    response.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});
    response.end(JSON.stringify({code:502,message:'无法连接后端：'+error.message}));
  });
  request.pipe(upstream);
}

function serveFile(request,response){
  const url=new URL(request.url,'http://'+request.headers.host);
  if(url.pathname==='/'){
    response.writeHead(302,{Location:'/process-template-editor.html'});
    response.end();
    return;
  }
  let pathname;
  try{pathname=decodeURIComponent(url.pathname)}catch(error){response.writeHead(400);response.end('Bad Request');return}
  const filePath=resolve(ROOT,'.'+pathname);
  if(filePath!==ROOT&&!filePath.startsWith(ROOT.endsWith(sep)?ROOT:ROOT+sep)){
    response.writeHead(403);response.end('Forbidden');return;
  }
  stat(filePath,(error,fileStat)=>{
    if(error||!fileStat.isFile()){
      response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('Not Found');return;
    }
    response.writeHead(200,{'Content-Type':MIME_TYPES[extname(filePath).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    createReadStream(filePath).pipe(response);
  });
}

const server=http.createServer((request,response)=>{
  if(request.url?.startsWith('/api/')||request.url?.startsWith('/files/')||request.url?.startsWith('/carriers')||request.url?.startsWith('/carrierTypes')||request.url?.startsWith('/locations')||request.url?.startsWith('/locationTypes'))return proxyApi(request,response);
  serveFile(request,response);
});

server.listen(PORT,HOST,()=>{
  console.log('流程编辑器已启动：http://'+HOST+':'+PORT+'/process-template-editor.html');
  console.log('后端代理：http://'+BACKEND_HOST+':'+BACKEND_PORT);
});
