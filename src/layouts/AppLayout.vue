<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <div class="app-layout__body">
      <AppSidebar />
      <main class="app-layout__content">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
}

.app-layout__body {
  display: flex;
  min-height: calc(100vh - var(--header-height));
}

.app-layout__content {
  flex: 1;
  min-width: 0;
  padding: 25px clamp(18px, 2.4vw, 38px) 42px;
  overflow: hidden;
}

@media (max-width: 760px) {
  .app-layout__content {
    padding: 20px 12px 30px;
  }
}
</style>
