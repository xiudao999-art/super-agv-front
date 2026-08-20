<script setup>
import { Eye, Info, MapPin, Pencil, Trash2, Upload } from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps({
  rows: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['create', 'edit', 'remove', 'view-map', 'view-points'])
</script>

<template>
  <div class="lab-panel">
    <div class="data-rule">
      <Info :size="18" />
      <span
        >数据规则：一个实验室空间只对应一张当前发布的底盘地图，但该地图可以关联多个导航点。实验室空间是机台、库位、动作点位、通行规则、路径和外围资源的统一归属对象。</span
      >
    </div>

    <section class="panel-card map-list-card">
      <div class="panel-title">
        <div>
          <h2>地图信息列表</h2>
          <p>查看实验室地图与已标记点位；通过导航点清单核对详细坐标</p>
        </div>
        <el-button type="primary" @click="$emit('create')"
          ><Upload :size="16" />新增空间并导入地图</el-button
        >
      </div>

      <el-table v-loading="loading" :data="rows" row-key="id" empty-text="暂无地图配置">
        <el-table-column label="实验室空间 / 编号" min-width="155">
          <template #default="{ row }"
            ><div class="primary-cell">
              <strong>{{ row.name }}</strong
              ><small>{{ row.id }}</small>
            </div></template
          >
        </el-table-column>
        <el-table-column label="地图 / 版本" min-width="185">
          <template #default="{ row }"
            ><div class="primary-cell">
              <strong>{{ row.mapName }} {{ row.mapVersion }}</strong
              ><small>{{ row.fileName }}</small>
            </div></template
          >
        </el-table-column>
        <el-table-column prop="scope" label="空间内对象" min-width="170" show-overflow-tooltip />
        <el-table-column label="关联导航点" width="120">
          <template #default="{ row }">
            <el-button plain size="small" @click="$emit('view-points', row)"
              ><MapPin :size="14" />{{ row.navPoints?.length || 0 }} 个导航点</el-button
            >
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90"
          ><template #default="{ row }"><StatusBadge :status="row.status" /></template
        ></el-table-column>
        <el-table-column label="操作" fixed="right" width="175">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button link type="primary" @click="$emit('view-map', row)"
                ><Eye :size="14" />查看地图</el-button
              >
              <el-button link @click="$emit('edit', row)"><Pencil :size="14" />编辑</el-button>
              <el-button link type="danger" @click="$emit('remove', row)"
                ><Trash2 :size="14" />删除</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <div class="relationship-grid">
      <article>
        <span>实验室空间与当前地图</span><strong>1 : 1</strong>
        <p>地图换版仍归属于同一实验室空间</p>
      </article>
      <article>
        <span>地图与导航点</span><strong>1 : N</strong>
        <p>一张地图可以定义多个导航点</p>
      </article>
      <article>
        <span>引用关系</span><strong>路径 / 资源 → 导航点</strong>
        <p>用于确定机器人实际到达位置</p>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lab-panel {
  display: grid;
  gap: 14px;
}

.map-list-card {
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

.table-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.relationship-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.relationship-grid article {
  position: relative;
  min-height: 128px;
  padding: 17px 18px;
  overflow: hidden;
  background: linear-gradient(140deg, #fff, #f4f8fb);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.relationship-grid article::after {
  position: absolute;
  top: -26px;
  right: -18px;
  width: 86px;
  height: 86px;
  content: '';
  background: var(--primary-soft);
  border-radius: 50%;
}

.relationship-grid span {
  color: var(--text-secondary);
  font-size: 12px;
}

.relationship-grid strong {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 11px;
  color: var(--primary);
  font-family: Bahnschrift, 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 600;
}

.relationship-grid article:last-child strong {
  font-size: 18px;
}

.relationship-grid p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

@media (max-width: 960px) {
  .relationship-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .map-list-card {
    padding: 15px 12px;
  }
}
</style>
