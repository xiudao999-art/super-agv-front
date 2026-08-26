(function(){
  'use strict';

  const users=[
    {account:'chen.gong',name:'陈工',department:'现场实施',role:'调度管理员',source:'本地账号',status:'启用',login:'2026-08-26 18:42'},
    {account:'wang.gong',name:'王工',department:'现场实施',role:'调度管理员',source:'本地账号',status:'启用',login:'2026-08-26 17:36'},
    {account:'li.gong',name:'李工',department:'机器人技术',role:'运维工程师',source:'LDAP',status:'启用',login:'2026-08-26 16:18'},
    {account:'admin',name:'系统管理员',department:'系统管理',role:'系统管理员',source:'本地账号',status:'启用',login:'2026-08-26 09:12'},
    {account:'manager.view',name:'管理查看账号',department:'管理层',role:'只读访客',source:'本地账号',status:'启用',login:'2026-08-25 17:30'},
    {account:'zhou.operator',name:'周工',department:'生产运营',role:'调度管理员',source:'LDAP',status:'启用',login:'2026-08-25 15:08'},
    {account:'sun.maintenance',name:'孙工',department:'设备维护',role:'运维工程师',source:'本地账号',status:'启用',login:'2026-08-25 11:26'},
    {account:'former.operator',name:'停用操作员',department:'现场实施',role:'只读访客',source:'本地账号',status:'停用',login:'2026-07-28 15:06'}
  ];

  const avatarColors=['blue','cyan','navy','gray'];
  const body=document.getElementById('userBody');
  const keywordInput=document.getElementById('userKeyword');
  const roleFilter=document.getElementById('roleFilter');
  const statusFilter=document.getElementById('statusFilter');
  const toast=document.getElementById('toast');
  let resetAccount='';
  let toastTimer;

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function showToast(message){
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
  }

  function filteredUsers(){
    const keyword=keywordInput.value.trim().toLowerCase();
    return users.filter(user=>{
      const matchesKeyword=!keyword||[user.account,user.name,user.department].some(value=>value.toLowerCase().includes(keyword));
      const matchesRole=!roleFilter.value||user.role===roleFilter.value;
      const matchesStatus=!statusFilter.value||user.status===statusFilter.value;
      return matchesKeyword&&matchesRole&&matchesStatus;
    });
  }

  function updateSummary(){
    const enabled=users.filter(user=>user.status==='启用').length;
    document.getElementById('summaryTotal').textContent=users.length;
    document.getElementById('summaryEnabled').textContent=enabled;
    document.getElementById('summaryDisabled').textContent=users.length-enabled;
  }

  function renderUsers(){
    const list=filteredUsers();
    if(!list.length){
      body.innerHTML='<tr><td class="empty-row" colspan="8">没有符合条件的用户</td></tr>';
    }else{
      body.innerHTML=list.map(user=>{
        const originalIndex=users.indexOf(user);
        const color=avatarColors[originalIndex%avatarColors.length];
        const disabled=user.status==='停用';
        return `<tr data-account="${escapeHtml(user.account)}"><td><div class="user-cell"><span class="user-avatar ${color}">${escapeHtml(user.name.slice(0,1))}</span><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.department)}</small></span></div></td><td>${escapeHtml(user.account)}</td><td>${escapeHtml(user.department)}</td><td><span class="role-chip">${escapeHtml(user.role)}</span></td><td>${escapeHtml(user.source)}</td><td><span class="status-tag ${disabled?'disabled':'enabled'}">${user.status}</span></td><td>${escapeHtml(user.login)}</td><td><div class="row-actions"><button class="row-btn" type="button" data-user-action="edit">编辑</button><button class="row-btn" type="button" data-user-action="reset">重置密码</button><button class="row-btn ${disabled?'enable':'danger'}" type="button" data-user-action="toggle">${disabled?'启用':'停用'}</button></div></td></tr>`;
      }).join('');
    }
    document.getElementById('userTotal').textContent=`共 ${list.length} 条数据`;
    updateSummary();
  }

  function openLayer(id){
    const layer=document.getElementById(id);
    if(!layer)return;
    layer.hidden=false;
    document.body.style.overflow='hidden';
    requestAnimationFrame(()=>layer.classList.add('open'));
  }

  function closeLayer(id){
    const layer=document.getElementById(id);
    if(!layer)return;
    layer.classList.remove('open');
    document.body.style.overflow='';
    setTimeout(()=>layer.hidden=true,180);
  }

  function openUserModal(user){
    document.getElementById('userModalTitle').textContent=user?'编辑用户':'新增用户';
    document.getElementById('editingAccount').value=user?.account||'';
    document.getElementById('accountInput').value=user?.account||'';
    document.getElementById('nameInput').value=user?.name||'';
    document.getElementById('departmentInput').value=user?.department||'';
    document.getElementById('sourceInput').value=user?.source||'本地账号';
    document.getElementById('roleInput').value=user?.role||'调度管理员';
    document.getElementById('statusInput').value=user?.status||'启用';
    openLayer('userModal');
  }

  document.getElementById('addUser').addEventListener('click',()=>openUserModal());
  document.getElementById('searchUsers').addEventListener('click',renderUsers);
  keywordInput.addEventListener('keydown',event=>{if(event.key==='Enter')renderUsers()});
  document.getElementById('resetFilter').addEventListener('click',()=>{
    keywordInput.value='';
    roleFilter.value='';
    statusFilter.value='';
    renderUsers();
  });

  body.addEventListener('click',event=>{
    const button=event.target.closest('[data-user-action]');
    if(!button)return;
    const account=button.closest('tr').dataset.account;
    const user=users.find(item=>item.account===account);
    if(!user)return;
    if(button.dataset.userAction==='edit')openUserModal(user);
    if(button.dataset.userAction==='reset'){
      resetAccount=account;
      document.getElementById('resetPasswordDescription').textContent=`账号 ${account} 将生成新的临时密码`;
      openLayer('resetPasswordModal');
    }
    if(button.dataset.userAction==='toggle'){
      user.status=user.status==='启用'?'停用':'启用';
      renderUsers();
      showToast(`${user.name}的账号已${user.status}`);
    }
  });

  document.getElementById('userForm').addEventListener('submit',event=>{
    event.preventDefault();
    const originalAccount=document.getElementById('editingAccount').value;
    const payload={
      account:document.getElementById('accountInput').value.trim(),
      name:document.getElementById('nameInput').value.trim(),
      department:document.getElementById('departmentInput').value.trim(),
      source:document.getElementById('sourceInput').value,
      role:document.getElementById('roleInput').value,
      status:document.getElementById('statusInput').value,
      login:'尚未登录'
    };
    const existing=users.find(user=>user.account===originalAccount);
    if(existing)Object.assign(existing,payload,{login:existing.login});
    else users.unshift(payload);
    closeLayer('userModal');
    renderUsers();
    showToast(existing?'用户信息已保存':'用户已创建');
  });

  document.getElementById('confirmResetPassword').addEventListener('click',()=>{
    closeLayer('resetPasswordModal');
    showToast(`${resetAccount} 的临时密码已生成：Agv@2026`);
  });

  document.getElementById('statusInfoBtn').addEventListener('click',()=>openLayer('statusModal'));
  document.getElementById('alertInfoBtn').addEventListener('click',()=>openLayer('alertDrawer'));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeLayer(button.dataset.close)));
  document.querySelectorAll('.modal-overlay,.alert-overlay').forEach(layer=>layer.addEventListener('click',event=>{if(event.target===layer)closeLayer(layer.id)}));
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const openLayerElement=[...document.querySelectorAll('.modal-overlay.open,.alert-overlay.open')].pop();
    if(openLayerElement)closeLayer(openLayerElement.id);
  });

  renderUsers();
})();
