(function(){
  'use strict';
  const content=document.querySelector('.content'),head=content?.querySelector('.list-head'),body=content?.querySelector('tbody'),total=content?.querySelector('.total');
  if(!content||!head||!body)return;
  const style=document.createElement('style');style.textContent='.api-scope-note{margin-bottom:16px;padding:12px 14px;border:1px solid #f1dfaa;border-radius:9px;color:#80601b;background:#fffaf0;font-size:12px;line-height:1.55}.api-scope-note strong{display:block;margin-bottom:3px;color:#6c5014}.api-unavailable td{text-align:center;color:var(--muted)}';document.head.appendChild(style);
  const note=document.createElement('div');note.className='api-scope-note';note.innerHTML='<strong>接口范围说明</strong>当前 OpenAPI 文档未定义门、电梯、充电桩等外围资源接口，本页已停用模拟数据和假保存；待补充接口文档后可继续对接。';content.insertBefore(note,head);
  body.innerHTML='<tr class="api-unavailable"><td colspan="7">暂无可用外围资源接口</td></tr>';if(total)total.textContent='共计 0 条数据';
  const oldButton=document.getElementById('addPeripheral');if(oldButton){const button=oldButton.cloneNode(true);button.disabled=true;button.title='当前接口文档未提供外围资源接口';oldButton.replaceWith(button)}
  const params=new URLSearchParams(location.search);if(params.get('configId'))document.querySelectorAll('.tabs a').forEach(link=>{const url=new URL(link.getAttribute('href'),location.href);url.searchParams.set('configId',params.get('configId'));link.setAttribute('href',url.pathname.split('/').pop()+'?'+url.searchParams.toString())});
})();
