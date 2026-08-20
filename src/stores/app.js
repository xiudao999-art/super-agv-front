import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const mobileSidebarOpen = ref(false)

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 1080px)').matches) {
      mobileSidebarOpen.value = !mobileSidebarOpen.value
      return
    }
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const closeMobileSidebar = () => {
    mobileSidebarOpen.value = false
  }

  return {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    closeMobileSidebar,
  }
})
