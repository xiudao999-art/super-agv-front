<script setup>
import { Cable, Info, Pencil, Plus, Trash2 } from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({
  rows: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  testing: { type: Boolean, default: false },
})
defineEmits(['create', 'edit', 'remove', 'test-connection'])
</script>

<template>
  <div class="lab-panel">
    <div class="data-rule">
      <Info :size="18" /><span
        >坐标规则：门和充电桩保存所属地图的到达坐标；电梯等跨空间资源需要分别保存两端空间、地图版本和连接点坐标。</span
      >
    </div>
    <section class="panel-card table-panel">
      <div class="panel-title">
        <div>
          <h2>门、电梯与充电桩</h2>
          <p>外围资源坐标用于路径连接、资源预约和到位校验</p>
        </div>
        <div class="action-group">
          <el-button type="primary" @click="$emit('create')"
            ><Plus :size="16" />新增外围资源</el-button
          >
          <el-button :loading="testing" @click="$emit('test-connection')"
            ><Cable :size="16" />连接测试</el-button
          >
        </div>
      </div>
      <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无外围资源">
        <el-table-column label="资源编号 / 名称" min-width="190"
          ><template #default="{ row }"
            ><div class="primary-cell">
              <strong>{{ row.id }}</strong
              ><small>{{ row.name }}</small>
            </div></template
          ></el-table-column
        >
        <el-table-column prop="type" label="类型" width="110" />
        <el-table-column
          prop="spaceMap"
          label="所属 / 连接空间（地图）"
          min-width="280"
          show-overflow-tooltip
        />
        <el-table-column
          prop="coordinate"
          label="地图坐标或两端连接点"
          min-width="310"
          show-overflow-tooltip
        />
        <el-table-column prop="navPoint" label="关联导航点" min-width="145" />
        <el-table-column label="状态" width="105"
          ><template #default="{ row }"><StatusBadge :status="row.status" /></template
        ></el-table-column>
        <el-table-column label="操作" fixed="right" width="145"
          ><template #default="{ row }"
            ><el-button link @click="$emit('edit', row)"><Pencil :size="14" />编辑</el-button
            ><el-button link type="danger" @click="$emit('remove', row)"
              ><Trash2 :size="14" />删除</el-button
            ></template
          ></el-table-column
        >
      </el-table>
    </section>
  </div>
</template>

<style scoped lang="scss">
.lab-panel {
  display: grid;
  gap: 14px;
}
.table-panel {
  padding: 20px;
  overflow: hidden;
}
.primary-cell {
  display: grid;
  gap: 4px;
}
.primary-cell strong {
  font-weight: 600;
}
.primary-cell small {
  color: var(--text-secondary);
  font-size: 11px;
}
@media (max-width: 600px) {
  .table-panel {
    padding: 15px 12px;
  }
}
</style>
