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

  <el-dialog v-model="statusVisible" title="系统运行状态" width="520px" class="reference-dialog status-reference-dialog">
    <div class="status-explain-list">
      <article><i class="dot success" /><div><strong>绿色 · 系统正常</strong><p>核心服务、数据库、任务引擎和机器人连接正常。</p></div></article>
      <article><i class="dot warning" /><div><strong>黄色 · 受限运行</strong><p>部分非核心设备或接口异常，系统仍可继续部分业务。</p></div></article>
      <article><i class="dot danger" /><div><strong>红色 · 系统异常</strong><p>核心能力异常，系统暂停接收和分配新任务。</p></div></article>
      <article><i class="dot info" /><div><strong>灰色 · 维护模式</strong><p>系统处于人工维护、升级或硬件调试状态。</p></div></article>
    </div>
    <template #footer><el-button @click="statusVisible = false">关闭</el-button></template>
  </el-dialog>

  <el-drawer v-model="alertsVisible" size="420px" class="reference-alert-drawer">
    <template #header><div><h2>异常提醒</h2><p>3 条未完成 · 1 条严重</p></div></template>
    <div class="alert-list">
      <article class="alert-item danger"><strong>机台允许进样事件等待超过 30 秒</strong><p>ALM-20260827-0042 · 待处理</p></article>
      <article class="alert-item warning"><strong>库位系统记录与传感器状态不一致</strong><p>ALM-20260827-0041 · 处理中</p></article>
      <article class="alert-item info"><strong>视觉设备出现短时断连</strong><p>ALM-20260827-0040 · 已确认</p></article>
    </div>
    <template #footer><el-button type="primary" @click="alertsVisible = false; router.push('/operations/exception-recovery')">进入异常与恢复</el-button></template>
  </el-drawer>
</template>
