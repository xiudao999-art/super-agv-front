<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { Activity, ChevronDown, LayoutDashboard, Radar, SlidersHorizontal } from '@lucide/vue'

import layoutMockData from '@/layouts/mockdata.json'
import { useAppStore } from '@/stores/app'

const iconMap = { Activity, LayoutDashboard, Radar, SlidersHorizontal }
const route = useRoute()
const appStore = useAppStore()
const { sidebarCollapsed, mobileSidebarOpen } = storeToRefs(appStore)
const expandedGroups = ref(new Set(['configuration']))
const sidebarMenuMock = layoutMockData.sidebarMenu

const activeGroupId = computed(() => {
  const group = sidebarMenuMock.find((item) =>
    item.children?.some((child) => child.route === route.path),
  )
  return group?.id || ''
})

const isExpanded = (groupId) => expandedGroups.value.has(groupId) || activeGroupId.value === groupId

const toggleGroup = (groupId) => {
  const next = new Set(expandedGroups.value)
  if (next.has(groupId)) next.delete(groupId)
  else next.add(groupId)
  expandedGroups.value = next
}
</script>

<template>
  <div v-if="mobileSidebarOpen" class="sidebar-backdrop" @click="appStore.closeMobileSidebar" />
  <aside
    class="app-sidebar"
    :class="{ 'is-collapsed': sidebarCollapsed, 'is-mobile-open': mobileSidebarOpen }"
  >
    <nav aria-label="系统主菜单">
      <div v-for="item in sidebarMenuMock" :key="item.id" class="nav-group">
        <RouterLink
          v-if="item.route"
          :to="item.route"
          class="nav-item nav-item--primary"
          :class="{ 'is-active': route.path === item.route }"
          :title="sidebarCollapsed ? item.label : undefined"
          @click="appStore.closeMobileSidebar"
        >
          <component :is="iconMap[item.icon]" :size="18" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <template v-else>
          <button
            class="nav-item nav-item--group"
            :class="{ 'has-active-child': activeGroupId === item.id }"
            type="button"
            :aria-expanded="isExpanded(item.id)"
            :title="sidebarCollapsed ? item.label : undefined"
            @click="toggleGroup(item.id)"
          >
            <component :is="iconMap[item.icon]" :size="18" />
            <span>{{ item.label }}</span>
            <ChevronDown class="nav-item__chevron" :size="15" />
          </button>
          <div v-show="isExpanded(item.id) && !sidebarCollapsed" class="nav-children">
            <RouterLink
              v-for="child in item.children"
              :key="child.route"
              :to="child.route"
              class="nav-child"
              :class="{ 'is-active': route.path === child.route }"
              @click="appStore.closeMobileSidebar"
            >
              <span class="nav-child__track" />
              {{ child.label }}
            </RouterLink>
          </div>
        </template>
      </div>
    </nav>

    <div class="sidebar-footer">
      <span class="sidebar-footer__status" />
      <div>
        <strong>控制台已连接</strong>
        <small>localhost:8081</small>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.app-sidebar {
  position: relative;
  z-index: 20;
  display: flex;
  flex: 0 0 var(--sidebar-width);
  flex-direction: column;
  width: var(--sidebar-width);
  min-height: calc(100vh - var(--header-height));
  padding: 16px 11px 18px;
  overflow: hidden auto;
  background: rgba(255, 255, 255, 0.92);
  border-right: 1px solid var(--border);
  box-shadow: 7px 0 22px rgba(15, 45, 77, 0.04);
  backdrop-filter: blur(12px);
  transition:
    width 200ms ease,
    flex-basis 200ms ease,
    transform 200ms ease;
}

.app-sidebar.is-collapsed {
  flex-basis: var(--sidebar-collapsed-width);
  width: var(--sidebar-collapsed-width);
}

.nav-group {
  margin-top: 5px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 41px;
  gap: 10px;
  padding: 9px 11px;
  color: #30465d;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 550;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.nav-item:hover,
.nav-item.has-active-child {
  color: var(--primary);
  background: var(--primary-soft);
}

.nav-item.is-active {
  color: #fff;
  background: linear-gradient(105deg, var(--primary), #195d99);
  box-shadow: 0 5px 13px rgba(20, 105, 184, 0.2);
}

.nav-item > span {
  flex: 1;
  white-space: nowrap;
}

.nav-item__chevron {
  transition: transform 180ms ease;
}

.nav-item[aria-expanded='true'] .nav-item__chevron {
  transform: rotate(180deg);
}

.nav-children {
  position: relative;
  margin: 3px 0 4px 18px;
  padding: 2px 0 2px 17px;
}

.nav-children::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  content: '';
  background: #d7e1ea;
}

.nav-child {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 7px 10px;
  color: var(--text-secondary);
  border-radius: 7px;
  font-size: 12px;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.nav-child:hover,
.nav-child.is-active {
  color: var(--primary);
  background: #eff6fb;
}

.nav-child.is-active {
  font-weight: 600;
}

.nav-child__track {
  position: absolute;
  left: -20px;
  width: 6px;
  height: 6px;
  background: #becbd6;
  border-radius: 50%;
}

.nav-child.is-active .nav-child__track {
  background: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-soft);
}

.is-collapsed .nav-item {
  justify-content: center;
  padding: 9px;
}

.is-collapsed .nav-item > span,
.is-collapsed .nav-item__chevron {
  display: none;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 12px 10px 2px;
  color: var(--text-secondary);
}

.sidebar-footer__status {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 0 4px var(--success-soft);
}

.sidebar-footer strong,
.sidebar-footer small {
  display: block;
  white-space: nowrap;
}

.sidebar-footer strong {
  color: var(--text-primary);
  font-size: 11px;
}

.sidebar-footer small {
  margin-top: 3px;
  font-family: Bahnschrift, sans-serif;
  font-size: 10px;
}

.is-collapsed .sidebar-footer > div {
  display: none;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 1080px) {
  .app-sidebar,
  .app-sidebar.is-collapsed {
    position: fixed;
    top: var(--header-height);
    bottom: 0;
    left: 0;
    width: var(--sidebar-width);
    min-height: 0;
    transform: translateX(-102%);
  }

  .app-sidebar.is-mobile-open {
    transform: translateX(0);
  }

  .app-sidebar.is-collapsed .nav-item {
    justify-content: flex-start;
    padding: 9px 11px;
  }

  .app-sidebar.is-collapsed .nav-item > span,
  .app-sidebar.is-collapsed .nav-item__chevron,
  .app-sidebar.is-collapsed .sidebar-footer > div {
    display: block;
  }

  .sidebar-backdrop {
    position: fixed;
    z-index: 19;
    inset: var(--header-height) 0 0;
    display: block;
    background: rgba(7, 20, 38, 0.42);
    backdrop-filter: blur(2px);
  }
}
</style>
