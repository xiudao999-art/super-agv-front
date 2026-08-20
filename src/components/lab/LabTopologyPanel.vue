<script setup>
import { GitCommitHorizontal, Pencil, Plus, Route, Trash2 } from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({ rows: { type: Array, required: true }, loading: { type: Boolean, default: false } })
defineEmits(['create', 'edit', 'remove', 'go-paths'])
</script>

<template>
  <section class="panel-card table-panel">
    <div class="panel-title">
      <div>
        <h2>通行规则</h2>
        <p>节点和连接必须归属于一个空间地图；跨空间仅通过门或电梯等连接资源衔接</p>
      </div>
      <div class="action-group">
        <el-button type="primary" @click="$emit('create', { type: '导航节点' })"
          ><Plus :size="16" />新增通行节点</el-button
        >
        <el-button @click="$emit('create', { type: '通行连接' })"
          ><GitCommitHorizontal :size="16" />新增通行连接</el-button
        >
        <el-button @click="$emit('go-paths')"><Route :size="16" />进入路径管理</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无通行规则">
      <el-table-column prop="id" label="节点编号" width="130" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="type" label="节点类型" width="130" />
      <el-table-column
        prop="spaceMap"
        label="所属空间（地图）"
        min-width="260"
        show-overflow-tooltip
      />
      <el-table-column prop="coordinate" label="地图坐标（X / Y / θ）" min-width="210" />
      <el-table-column prop="rule" label="通行规则" min-width="150" />
      <el-table-column label="状态" width="100"
        ><template #default="{ row }"><StatusBadge :status="row.status" /></template
      ></el-table-column>
      <el-table-column label="操作" fixed="right" width="145">
        <template #default="{ row }">
          <el-button link @click="$emit('edit', row)"><Pencil :size="14" />编辑</el-button>
          <el-button link type="danger" @click="$emit('remove', row)"
            ><Trash2 :size="14" />删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<style scoped lang="scss">
.table-panel {
  padding: 20px;
  overflow: hidden;
}

@media (max-width: 600px) {
  .table-panel {
    padding: 15px 12px;
  }
}
</style>
