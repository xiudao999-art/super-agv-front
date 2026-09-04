<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:page', 'update:pageSize'])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const pages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1))

function changePage(value) {
  if (!props.loading && value >= 1 && value <= pageCount.value && value !== props.page) emit('update:page', value)
}
function changePageSize(event) {
  emit('update:pageSize', Number(event.target.value))
}
</script>

<template>
  <div class="pager-row">
    <div class="total">共计 {{ total }} 条数据</div>
    <div class="pagination-controls">
      <button class="page-btn" type="button" :disabled="page <= 1 || loading" @click="changePage(page - 1)">‹</button>
      <button v-for="item in pages" :key="item" class="page-btn" :class="{ active: page === item }" type="button" :disabled="loading" @click="changePage(item)">{{ item }}</button>
      <button class="page-btn" type="button" :disabled="page >= pageCount || loading" @click="changePage(page + 1)">›</button>
      <select class="page-size" :value="pageSize" :disabled="loading" @change="changePageSize"><option :value="10">10 条/页</option><option :value="20">20 条/页</option><option :value="50">50 条/页</option></select>
    </div>
  </div>
</template>

<style scoped>
.pager-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px}.total{color:var(--agv-text-muted,var(--muted,#768392));font-size:12px}.pagination-controls{display:flex;align-items:center;gap:7px}.page-btn{min-width:34px;height:34px;padding:0 9px;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer}.page-btn.active{background:#eef0f2}.page-btn:disabled{cursor:not-allowed;opacity:.45}.page-size{height:34px;padding:0 10px;border:1px solid #dfe3e7;border-radius:8px;background:#fff;color:inherit}@media(max-width:760px){.pager-row{align-items:flex-start;flex-direction:column}.pagination-controls{max-width:100%;overflow-x:auto;padding-bottom:4px}}
</style>
