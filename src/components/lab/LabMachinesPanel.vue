<script setup>
import { Info, MapPinPlus, Pencil, Plus, Trash2 } from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({ rows: { type: Array, required: true }, loading: { type: Boolean, default: false } })
defineEmits(['create', 'edit', 'remove'])
</script>

<template>
  <div class="lab-panel">
    <div class="data-rule">
      <Info :size="18" /><span
        >坐标规则：机台必须配置地图锚点；导航点使用空间地图坐标；抓取、放置等机械臂点位保存自身坐标系的完整位姿，并同时关联一个可到达的地图导航点。</span
      >
    </div>
    <section class="panel-card table-panel">
      <div class="panel-title">
        <div>
          <h2>机台、导航点与动作点位</h2>
          <p>坐标值与坐标系必须成对保存，发布前校验地图版本和到达关系</p>
        </div>
        <div class="action-group">
          <el-button type="primary" @click="$emit('create', { type: '检测机台' })"
            ><Plus :size="16" />新增机台</el-button
          >
          <el-button @click="$emit('create', { type: '导航停靠点' })"
            ><MapPinPlus :size="16" />新增点位</el-button
          >
        </div>
      </div>
      <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无机台与点位">
        <el-table-column label="机台 / 点位" min-width="190"
          ><template #default="{ row }"
            ><div class="primary-cell">
              <strong>{{ row.name }}</strong
              ><small>{{ row.id }}</small>
            </div></template
          ></el-table-column
        >
        <el-table-column prop="type" label="类型" min-width="130" />
        <el-table-column
          prop="spaceMap"
          label="所属空间（地图）"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column prop="owner" label="所属对象" min-width="125" />
        <el-table-column prop="coordinateSystem" label="坐标系" min-width="145" />
        <el-table-column prop="coordinate" label="坐标值" min-width="290" show-overflow-tooltip />
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
  font-family: Bahnschrift, sans-serif;
  font-size: 11px;
}
@media (max-width: 600px) {
  .table-panel {
    padding: 15px 12px;
  }
}
</style>
