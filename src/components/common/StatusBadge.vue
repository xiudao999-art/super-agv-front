<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true },
  tone: { type: String, default: '' },
})

const resolvedTone = computed(() => {
  if (props.tone) return props.tone
  if (['有效', '启用', '已发布', '在线', '可用', '正常'].includes(props.status)) return 'success'
  if (['备用', '草稿', '待复核', '警告'].includes(props.status)) return 'warning'
  if (['停用', '离线', '异常', '严重'].includes(props.status)) return 'danger'
  return 'info'
})
</script>

<template>
  <span class="status-badge" :class="`is-${resolvedTone}`">
    <span class="status-badge__dot" />
    {{ status }}
  </span>
</template>

<style scoped lang="scss">
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 4px 9px;
  color: #3f5870;
  white-space: nowrap;
  background: #eef3f7;
  border: 1px solid #d6e0e9;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge__dot {
  width: 7px;
  height: 7px;
  background: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent);
}

.is-success {
  color: var(--success);
  background: var(--success-soft);
  border-color: #c4e5d3;
}

.is-warning {
  color: var(--warning);
  background: var(--warning-soft);
  border-color: #f0d7a5;
}

.is-danger {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: #f0c9ce;
}

.is-info {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: #c9dff1;
}
</style>
