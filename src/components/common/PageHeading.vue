<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header class="page-heading">
    <div>
      <div class="page-heading__eyebrow">COMPOSITE ROBOT · CONTROL CONSOLE</div>
      <h1>{{ route.meta.title }}</h1>
      <p>{{ route.meta.subtitle }}</p>
    </div>
    <slot name="actions" />
  </header>
</template>

<style scoped lang="scss">
.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 2px 2px 0;
}

.page-heading__eyebrow {
  margin-bottom: 7px;
  color: var(--primary);
  font-family: Bahnschrift, 'Arial Narrow', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 2vw, 32px);
  font-weight: 600;
  letter-spacing: -0.02em;
}

p {
  max-width: 860px;
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.65;
}

@media (max-width: 760px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
