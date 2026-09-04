<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold, UserFilled } from '@element-plus/icons-vue'
import { activeMenuForRoute, navigation } from '../config/navigation'

const route = useRoute()
const router = useRouter()
const mobileMenu = ref(false)
const statusVisible = ref(false)
const alertsVisible = ref(false)

const alertItems = [
  { title: '机台允许进样事件等待超过流程配置的30秒', code: 'ALM-20260817-0042', time: '2026-08-17 09:42:18', level: '严重', levelClass: 'danger', object: '贴标机台进样许可', impact: '运输任务保持在 W-B01；贴标机台进样位继续预约；后续同目标任务暂停派发', status: '待处理', statusClass: 'pending', owner: '陈工' },
  { title: '系统记录为空，但库位传感器检测有物', code: 'ALM-20260817-0041', time: '2026-08-17 09:36:54', level: '警告', levelClass: 'warning', object: '立库 A 第4层07位', impact: '库位 A-04-07 已锁定，不参与新任务分配；同层其他库位不受影响', status: '处理中', statusClass: 'processing', owner: '王工' },
  { title: '系统记录为空，但库位传感器检测有物', code: 'ALM-20260817-0041', time: '2026-08-17 09:36:54', level: '警告', levelClass: 'warning', object: '立库 A 第4层07位', impact: '库位 A-04-07 已锁定，不参与新任务分配；同层其他库位不受影响', status: '处理中', statusClass: 'processing', owner: '王工' },
  { title: '视觉设备在60秒内出现3次短时断连', code: 'ALM-20260817-0040', time: '2026-08-17 09:31:12', level: '警告', levelClass: 'warning', object: '视觉 VISION-01', impact: '当前动作在重试前暂停；底盘和机械臂保持安全状态；其他任务等待', status: '已确认', statusClass: 'confirmed', owner: '李工' },
]

const activeMenu = computed(() => activeMenuForRoute[route.path] || route.path)
const title = computed(() => route.meta.title || '运行总览')
const sectionTitle = computed(() => navigation.find(group => group.items.some(item => item.path === activeMenu.value))?.label || '')

function logout() {
  sessionStorage.removeItem('agv-session')
  router.replace('/login')
}
</script>

<template>
  <el-container class="app-shell">
    <el-aside class="app-sidebar" width="220px">
      <router-link class="brand" to="/dashboard">
        <img src="/assets/logo.svg" alt="昆灵科技" />
      </router-link>
      <el-scrollbar class="sidebar-scroll">
        <el-menu :default-active="activeMenu" router @select="mobileMenu = false">
          <template v-for="(group, index) in navigation" :key="index">
            <p v-if="group.label" class="menu-label">{{ group.label }}</p>
            <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
              <span class="menu-figma-icon" :style="{'--menu-icon':`url(${item.icon})`}" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
      <div class="sidebar-version">v2.3</div>
    </el-aside>

    <el-drawer v-model="mobileMenu" direction="ltr" :with-header="false" size="240px" class="mobile-nav-drawer">
      <router-link class="brand mobile" to="/dashboard" @click="mobileMenu = false"><img src="/assets/logo.svg" alt="昆灵科技" /></router-link>
      <el-menu :default-active="activeMenu" router @select="mobileMenu = false">
        <template v-for="(group, index) in navigation" :key="index">
          <p v-if="group.label" class="menu-label">{{ group.label }}</p>
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
            <span class="menu-figma-icon" :style="{'--menu-icon':`url(${item.icon})`}" aria-hidden="true" /><span>{{ item.label }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-drawer>

    <el-container class="app-main-container">
      <el-header class="topbar">
        <div class="topbar-title">
          <el-button class="mobile-menu-button" text :icon="Fold" @click="mobileMenu = true" />
          <span class="topbar-title-icon"><img src="/assets/topbar/breadcrumb.svg" alt=""></span>
          <span v-if="sectionTitle" class="breadcrumb-section">{{ sectionTitle }}</span>
          <span v-if="sectionTitle" class="breadcrumb-separator">/</span>
          <span>{{ title }}</span>
        </div>
        <div class="topbar-actions">
          <el-button round @click="statusVisible = true"><img class="topbar-action-icon" src="/assets/topbar/status.svg" alt="">状态说明</el-button>
          <el-button round @click="alertsVisible = true"><img class="topbar-action-icon" src="/assets/topbar/warning.svg" alt="">异常提醒</el-button>
          <el-dropdown trigger="click">
            <button class="user-chip">
              <el-avatar :size="32" :icon="UserFilled" />
              <span>陈工</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/system/users')">个人信息</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="statusVisible" title="系统运行状态" width="600px" :show-close="false" align-center class="reference-dialog status-reference-dialog">
    <div class="status-explain-list">
      <article class="success"><strong>绿色•系统正常</strong><p>核心服务、数据库、任务引擎和机器人连接正常。</p></article>
      <article class="warning"><strong>黄色•受限运行</strong><p>部分非核心设备或上游接口异常，系统仍可继续部分业务。</p></article>
      <article class="danger"><strong>红色•系统异常</strong><p>核心能力异常，系统暂停接收和分配新任务。</p></article>
      <article class="info"><strong>灰色•维护模式</strong><p>系统处于人工维护、升级或硬件调试状态。</p></article>
    </div>
    <template #footer><el-button @click="statusVisible = false">关闭</el-button></template>
  </el-dialog>

  <el-drawer v-model="alertsVisible" size="444px" :show-close="false" class="reference-alert-drawer">
    <template #header><div><h2>异常提醒</h2><p>3条未完成 · 1条严重</p></div></template>
    <div class="alert-feed">
      <article v-for="(alert, index) in alertItems" :key="`${alert.code}-${index}`" class="alert-card">
        <div class="alert-card__head">
          <div class="alert-card__title"><strong>{{ alert.title }}</strong><p>{{ alert.code }} · {{ alert.time }}</p></div>
          <span class="alert-severity" :class="alert.levelClass"><img :src="`/assets/topbar/alert-${alert.levelClass}.svg`" alt="">{{ alert.level }}</span>
        </div>
        <dl class="alert-card__details">
          <div><dt>异常对象：</dt><dd class="alert-object">{{ alert.object }}</dd></div>
          <div><dt>影响：</dt><dd>{{ alert.impact }}</dd></div>
          <div><dt>当前状态：</dt><dd class="alert-state" :class="alert.statusClass">{{ alert.status }}</dd></div>
          <div><dt>负责人：</dt><dd>{{ alert.owner }}</dd></div>
        </dl>
        <button class="alert-detail-button" @click="alertsVisible = false; router.push('/operations/exception-recovery')">查看详情与处理</button>
      </article>
    </div>
    <template #footer><el-button type="primary" @click="alertsVisible = false; router.push('/operations/exception-recovery')">进入异常与恢复</el-button></template>
  </el-drawer>
</template>
