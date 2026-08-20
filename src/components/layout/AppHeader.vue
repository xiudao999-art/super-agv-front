<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Activity,
  BellRing,
  Bot,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
} from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'
import layoutMockData from '@/layouts/mockdata.json'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const appShellMock = layoutMockData
const healthVisible = ref(false)
const helpVisible = ref(false)
const alertsVisible = ref(false)

const handleUserCommand = (command) => {
  const messages = {
    profile: '个人中心将在后续页面中实现',
    settings: '系统设置将在后续页面中实现',
    logout: '当前会话未接入登录服务，退出登录暂不生效',
  }
  ElMessage.info(messages[command])
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand-area">
      <button
        class="header-icon-button sidebar-trigger"
        type="button"
        aria-label="展开或收起菜单"
        @click="appStore.toggleSidebar"
      >
        <Menu :size="20" />
      </button>
      <div class="brand-mark" aria-hidden="true">
        <Bot :size="23" />
        <span class="brand-mark__pulse" />
      </div>
      <div class="brand-copy">
        <strong>{{ appShellMock.system.name }}</strong>
        <small>{{ appShellMock.system.englishName }}</small>
      </div>
    </div>

    <div class="app-header__actions">
      <button class="health-button" type="button" @click="healthVisible = true">
        <span class="health-button__dot" />
        <span>{{ appShellMock.system.health }}</span>
      </button>

      <button class="header-action-button help-action" type="button" @click="helpVisible = true">
        <CircleHelp :size="17" />
        <span>状态说明</span>
      </button>

      <button
        class="header-action-button alert-action"
        type="button"
        aria-label="查看异常提醒"
        @click="alertsVisible = true"
      >
        <BellRing :size="17" />
        <span>异常提醒</span>
        <b>{{ appShellMock.alerts.length }}</b>
      </button>

      <el-dropdown trigger="click" @command="handleUserCommand">
        <button class="header-action-button user-action" type="button">
          <UserRound :size="17" />
          <span>{{ appShellMock.user.name }}</span>
          <ChevronDown :size="14" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile"><UserRound :size="15" />个人中心</el-dropdown-item>
            <el-dropdown-item command="settings"><Settings :size="15" />系统设置</el-dropdown-item>
            <el-dropdown-item command="logout" divided
              ><LogOut :size="15" />退出登录</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>

  <el-dialog v-model="healthVisible" title="系统健康状态" width="min(680px, 92vw)">
    <div class="health-summary">
      <div class="health-summary__icon"><ShieldCheck :size="27" /></div>
      <div>
        <strong>核心服务运行正常</strong>
        <p>最近一次状态汇总：{{ appShellMock.system.updatedAt }}</p>
      </div>
      <StatusBadge status="系统正常" tone="success" />
    </div>
    <div class="health-grid">
      <article v-for="metric in appShellMock.healthMetrics" :key="metric.label" class="health-card">
        <div class="health-card__head">
          <span>{{ metric.label }}</span>
          <StatusBadge :status="metric.value" :tone="metric.tone" />
        </div>
        <p>{{ metric.description }}</p>
      </article>
    </div>
    <template #footer>
      <el-button type="primary" @click="healthVisible = false">我知道了</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="helpVisible" title="系统状态说明" width="min(620px, 92vw)">
    <div class="status-guide">
      <div>
        <StatusBadge status="正常" tone="success" />
        <p>核心服务、设备通信和安全联锁均处于可用状态。</p>
      </div>
      <div>
        <StatusBadge status="警告" tone="warning" />
        <p>存在降级或待核对事项，系统仍可在受控范围内运行。</p>
      </div>
      <div>
        <StatusBadge status="严重" tone="danger" />
        <p>影响任务安全执行，关联任务会进入安全挂起或人工处理。</p>
      </div>
    </div>
    <div class="guide-note">
      <Activity :size="18" />任何涉及真实设备状态不确定的操作，都不会在页面中自动重试。
    </div>
  </el-dialog>

  <el-drawer v-model="alertsVisible" title="异常提醒" size="min(520px, 92vw)">
    <div class="alert-drawer-intro">
      <span>当前未完成异常</span><strong>{{ appShellMock.alerts.length }}</strong>
    </div>
    <article
      v-for="alert in appShellMock.alerts"
      :key="alert.id"
      class="alert-card"
      :class="`is-${alert.tone}`"
    >
      <div class="alert-card__head">
        <StatusBadge :status="alert.level" :tone="alert.tone" />
        <span>{{ alert.time }}</span>
      </div>
      <h3>{{ alert.title }}</h3>
      <p><b>来源：</b>{{ alert.source }}</p>
      <p><b>影响：</b>{{ alert.impact }}</p>
      <el-button plain size="small" @click="ElMessage.info('异常处理页面将在后续实现')"
        >查看详情与处理</el-button
      >
    </article>
  </el-drawer>
</template>

<style scoped lang="scss">
.app-header {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 18px;
  color: #fff;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px) 0 0 / 36px 36px,
    linear-gradient(105deg, var(--nav-deep), var(--nav) 55%, #123f69);
  box-shadow: 0 8px 24px rgba(4, 27, 49, 0.22);
}

.app-header::after {
  position: absolute;
  right: 24%;
  bottom: 0;
  width: 180px;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, transparent, #49bdd5, transparent);
}

.app-header__brand-area,
.app-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon-button,
.header-action-button,
.health-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  padding: 0 11px;
  color: inherit;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.header-icon-button:hover,
.header-action-button:hover,
.health-button:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.34);
  transform: translateY(-1px);
}

.sidebar-trigger {
  margin-right: 2px;
}

.brand-mark {
  position: relative;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  background: linear-gradient(145deg, rgba(84, 169, 238, 0.25), rgba(255, 255, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
}

.brand-mark__pulse {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 9px;
  height: 9px;
  background: #4fd395;
  border: 2px solid var(--nav);
  border-radius: 50%;
}

.brand-copy strong {
  display: block;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.brand-copy small {
  display: block;
  margin-top: 2px;
  font-family: Bahnschrift, 'Arial Narrow', sans-serif;
  font-size: 10px;
  letter-spacing: 0.08em;
  opacity: 0.65;
}

.health-button {
  color: #76d9a6;
  background: rgba(25, 135, 84, 0.17);
  border-color: rgba(82, 201, 139, 0.48);
  border-radius: 999px;
}

.health-button__dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(82, 201, 139, 0.13);
}

.alert-action {
  position: relative;
}

.user-action {
  color: #fff;
}

.alert-action b {
  position: absolute;
  top: -7px;
  right: -7px;
  display: grid;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  place-items: center;
  color: white;
  background: var(--danger);
  border: 2px solid var(--nav);
  border-radius: 999px;
  font-size: 10px;
}

.health-summary {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 16px;
  background: var(--success-soft);
  border: 1px solid #c7e5d5;
  border-radius: 12px;
}

.health-summary__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: var(--success);
  background: #fff;
  border-radius: 12px;
}

.health-summary > div:nth-child(2) {
  flex: 1;
}

.health-summary strong {
  font-size: 16px;
}

.health-summary p,
.health-card p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.health-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.health-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.status-guide {
  display: grid;
  gap: 10px;
}

.status-guide > div {
  display: grid;
  grid-template-columns: 76px 1fr;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: var(--surface-soft);
  border-radius: 9px;
}

.status-guide p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.guide-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  color: #765115;
  background: var(--warning-soft);
  border-left: 3px solid var(--warning);
  border-radius: 8px;
  font-size: 13px;
}

.alert-drawer-intro {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 13px 15px;
  color: var(--text-secondary);
  background: var(--surface-soft);
  border-radius: 10px;
}

.alert-drawer-intro strong {
  color: var(--danger);
  font-family: Bahnschrift, sans-serif;
  font-size: 25px;
}

.alert-card {
  margin-bottom: 12px;
  padding: 15px;
  background: #fff;
  border: 1px solid var(--border);
  border-left: 4px solid var(--warning);
  border-radius: 10px;
}

.alert-card.is-danger {
  border-left-color: var(--danger);
}

.alert-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 12px;
}

.alert-card h3 {
  margin: 13px 0 9px;
  font-size: 15px;
}

.alert-card p {
  margin: 6px 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.alert-card .el-button {
  margin-top: 8px;
}

@media (max-width: 850px) {
  .help-action,
  .user-action span,
  .alert-action > span {
    display: none;
  }

  .brand-copy small {
    display: none;
  }
}

@media (max-width: 600px) {
  .app-header {
    padding: 0 10px;
  }

  .brand-copy,
  .health-button span:not(.health-button__dot) {
    display: none;
  }

  .health-button {
    width: 36px;
    padding: 0;
  }

  .health-grid {
    grid-template-columns: 1fr;
  }
}
</style>
