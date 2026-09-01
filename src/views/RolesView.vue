<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'

const storageKey='agv.system.roles.reference.v2'
const allPermissions=['dashboard','orders','storage','robots','map','stations','peripheral','charging','process','anomaly','logs','capacity','user-management','role-view','role-edit','user-assign']
const initialRoles=[
  { key:'admin',name:'系统管理员',code:'SUPER_ADMIN',description:'拥有系统全部功能及管理权限',avatar:'管',color:'navy',users:2,permissions:[...allPermissions],enabled:true },
  { key:'dispatcher',name:'调度管理员',code:'DISPATCHER',description:'可管理订单、流程及现场调度',avatar:'调',color:'blue',users:4,permissions:['dashboard','orders','storage','robots','map','stations','peripheral','charging','process','anomaly','capacity'],enabled:true },
  { key:'operator',name:'运维工程师',code:'OPERATOR',description:'负责异常处理、设备维护和日志排查',avatar:'运',color:'cyan',users:5,permissions:['dashboard','robots','map','stations','peripheral','charging','anomaly','logs','capacity'],enabled:true },
  { key:'viewer',name:'只读访客',code:'VIEWER',description:'仅可查看运行数据和基础配置',avatar:'访',color:'gray',users:1,permissions:['dashboard','orders','storage','robots','map','stations','peripheral','charging','process','capacity','role-view'],enabled:true },
]
const permissionGroups=[
  {title:'运行调度',description:'现场任务与资源调度',icon:'dashboard',items:[['dashboard','运行总览'],['orders','订单管理'],['storage','库位与载具']]},
  {title:'配置中心',description:'实验室与流程基础配置',icon:'map',items:[['robots','机器人与设备'],['map','地图信息'],['stations','机台与点位'],['peripheral','外围资源'],['charging','充电桩与电池配置'],['process','流程与动作']]},
  {title:'运维与数据',description:'异常、日志及产能数据',icon:'shield',items:[['anomaly','异常与恢复'],['logs','系统日志'],['capacity','AGV产能']]},
  {title:'系统管理',description:'角色与用户安全配置',icon:'users',items:[['user-management','用户管理'],['role-view','查看角色'],['role-edit','编辑权限'],['user-assign','分配用户']]},
]

function loadRoles(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');return Array.isArray(value)&&value.length?value:structuredClone(initialRoles)}catch{return structuredClone(initialRoles)}}
const roles=ref(loadRoles())
const activeKey=ref(roles.value.some(item=>item.key==='dispatcher')?'dispatcher':roles.value[0]?.key)
const keyword=ref('')
const draftPermissions=ref([])
const modalVisible=ref(false)
const toastText=ref('')
const newRole=reactive({name:'',code:'',description:''})
let toastTimer

const filteredRoles=computed(()=>{const value=keyword.value.trim().toLowerCase();return roles.value.filter(item=>!value||`${item.name} ${item.code}`.toLowerCase().includes(value))})
const activeRole=computed(()=>roles.value.find(item=>item.key===activeKey.value)||roles.value[0])
const activeCount=computed(()=>roles.value.filter(item=>item.enabled).length)
const assignedUsers=computed(()=>roles.value.reduce((sum,item)=>sum+Number(item.users||0),0))
const checkedCount=computed(()=>draftPermissions.value.length)
const allChecked=computed(()=>checkedCount.value===allPermissions.length)
const indeterminate=computed(()=>checkedCount.value>0&&checkedCount.value<allPermissions.length)

function persist(){try{localStorage.setItem(storageKey,JSON.stringify(roles.value))}catch{/* 当前会话状态仍然有效 */}}
function toast(message){toastText.value=message;clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>{toastText.value=''},2200)}
function selectRole(key){activeKey.value=key}
function toggleAll(event){draftPermissions.value=event.target.checked?[...allPermissions]:[]}
function savePermissions(){activeRole.value.permissions=[...draftPermissions.value];persist();toast(`${activeRole.value.name}的权限已保存`)}
function resetPermissions(){draftPermissions.value=[...activeRole.value.permissions];toast('已恢复到上次保存状态')}
function toggleStatus(event){activeRole.value.enabled=event.target.checked;persist();toast(event.target.checked?'角色已启用':'角色已停用')}
function openModal(){Object.assign(newRole,{name:'',code:'',description:''});modalVisible.value=true;nextTick(()=>document.querySelector('.roles-reference-page .role-modal input')?.focus())}
function closeModal(){modalVisible.value=false}
function addRole(){const name=newRole.name.trim();const code=newRole.code.trim().toUpperCase();if(!name||!code)return;if(roles.value.some(item=>item.code===code)){toast('角色编码已存在');return}const role={key:`custom-${Date.now()}`,name,code,description:newRole.description.trim()||'暂未填写角色说明',avatar:name.slice(0,1),color:'blue',users:0,permissions:[],enabled:true};roles.value.push(role);persist();activeKey.value=role.key;closeModal();toast('角色已创建，可继续配置权限')}
function onKeydown(event){if(event.key==='Escape'&&modalVisible.value)closeModal()}

watch(activeRole,role=>{if(role)draftPermissions.value=[...role.permissions]},{immediate:true})
watch(modalVisible,value=>{document.body.style.overflow=value?'hidden':''})
window.addEventListener('keydown',onKeydown)
onBeforeUnmount(()=>{clearTimeout(toastTimer);window.removeEventListener('keydown',onKeydown);document.body.style.overflow=''})
</script>

<template>
  <div class="page-view roles-reference-page">
    <PageHeader class="page-head" title="角色权限管理" description="维护系统角色及菜单、页面和操作权限">
      <button class="primary-btn" type="button" @click="openModal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>新建角色</span></button>
    </PageHeader>
    <main class="page-canvas role-page">
      <section class="role-summary" aria-label="角色统计">
        <article><span class="summary-icon blue"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5"/></svg></span><div><strong>{{ roles.length }}</strong><span>角色总数</span></div></article>
        <article><span class="summary-icon cyan"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg></span><div><strong>{{ assignedUsers }}</strong><span>已分配用户</span></div></article>
        <article><span class="summary-icon green"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><div><strong>{{ activeCount }}</strong><span>启用角色</span></div></article>
        <article><span class="summary-icon orange"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6l-8-3Z"/></svg></span><div><strong>15</strong><span>权限项</span></div></article>
      </section>

      <section class="permission-workspace">
        <aside class="roles-panel"><header class="panel-heading"><div><h2>角色列表</h2><p>选择角色后配置对应权限</p></div><span class="count-badge">{{ roles.length }} 个角色</span></header><label class="role-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input v-model="keyword" placeholder="搜索角色名称或编码"></label><div class="role-list">
          <button v-for="role in filteredRoles" :key="role.key" :class="['role-item',{active:activeKey===role.key}]" type="button" @click="selectRole(role.key)"><span :class="['role-avatar',role.color]">{{ role.avatar }}</span><span class="role-copy"><strong>{{ role.name }}</strong><small>{{ role.code }} · {{ role.users }} 名用户</small></span><span :class="['role-state',{disabled:!role.enabled}]">{{ role.enabled?'启用':'停用' }}</span></button>
        </div></aside>

        <section v-if="activeRole" class="permission-panel"><header class="permission-heading"><div class="role-title"><span :class="['role-avatar',activeRole.color]">{{ activeRole.avatar }}</span><div><h2>{{ activeRole.name }}</h2><p>{{ activeRole.code }} · {{ activeRole.description }}</p></div></div><label class="status-switch"><span>角色状态</span><input :checked="activeRole.enabled" type="checkbox" @change="toggleStatus"><i aria-hidden="true"/><b>{{ activeRole.enabled?'已启用':'已停用' }}</b></label></header>
          <div class="permission-toolbar"><div><h3>功能权限</h3><p>勾选该角色可以访问和操作的功能模块</p></div><label class="check-all"><input :checked="allChecked" :indeterminate.prop="indeterminate" type="checkbox" @change="toggleAll"><span>全选</span></label></div>
          <div class="permission-groups"><section v-for="group in permissionGroups" :key="group.title" class="permission-group"><header><span class="group-icon">
            <svg v-if="group.icon==='dashboard'" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
            <svg v-else-if="group.icon==='map'" viewBox="0 0 24 24"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/></svg>
            <svg v-else-if="group.icon==='shield'" viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6l-8-3Z"/><path d="M12 8v4M12 16h.01"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5"/></svg>
          </span><div><h4>{{ group.title }}</h4><p>{{ group.description }}</p></div></header><div class="permission-options"><label v-for="item in group.items" :key="item[0]"><input v-model="draftPermissions" type="checkbox" :value="item[0]"><span>{{ item[1] }}</span></label></div></section></div>
          <footer class="permission-actions"><span>已选择 {{ checkedCount }} / {{ allPermissions.length }} 项权限</span><div><button class="secondary-btn" type="button" @click="resetPermissions">重置</button><button class="primary-btn save-btn" type="button" @click="savePermissions">保存权限</button></div></footer>
        </section>
      </section>
    </main>

    <div v-if="modalVisible" class="modal-overlay role-modal open" @click.self="closeModal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="roleModalTitle"><div class="modal-title-row"><div><h2 id="roleModalTitle">新建角色</h2><p>创建后可继续配置菜单及操作权限</p></div><button class="modal-x" type="button" aria-label="关闭" @click="closeModal">×</button></div><form class="form-grid" @submit.prevent="addRole"><label class="form-field"><span>角色名称</span><input v-model="newRole.name" placeholder="例如：产线负责人" required></label><label class="form-field"><span>角色编码</span><input v-model="newRole.code" placeholder="例如：LINE_MANAGER" required></label><label class="form-field wide"><span>角色说明</span><textarea v-model="newRole.description" placeholder="填写该角色的职责范围"/></label><div class="modal-actions wide"><button class="modal-close" type="button" @click="closeModal">取消</button><button class="modal-primary" type="submit">创建角色</button></div></form></section></div>
    <div :class="['toast',{show:toastText}]" role="status" aria-live="polite">{{ toastText }}</div>
  </div>
</template>

<style scoped>
.primary-btn {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 1px solid var(--agv-blue);
  border-radius: 7px;
  color: #fff;
  background: var(--agv-blue);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.primary-btn:hover { border-color: var(--agv-blue-hover); background: var(--agv-blue-hover); }
.primary-btn svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }

.role-page { min-height: calc(100vh - 148px); }

.role-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.role-summary article {
  min-height: 88px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--agv-line-soft);
  border-radius: 10px;
  background: #fff;
}

.summary-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
}

.summary-icon svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.summary-icon.blue { color: #1677c8; background: #eaf4fd; }
.summary-icon.cyan { color: #078fb7; background: #e9f8fb; }
.summary-icon.green { color: #1f9d63; background: #ecf8f2; }
.summary-icon.orange { color: #d96522; background: #fff3eb; }
.role-summary strong { display: block; margin-bottom: 4px; color: var(--agv-ink); font-size: 22px; line-height: 1; }
.role-summary article > div > span { color: var(--agv-text-muted); font-size: 12px; }

.permission-workspace {
  min-height: 590px;
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--agv-line-soft);
  border-radius: 11px;
  background: #fff;
}

.roles-panel { min-width: 0; padding: 20px 16px; border-right: 1px solid var(--agv-line-soft); background: #fbfcfd; }
.panel-heading,
.permission-heading,
.permission-toolbar,
.permission-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.panel-heading h2,
.permission-heading h2,
.permission-toolbar h3 { margin: 0; color: var(--agv-ink); }
.panel-heading h2,
.permission-heading h2 { font-size: 16px; }
.panel-heading p,
.permission-heading p,
.permission-toolbar p { margin: 5px 0 0; color: var(--agv-text-muted); font-size: 11px; line-height: 1.45; }
.count-badge { flex: 0 0 auto; padding: 4px 9px; border-radius: 999px; color: var(--agv-blue); background: var(--agv-blue-soft); font-size: 11px; font-weight: 650; }

.role-search {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 17px 0 13px;
  padding: 0 11px;
  border: 1px solid var(--agv-line);
  border-radius: 7px;
  background: #fff;
}

.role-search:focus-within { border-color: var(--agv-blue); box-shadow: 0 0 0 2px rgba(22, 119, 200, .08); }
.role-search svg { width: 17px; height: 17px; flex: 0 0 auto; fill: none; stroke: #8a96a2; stroke-width: 1.8; stroke-linecap: round; }
.role-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; font-size: 12px; }
.role-search input::placeholder { color: #a5afb8; }

.role-list { display: grid; gap: 7px; }
.role-item {
  width: 100%;
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: .15s ease;
}

.role-item:hover { background: #f1f6fa; }
.role-item.active { border-color: #b9d9f1; background: #eaf4fd; box-shadow: 0 2px 8px rgba(22, 119, 200, .06); }
.role-avatar { width: 38px; height: 38px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 750; }
.role-avatar.navy { background: #234b70; }
.role-avatar.blue { background: #1677c8; }
.role-avatar.cyan { background: #078fb7; }
.role-avatar.gray { background: #778693; }
.role-copy { min-width: 0; flex: 1; }
.role-copy strong { display: block; overflow: hidden; color: var(--agv-ink); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.role-copy small { display: block; overflow: hidden; margin-top: 5px; color: var(--agv-text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.role-state { flex: 0 0 auto; padding: 3px 7px; border-radius: 999px; color: #1f8f5e; background: #eaf8f1; font-size: 10px; }

.permission-panel { min-width: 0; display: flex; flex-direction: column; }
.permission-heading { min-height: 82px; padding: 16px 20px; border-bottom: 1px solid var(--agv-line-soft); }
.role-title { min-width: 0; display: flex; align-items: center; gap: 12px; }
.role-title .role-avatar { width: 42px; height: 42px; }
.role-title > div { min-width: 0; }

.status-switch { display: flex; align-items: center; gap: 8px; color: var(--agv-text-secondary); font-size: 11px; cursor: pointer; }
.status-switch input { position: absolute; opacity: 0; pointer-events: none; }
.status-switch i { position: relative; width: 34px; height: 19px; border-radius: 999px; background: #b8c1c9; transition: background .15s ease; }
.status-switch i::after { position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.16); content: ""; transition: transform .15s ease; }
.status-switch input:checked + i { background: var(--agv-blue); }
.status-switch input:checked + i::after { transform: translateX(15px); }
.status-switch b { min-width: 36px; color: var(--agv-text-secondary); font-size: 11px; font-weight: 500; }

.permission-toolbar { padding: 18px 20px 12px; }
.permission-toolbar h3 { font-size: 14px; }
.check-all,
.permission-options label { display: flex; align-items: center; gap: 8px; color: var(--agv-text-secondary); font-size: 12px; cursor: pointer; }
.check-all input,
.permission-options input { width: 16px; height: 16px; margin: 0; accent-color: var(--agv-blue); }

.permission-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 20px 20px;
}

.permission-group { min-width: 0; padding: 14px; border: 1px solid var(--agv-line-soft); border-radius: 9px; background: #fff; }
.permission-group > header { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid #eef1f3; }
.group-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 8px; color: var(--agv-blue); background: var(--agv-blue-soft); }
.group-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.permission-group h4 { margin: 0; color: var(--agv-ink); font-size: 13px; }
.permission-group header p { margin: 3px 0 0; color: var(--agv-text-muted); font-size: 10px; }
.permission-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px 8px; padding-top: 13px; }
.permission-options label:hover { color: var(--agv-blue); }

.permission-actions { min-height: 66px; margin-top: auto; padding: 12px 20px; border-top: 1px solid var(--agv-line-soft); background: #fbfcfd; }
.permission-actions > span { color: var(--agv-text-muted); font-size: 11px; }
.permission-actions > div { display: flex; gap: 8px; }
.secondary-btn { min-height: 36px; padding: 0 15px; border: 1px solid var(--agv-line); border-radius: 7px; color: var(--agv-ink); background: #fff; font-size: 13px; cursor: pointer; }
.secondary-btn:hover { border-color: var(--agv-blue); color: var(--agv-blue); }
.save-btn { min-width: 92px; }

.role-modal .modal-card { width: min(600px, calc(100vw - 32px)); background: #fff; }
.modal-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.role-modal .modal-title-row h2 { margin: 0 0 4px; }
.modal-title-row p { margin: 0; color: var(--agv-text-muted); font-size: 12px; }
.modal-x { width: 30px; height: 30px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 6px; color: #7b8792; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; }
.modal-x:hover { color: var(--agv-ink); background: #f1f3f5; }
.role-modal .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 16px; }
.role-modal .form-field { min-width: 0; display: grid; gap: 8px; }
.role-modal .form-field > span { color: var(--agv-ink); font-size: 13px; font-weight: 500; line-height: 20px; }
.role-modal .form-field input,
.role-modal .form-field textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--agv-line); border-radius: 7px; outline: 0; color: var(--agv-ink); background: #fff; font-size: 13px; }
.role-modal .form-field input { min-height: 40px; padding: 0 12px; }
.role-modal .form-field textarea { min-height: 92px; padding: 10px 12px; resize: vertical; line-height: 1.6; }
.role-modal .form-field input::placeholder,
.role-modal .form-field textarea::placeholder { color: #a5afb8; }
.role-modal .form-field input:focus,
.role-modal .form-field textarea:focus { border-color: var(--agv-blue); box-shadow: 0 0 0 2px rgba(22, 119, 200, .1); }
.role-modal .wide { grid-column: 1 / -1; }
.role-modal .modal-actions { margin-top: 2px; padding-top: 18px; }
.role-modal .modal-card .form-grid { gap: 18px 16px; }
.role-modal .modal-card .form-field > span { font-size: 13px; font-weight: 500; }
.role-modal .modal-card .form-field input { min-height: 40px; font-size: 13px; }
.role-modal .modal-card .form-field textarea { min-height: 92px; font-size: 13px; }

.toast { position: fixed; left: 50%; bottom: 24px; z-index: 90; padding: 11px 16px; border-radius: 8px; color: #fff; background: rgba(12,29,47,.92); font-size: 13px; opacity: 0; pointer-events: none; transform: translate(-50%,20px); transition: .22s ease; }
.toast.show { opacity: 1; transform: translate(-50%,0); }

@media (max-width: 1100px) {
  .role-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .permission-workspace { grid-template-columns: 290px minmax(0, 1fr); }
  .permission-groups { grid-template-columns: 1fr; }
}

@media (max-width: 800px) {
  .permission-workspace { display: block; overflow: visible; }
  .roles-panel { border-right: 0; border-bottom: 1px solid var(--agv-line-soft); }
  .role-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .role-summary { grid-template-columns: 1fr 1fr; gap: 8px; }
  .role-summary article { min-height: 72px; padding: 11px; }
  .summary-icon { width: 36px; height: 36px; }
  .role-list { grid-template-columns: 1fr; }
  .permission-heading { align-items: flex-start; flex-direction: column; }
  .permission-options { grid-template-columns: 1fr; }
  .permission-actions { align-items: flex-start; flex-direction: column; }
  .permission-actions > div { width: 100%; }
  .permission-actions button { flex: 1; }
  .page-head .primary-btn { width: 36px; padding: 0; }
  .page-head .primary-btn span { display: none; }
  .role-modal .modal-card { padding: 20px 16px; }
  .role-modal .form-grid { grid-template-columns: 1fr; }
  .role-modal .wide { grid-column: auto; }
  .role-modal .modal-actions { margin-top: 0; }
  .role-modal .modal-actions button { flex: 1; }
}
</style>
<style scoped src="../styles/components.css"></style>
<style scoped>
.roles-reference-page { --agv-control:40px; padding:0; }
.roles-reference-page > .page-head { margin:0; padding:17px 20px; }
.roles-reference-page .page-head .primary-btn { flex:0 0 auto; }
.roles-reference-page > .page-canvas { padding:20px; }
.roles-reference-page .permission-groups { margin-top:0; }
.roles-reference-page .permission-group { display:block; gap:normal; }
.roles-reference-page .role-list > .role-item { justify-content:flex-start;margin-top:0; }
.roles-reference-page .role-item .role-avatar { display:grid;gap:normal; }
.roles-reference-page .role-item .role-copy { display:block;gap:normal; }
.roles-reference-page .role-item .role-state { display:inline-flex;align-items:center;gap:normal; }
.role-item .role-state.disabled { color:#7b8792;background:#f1f3f5; }
@media (max-width:760px) {
  .roles-reference-page > .page-head { min-height:auto;align-items:flex-start;flex-direction:row;padding:14px 12px; }
  .roles-reference-page > .page-head :deep(h1) { margin:0 0 8px;font-size:19px;line-height:1.3; }
  .roles-reference-page > .page-head :deep(p) { margin:0;font-size:12px;line-height:1.55; }
  .roles-reference-page > .page-head :deep(.page-header__actions) { width:auto;flex:0 0 auto; }
  .roles-reference-page > .page-canvas { padding:12px; }
}
</style>
