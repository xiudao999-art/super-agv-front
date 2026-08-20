<script setup>
import { computed } from 'vue'
import { FileImage, Layers3, MapPin, Navigation } from '@lucide/vue'

import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  space: { type: Object, default: null },
  focus: { type: String, default: 'map' },
})

defineEmits(['update:modelValue'])
const dialogTitle = computed(
  () =>
    `${props.space?.name || '实验室'} · ${props.focus === 'points' ? '导航点清单' : '导入地图'}`,
)

const markerColor = (point) => {
  if (point.type.includes('等待')) return '#198754'
  if (point.type.includes('充电') || point.type.includes('停靠')) return '#b56a00'
  return '#1469b8'
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="min(1120px, 96vw)"
    top="5vh"
    @close="$emit('update:modelValue', false)"
  >
    <template v-if="space">
      <div class="map-dialog-layout">
        <section class="map-stage">
          <div class="map-stage__toolbar">
            <div>
              <strong>{{ space.mapName }} {{ space.mapVersion }}</strong
              ><small>地图预览 · 已标记配置点位</small>
            </div>
            <StatusBadge :status="space.status" />
          </div>
          <div class="map-canvas">
            <img src="/mock-laboratory-map.svg" alt="实验室总览地图" />
            <svg viewBox="0 0 900 520" role="img" :aria-label="`${space.name}已配置导航点`">
              <g v-for="point in space.navPoints" :key="point.id">
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  r="13"
                  :fill="markerColor(point)"
                  fill-opacity="0.2"
                />
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  r="6"
                  :fill="markerColor(point)"
                  stroke="#fff"
                  stroke-width="2"
                />
              </g>
            </svg>
            <div class="map-canvas__legend">
              <span><i class="is-blue" />导航点</span><span><i class="is-green" />等待点</span
              ><span><i class="is-orange" />停靠 / 充电点</span>
            </div>
          </div>
        </section>

        <aside class="map-meta">
          <div class="map-meta__item">
            <Layers3 :size="18" />
            <div>
              <span>实验室空间</span><strong>{{ space.name }}</strong
              ><small>{{ space.id }}</small>
            </div>
          </div>
          <div class="map-meta__item">
            <FileImage :size="18" />
            <div>
              <span>地图文件</span><strong>{{ space.fileName }}</strong
              ><small>{{ space.mapVersion }} · {{ space.publishedAt }}</small>
            </div>
          </div>
          <div class="map-meta__item">
            <MapPin :size="18" />
            <div>
              <span>已配置导航点</span><strong>{{ space.navPoints.length }} 个</strong
              ><small>坐标校验通过</small>
            </div>
          </div>
          <div class="map-meta__note">
            <Navigation
              :size="17"
            />地图文件可由底盘建图软件导出替换，替换后应保持坐标系与标记点映射一致。
          </div>
        </aside>
      </div>

      <div class="point-table-title">
        <div>
          <h3>导航点坐标清单</h3>
          <p>坐标归属于 {{ space.name }} 当前发布地图</p>
        </div>
        <StatusBadge :status="`${space.navPoints.length} 个点`" tone="info" />
      </div>
      <el-table :data="space.navPoints" max-height="250" empty-text="暂无导航点">
        <el-table-column prop="id" label="导航点编号" min-width="160" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="地图坐标 X / Y / θ" min-width="210"
          ><template #default="{ row }"
            >{{ row.x }} / {{ row.y }} / {{ row.yaw }}°</template
          ></el-table-column
        >
        <el-table-column label="状态" width="100"
          ><template #default="{ row }"><StatusBadge :status="row.status" /></template
        ></el-table-column>
      </el-table>
    </template>
    <template #footer
      ><el-button type="primary" @click="$emit('update:modelValue', false)"
        >关闭</el-button
      ></template
    >
  </el-dialog>
</template>

<style scoped lang="scss">
.map-dialog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
}

.map-stage {
  overflow: hidden;
  background: #f1f5f8;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.map-stage__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.map-stage__toolbar strong,
.map-stage__toolbar small {
  display: block;
}

.map-stage__toolbar small {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}

.map-canvas {
  position: relative;
  aspect-ratio: 900 / 520;
  overflow: hidden;
}

.map-canvas img,
.map-canvas svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-canvas__legend {
  position: absolute;
  right: 12px;
  bottom: 11px;
  display: flex;
  gap: 12px;
  padding: 7px 9px;
  color: #42586c;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(188, 203, 215, 0.8);
  border-radius: 7px;
  font-size: 10px;
  backdrop-filter: blur(5px);
}

.map-canvas__legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.map-canvas__legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.is-blue {
  background: var(--primary);
}
.is-green {
  background: var(--success);
}
.is-orange {
  background: var(--warning);
}

.map-meta {
  display: grid;
  align-content: start;
  gap: 10px;
}

.map-meta__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px;
  color: var(--primary);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.map-meta__item > div {
  min-width: 0;
}

.map-meta__item span,
.map-meta__item strong,
.map-meta__item small {
  display: block;
}

.map-meta__item span {
  color: var(--text-secondary);
  font-size: 10px;
}

.map-meta__item strong {
  margin-top: 5px;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-meta__item small {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 10px;
}

.map-meta__note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 12px;
  color: #765115;
  background: var(--warning-soft);
  border-left: 3px solid var(--warning);
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
}

.point-table-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 20px 0 10px;
}

.point-table-title h3 {
  margin: 0;
  font-size: 16px;
}

.point-table-title p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
}

@media (max-width: 800px) {
  .map-dialog-layout {
    grid-template-columns: 1fr;
  }
}
</style>
