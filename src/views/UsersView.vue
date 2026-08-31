<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import PageHeader from '../components/PageHeader.vue'

const storageKey = 'agv.system.users.reference.v2'
const initialUsers = [
  { account:'chen.gong',name:'陈工',department:'现场实施',role:'调度管理员',source:'本地账号',status:'启用',login:'2026-08-26 18:42' },
  { account:'wang.gong',name:'王工',department:'现场实施',role:'调度管理员',source:'本地账号',status:'启用',login:'2026-08-26 17:36' },
  { account:'li.gong',name:'李工',department:'机器人技术',role:'运维工程师',source:'LDAP',status:'启用',login:'2026-08-26 16:18' },
  { account:'admin',name:'系统管理员',department:'系统管理',role:'系统管理员',source:'本地账号',status:'启用',login:'2026-08-26 09:12' },
  { account:'manager.view',name:'管理查看账号',department:'管理层',role:'只读访客',source:'本地账号',status:'启用',login:'2026-08-25 17:30' },
  { account:'zhou.operator',name:'周工',department:'生产运营',role:'调度管理员',source:'LDAP',status:'启用',login:'2026-08-25 15:08' },
  { account:'sun.maintenance',name:'孙工',department:'设备维护',role:'运维工程师',source:'本地账号',status:'启用',login:'2026-08-25 11:26' },
  { account:'former.operator',name:'停用操作员',department:'现场实施',role:'只读访客',source:'本地账号',status:'停用',login:'2026-07-28 15:06' },
]

function loadUsers() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null')
    return Array.isArray(value) && value.length ? value : structuredClone(initialUsers)
  } catch { return structuredClone(initialUsers) }
}

const users = ref(loadUsers())
const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const applied = reactive({ keyword:'',role:'',status:'' })
const userModal = ref(false)
const resetModal = ref(false)
const editingAccount = ref('')
const resetAccount = ref('')
const toastText = ref('')
const form = reactive({ account:'',name:'',department:'',source:'本地账号',role:'调度管理员',status:'启用' })
const avatarColors = ['blue','cyan','navy','gray']
let toastTimer

const rows = computed(() => users.value.filter(user => {
  const value = applied.keyword.toLowerCase()
  const keywordMatched = !value || [user.account,user.name,user.department].some(item => item.toLowerCase().includes(value))
  return keywordMatched && (!applied.role || user.role === applied.role) && (!applied.status || user.status === applied.status)
}))
const enabledCount = computed(() => users.value.filter(item => item.status === '启用').length)

function persist() { try { localStorage.setItem(storageKey,JSON.stringify(users.value)) } catch { /* 当前会话状态仍然有效 */ } }
function toast(message) { toastText.value=message;clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>{toastText.value=''},2200) }
function search() { Object.assign(applied,{keyword:keyword.value.trim(),role:roleFilter.value,status:statusFilter.value}) }
function resetFilters() { keyword.value='';roleFilter.value='';statusFilter.value='';search() }
function closeUserModal() { userModal.value=false }
function closeResetModal() { resetModal.value=false }

function openUserModal(user = null) {
  editingAccount.value = user?.account || ''
  Object.assign(form,user ? { account:user.account,name:user.name,department:user.department,source:user.source,role:user.role,status:user.status } : { account:'',name:'',department:'',source:'本地账号',role:'调度管理员',status:'启用' })
  userModal.value=true
  nextTick(()=>document.querySelector('.users-reference-page .modal-overlay input')?.focus())
}

function saveUser() {
  const account=form.account.trim();const name=form.name.trim();const department=form.department.trim()
  if(!account||!name||!department)return
  const duplicate=users.value.find(item=>item.account===account&&item.account!==editingAccount.value)
  if(duplicate){toast('登录账号已存在');return}
  const existing=users.value.find(item=>item.account===editingAccount.value)
  const payload={ account,name,department,source:form.source,role:form.role,status:form.status,login:'尚未登录' }
  if(existing)Object.assign(existing,payload,{login:existing.login})
  else users.value.unshift(payload)
  persist();closeUserModal();toast(existing?'用户信息已保存':'用户已创建')
}

function openReset(user) { resetAccount.value=user.account;resetModal.value=true }
function confirmReset() { closeResetModal();toast(`${resetAccount.value} 的临时密码已生成：Agv@2026`) }
function toggleUser(user) { user.status=user.status==='启用'?'停用':'启用';persist();toast(`${user.name}的账号已${user.status}`) }
function onKeydown(event) { if(event.key!=='Escape')return;if(resetModal.value)closeResetModal();else if(userModal.value)closeUserModal() }

watch([userModal,resetModal],values=>{document.body.style.overflow=values.some(Boolean)?'hidden':''})
window.addEventListener('keydown',onKeydown)
onBeforeUnmount(()=>{clearTimeout(toastTimer);window.removeEventListener('keydown',onKeydown);document.body.style.overflow=''})
</script>

<template>
  <div class="page-view users-reference-page">
    <PageHeader class="page-head" title="用户管理" description="维护系统用户、所属部门、角色及账号状态">
      <button class="primary-btn" type="button" @click="openUserModal()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>新增用户</span></button>
    </PageHeader>

    <main class="page-canvas user-page">
      <section class="user-summary" aria-label="用户统计">
        <article><span class="summary-icon blue"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5"/></svg></span><div><strong>{{ users.length }}</strong><span>用户总数</span></div></article>
        <article><span class="summary-icon green"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><div><strong>{{ enabledCount }}</strong><span>启用账号</span></div></article>
        <article><span class="summary-icon orange"><svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg></span><div><strong>{{ users.length-enabledCount }}</strong><span>停用账号</span></div></article>
        <article><span class="summary-icon cyan"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg></span><div><strong>4</strong><span>已配置角色</span></div></article>
      </section>

      <section class="user-panel">
        <header class="filter-bar">
          <label class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input v-model="keyword" placeholder="搜索账号、姓名或部门" @keydown.enter="search"></label>
          <label class="filter-field"><span>角色</span><select v-model="roleFilter"><option value="">全部角色</option><option>系统管理员</option><option>调度管理员</option><option>运维工程师</option><option>只读访客</option></select></label>
          <label class="filter-field"><span>状态</span><select v-model="statusFilter"><option value="">全部状态</option><option>启用</option><option>停用</option></select></label>
          <div class="filter-actions"><button class="secondary-btn" type="button" @click="resetFilters">重置</button><button class="primary-btn compact" type="button" @click="search">查询</button></div>
        </header>
        <div class="table-wrap"><table aria-label="用户列表"><thead><tr><th>用户</th><th>账号</th><th>所属部门</th><th>角色</th><th>账号来源</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead><tbody>
          <tr v-for="user in rows" :key="user.account"><td><div class="user-cell"><span :class="['user-avatar',avatarColors[users.indexOf(user)%avatarColors.length]]">{{ user.name.slice(0,1) }}</span><span><strong>{{ user.name }}</strong><small>{{ user.department }}</small></span></div></td><td>{{ user.account }}</td><td>{{ user.department }}</td><td><span class="role-chip">{{ user.role }}</span></td><td>{{ user.source }}</td><td><span :class="['status-tag',user.status==='启用'?'enabled':'disabled']">{{ user.status }}</span></td><td>{{ user.login }}</td><td><div class="row-actions"><button class="row-btn" type="button" @click="openUserModal(user)">编辑</button><button class="row-btn" type="button" @click="openReset(user)">重置密码</button><button :class="['row-btn',user.status==='停用'?'enable':'danger']" type="button" @click="toggleUser(user)">{{ user.status==='停用'?'启用':'停用' }}</button></div></td></tr>
          <tr v-if="!rows.length"><td class="empty-row" colspan="8">没有符合条件的用户</td></tr>
        </tbody></table></div>
        <footer class="table-footer"><span>共 {{ rows.length }} 条数据</span><div class="pagination"><button type="button" disabled>‹</button><button class="active" type="button">1</button><button type="button" disabled>›</button></div></footer>
      </section>
    </main>

    <div v-if="userModal" class="modal-overlay open" @click.self="closeUserModal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="userModalTitle"><div class="modal-title-row"><div><h2 id="userModalTitle">{{ editingAccount?'编辑用户':'新增用户' }}</h2><p>设置用户基本信息、角色及账号状态</p></div><button class="modal-x" type="button" aria-label="关闭" @click="closeUserModal">×</button></div><form class="form-grid" @submit.prevent="saveUser">
      <label class="form-field"><span>登录账号</span><input v-model="form.account" placeholder="请输入登录账号" required></label><label class="form-field"><span>用户姓名</span><input v-model="form.name" placeholder="请输入用户姓名" required></label><label class="form-field"><span>所属部门</span><input v-model="form.department" placeholder="例如：现场实施" required></label><label class="form-field"><span>账号来源</span><select v-model="form.source"><option>本地账号</option><option>LDAP</option></select></label><label class="form-field"><span>分配角色</span><select v-model="form.role"><option>系统管理员</option><option>调度管理员</option><option>运维工程师</option><option>只读访客</option></select></label><label class="form-field"><span>账号状态</span><select v-model="form.status"><option>启用</option><option>停用</option></select></label><div class="modal-actions wide"><button class="modal-close" type="button" @click="closeUserModal">取消</button><button class="modal-primary" type="submit">保存</button></div>
    </form></section></div>

    <div v-if="resetModal" class="modal-overlay open" @click.self="closeResetModal"><section class="modal-card small-modal" role="dialog" aria-modal="true" aria-labelledby="resetPasswordTitle"><div class="modal-title-row"><div><h2 id="resetPasswordTitle">重置密码</h2><p>账号 {{ resetAccount }} 将生成新的临时密码</p></div><button class="modal-x" type="button" aria-label="关闭" @click="closeResetModal">×</button></div><div class="reset-note"><strong>临时密码将在重置后显示一次</strong><p>用户首次登录时需要修改密码，原密码将立即失效。</p></div><div class="modal-actions"><button class="modal-close" type="button" @click="closeResetModal">取消</button><button class="modal-primary" type="button" @click="confirmReset">确认重置</button></div></section></div>
    <div :class="['toast',{show:toastText}]" role="status" aria-live="polite">{{ toastText }}</div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
.primary-btn,.secondary-btn { min-height:36px; display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 16px; border-radius:7px; font-size:13px; font-weight:650; cursor:pointer; }
.primary-btn { border:1px solid var(--agv-blue); color:#fff; background:var(--agv-blue); }
.primary-btn:hover { border-color:var(--agv-blue-hover); background:var(--agv-blue-hover); }
.primary-btn svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; }
.primary-btn.compact { min-width:72px; }
.secondary-btn { border:1px solid var(--agv-line); color:var(--agv-ink); background:#fff; }
.secondary-btn:hover { border-color:var(--agv-blue); color:var(--agv-blue); }

.user-page { min-height:calc(100vh - 148px); }
.user-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin-bottom:16px; }
.user-summary article { min-height:88px; display:flex; align-items:center; gap:14px; padding:16px; border:1px solid var(--agv-line-soft); border-radius:10px; background:#fff; }
.summary-icon { width:44px; height:44px; display:grid; place-items:center; flex:0 0 auto; border-radius:10px; }
.summary-icon svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.summary-icon.blue { color:var(--agv-blue); background:var(--agv-blue-soft); }
.summary-icon.green { color:var(--agv-green); background:#ecf8f2; }
.summary-icon.orange { color:var(--agv-orange); background:#fff3eb; }
.summary-icon.cyan { color:var(--agv-cyan); background:#e9f8fb; }
.user-summary strong { display:block; margin-bottom:4px; font-size:22px; line-height:1; }
.user-summary article > div > span { color:var(--agv-text-muted); font-size:12px; }

.user-panel { overflow:hidden; border:1px solid var(--agv-line-soft); border-radius:11px; background:#fff; }
.filter-bar { min-height:72px; display:flex; align-items:center; gap:12px; padding:16px; border-bottom:1px solid var(--agv-line-soft); background:#fbfcfd; }
.search-field { width:min(320px,32vw); height:38px; display:flex; align-items:center; gap:8px; padding:0 11px; border:1px solid var(--agv-line); border-radius:7px; background:#fff; }
.search-field:focus-within { border-color:var(--agv-blue); box-shadow:0 0 0 2px rgba(22,119,200,.08); }
.search-field svg { width:17px; height:17px; flex:0 0 auto; fill:none; stroke:#8a96a2; stroke-width:1.8; stroke-linecap:round; }
.search-field input { min-width:0; flex:1; border:0; outline:0; background:transparent; font-size:12px; }
.filter-field { height:38px; display:flex; align-items:center; gap:8px; color:var(--agv-text-muted); font-size:11px; }
.filter-field select { min-width:112px; height:38px; padding:0 30px 0 10px; border:1px solid var(--agv-line); border-radius:7px; outline:0; background:#fff; color:var(--agv-ink); font-size:12px; }
.filter-actions { display:flex; gap:8px; margin-left:auto; }

.table-wrap { overflow-x:auto; }
table { width:100%; min-width:1080px; border-collapse:separate; border-spacing:0; }
th,td { padding:0 14px; text-align:left; white-space:nowrap; border-bottom:1px solid var(--agv-line-soft); }
th { height:48px; color:var(--agv-text-secondary); background:#fafbfc; font-size:12px; font-weight:650; }
td { height:62px; font-size:12px; }
tbody tr:hover td { background:#f8fbfd; }
.user-cell { display:flex; align-items:center; gap:10px; }
.user-avatar { width:34px; height:34px; display:grid; place-items:center; flex:0 0 auto; border-radius:9px; color:#fff; background:var(--agv-blue); font-size:12px; font-weight:750; }
.user-avatar.cyan { background:var(--agv-cyan); }
.user-avatar.navy { background:#305474; }
.user-avatar.gray { background:#7b8894; }
.user-cell strong,.user-cell small { display:block; }
.user-cell strong { font-size:13px; }
.user-cell small { margin-top:4px; color:var(--agv-text-muted); font-size:10px; }
.role-chip { display:inline-flex; min-height:24px; align-items:center; padding:3px 9px; border-radius:999px; color:var(--agv-blue); background:var(--agv-blue-soft); font-size:10px; font-weight:650; }
.status-tag { display:inline-flex; align-items:center; gap:6px; min-height:24px; padding:3px 9px; border:1px solid currentColor; border-radius:999px; font-size:10px; font-weight:650; }
.status-tag::before { width:5px; height:5px; border-radius:50%; background:currentColor; content:""; }
.status-tag.enabled { color:var(--agv-green); border-color:#cce9da; background:#effaf4; }
.status-tag.disabled { color:#7b8792; border-color:#dfe4e8; background:#f5f7f8; }
.row-actions { display:flex; gap:6px; }
.row-btn { min-height:28px; padding:0 9px; border:1px solid var(--agv-line); border-radius:6px; color:var(--agv-text-secondary); background:#fff; font-size:10px; cursor:pointer; }
.row-btn:hover { border-color:var(--agv-blue); color:var(--agv-blue); }
.row-btn.danger { color:var(--agv-red); border-color:#efd0ce; background:#fff7f6; }
.row-btn.enable { color:var(--agv-green); border-color:#cae8d8; background:#f3fbf6; }
.empty-row { height:180px; color:var(--agv-text-muted); text-align:center; }
.table-footer { min-height:56px; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:10px 16px; color:var(--agv-text-muted); font-size:11px; }
.pagination { display:flex; gap:5px; }
.pagination button { width:30px; height:30px; border:1px solid var(--agv-line); border-radius:6px; background:#fff; cursor:pointer; }
.pagination button.active { border-color:var(--agv-blue); color:#fff; background:var(--agv-blue); }
.pagination button:disabled { cursor:not-allowed; opacity:.45; }

.modal-overlay,.alert-overlay { position:fixed; inset:0; z-index:70; background:rgba(0,0,0,.45); opacity:0; transition:opacity .2s; }
.modal-overlay.open,.alert-overlay.open { opacity:1; }
.modal-overlay { display:grid; place-items:center; padding:24px; }
.modal-card { width:min(620px,calc(100vw - 32px)); max-height:calc(100vh - 48px); overflow:auto; padding:24px; border-radius:8px; background:#fff; box-shadow:0 9px 28px 8px rgba(0,0,0,.08); }
.modal-card.small-modal { width:min(460px,calc(100vw - 32px)); }
.modal-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:20px; }
.modal-title-row h2,.modal-card > h2 { margin:0 0 4px; font-size:16px; }
.modal-title-row p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.modal-x { width:30px; height:30px; display:grid; place-items:center; padding:0; border:0; border-radius:6px; color:#7b8792; background:transparent; font-size:24px; cursor:pointer; }
.modal-x:hover { color:var(--agv-ink); background:#f1f3f5; }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.form-field { display:grid; gap:8px; }
.form-field span { font-size:13px; }
.form-field input,.form-field select { min-height:38px; padding:0 10px; border:1px solid var(--agv-line); border-radius:7px; outline:0; background:#fff; }
.form-field input:focus,.form-field select:focus { border-color:var(--agv-blue); box-shadow:0 0 0 2px rgba(22,119,200,.1); }
.wide { grid-column:1/-1; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; padding-top:16px; border-top:1px solid var(--agv-line-soft); }
.modal-close,.modal-primary { min-height:32px; padding:0 15px; border-radius:6px; font-size:13px; cursor:pointer; }
.modal-close { border:1px solid var(--agv-line); background:#fff; }
.modal-primary { border:1px solid var(--agv-blue); color:#fff; background:var(--agv-blue); }
.reset-note { padding:14px; border-left:3px solid var(--agv-blue); border-radius:0 8px 8px 0; background:var(--agv-blue-soft); }
.reset-note strong { font-size:13px; }
.reset-note p { margin:6px 0 0; color:var(--agv-text-secondary); font-size:12px; line-height:1.5; }
.success-text { color:var(--agv-green); }

.alert-overlay { z-index:75; }
.alert-drawer { position:absolute; inset:0 0 0 auto; width:min(420px,100vw); display:grid; grid-template-rows:auto 1fr auto; background:#f5f7f9; transform:translateX(100%); transition:transform .24s; }
.alert-overlay.open .alert-drawer { transform:none; }
.alert-drawer header,.alert-drawer footer { padding:18px; background:#fff; }
.alert-drawer header { border-bottom:1px solid var(--agv-line-soft); }
.alert-drawer h2 { margin:0 0 5px; font-size:18px; }
.alert-drawer p { margin:0; color:var(--agv-text-muted); font-size:12px; }
.alert-empty { display:grid; place-items:center; color:var(--agv-text-muted); font-size:12px; }
.alert-drawer footer { border-top:1px solid var(--agv-line-soft); text-align:center; }
.alert-drawer footer a { min-height:36px; display:inline-flex; align-items:center; justify-content:center; padding:0 24px; border-radius:7px; color:#fff; background:var(--agv-blue); text-decoration:none; }
.toast { position:fixed; left:50%; bottom:24px; z-index:90; padding:11px 16px; border-radius:8px; color:#fff; background:rgba(12,29,47,.92); font-size:13px; opacity:0; pointer-events:none; transform:translate(-50%,20px); transition:.22s; }
.toast.show { opacity:1; transform:translate(-50%,0); }

@media (max-width:1000px) {
  .user-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .filter-bar { align-items:stretch; flex-wrap:wrap; }
  .search-field { width:100%; }
  .filter-actions { margin-left:0; }
}
@media (max-width:600px) {
  .user-summary { grid-template-columns:1fr 1fr; gap:8px; }
  .user-summary article { min-height:74px; padding:11px; }
  .summary-icon { width:36px; height:36px; }
  .filter-field { flex:1; }
  .filter-field select { min-width:0; width:100%; }
  .filter-actions { width:100%; }
  .filter-actions button { flex:1; }
  .form-grid { grid-template-columns:1fr; }
  .wide { grid-column:auto; }
  .page-head .primary-btn { width:36px; padding:0; }
  .page-head .primary-btn span { display:none; }
}
</style>
<style scoped>
.users-reference-page { padding:0; }
.users-reference-page > .page-head { margin:0; }
.users-reference-page .page-head .primary-btn { flex:0 0 auto; }
.users-reference-page > .page-canvas { padding:20px; }
.users-reference-page .filter-bar { margin-bottom:0;border:0;border-bottom:1px solid var(--agv-line-soft);border-radius:0; }
.users-reference-page .modal-card .form-field select { min-height:40px; }
.users-reference-page .reset-note { font-size:14px; }
@media (max-width:760px) {
  .users-reference-page > .page-head { min-height:auto;align-items:flex-start;flex-direction:row;padding:14px 12px; }
  .users-reference-page > .page-head :deep(h1) { margin:0 0 8px;font-size:19px;line-height:1.3; }
  .users-reference-page > .page-head :deep(p) { margin:0;font-size:12px;line-height:1.55; }
  .users-reference-page > .page-head :deep(.page-header__actions) { width:auto;flex:0 0 auto; }
  .users-reference-page > .page-canvas { padding:12px; }
  .users-reference-page .filter-bar { flex-direction:row; }
  .users-reference-page .table-wrap { padding-bottom:12px; }
}
</style>
