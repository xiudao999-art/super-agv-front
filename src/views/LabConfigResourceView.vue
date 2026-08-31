<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '../components/PageHeader.vue'
import ResourceTabs from '../components/ResourceTabs.vue'
import { deleteLabEntity, getLabConfig, getLaboratory, saveLabEntity } from '../api/agv'

const props = defineProps({ mode: { type: String, required: true } })
const tabs = [
  { label: '地图信息', path: '/config/map' },
  { label: '机台与点位', path: '/config/stations' },
  { label: '外围资源', path: '/config/peripherals' },
  { label: '通行规则', path: '/config/passage-rules' },
]

const loading = ref(false)
const detail = ref(null)
const configId = ref(null)
const dialogVisible = ref(false)
const pathDialogVisible = ref(false)
const editingId = ref(null)
const entityKind = ref('machines')
const form = reactive({})

const isStations = computed(() => props.mode === 'stations')
const title = computed(() => isStations.value ? '机台与点位' : '通行规则')
const description = computed(() => isStations.value ? '维护机台锚点、动作点位和关联导航节点' : '配置导航节点、方向、限速与通行连接')
const editable = computed(() => detail.value?.status === 'DRAFT')
const machineMap = computed(() => new Map((detail.value?.machines || []).map((item) => [String(item.id), item.name])))
const nodeMap = computed(() => new Map((detail.value?.nodes || []).map((item) => [String(item.id), item])))

const rows = computed(() => {
  if (!detail.value) return []
  if (isStations.value) {
    return [
      ...(detail.value.machines || []).map((row) => ({
        ...row,
        _kind: 'machines',
        categoryLabel: '机台',
        owner: '-',
        coordinate: `X ${row.anchorX} / Y ${row.anchorY} / θ ${row.anchorYaw}°`,
        relation: '-',
      })),
      ...(detail.value.points || []).map((row) => ({
        ...row,
        _kind: 'points',
        categoryLabel: '动作点位',
        owner: machineMap.value.get(String(row.machineId)) || row.machineId,
        coordinate: `X ${row.x} / Y ${row.y} / Z ${row.z} / R ${row.rx}/${row.ry}/${row.rz}`,
        relation: nodeMap.value.get(String(row.navNodeId))?.code || row.navNodeId || '-',
      })),
    ]
  }
  return [
    ...(detail.value.nodes || []).map((row) => ({
      ...row,
      _kind: 'nodes',
      categoryLabel: '通行节点',
      route: '-',
      coordinate: `X ${row.x} / Y ${row.y} / θ ${row.yaw}°`,
      rule: row.type,
    })),
    ...(detail.value.links || []).map((row) => ({
      ...row,
      _kind: 'links',
      name: `${nodeMap.value.get(String(row.startNodeId))?.name || row.startNodeId} → ${nodeMap.value.get(String(row.endNodeId))?.name || row.endNodeId}`,
      categoryLabel: '通行连接',
      route: `${nodeMap.value.get(String(row.startNodeId))?.code || row.startNodeId} → ${nodeMap.value.get(String(row.endNodeId))?.code || row.endNodeId}`,
      coordinate: '-',
      rule: `${row.direction === 'BIDIRECTIONAL' ? '双向' : '单向'} / ${row.speedLimit} m/s`,
    })),
  ]
})

function clearForm(kind) {
  Object.keys(form).forEach((key) => delete form[key])
  if (kind === 'machines') Object.assign(form, { code: '', name: '', type: 'MACHINE', anchorX: 0, anchorY: 0, anchorYaw: 0 })
  if (kind === 'points') Object.assign(form, { machineId: detail.value?.machines?.[0]?.id || '', locationId: '', navNodeId: '', code: '', name: '', type: 'ACTION_POINT', frame: 'MAP', x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 })
  if (kind === 'nodes') Object.assign(form, { code: '', name: '', type: 'NAVIGATION', locationId: '', x: 0, y: 0, yaw: 0 })
  if (kind === 'links') Object.assign(form, { code: '', startNodeId: detail.value?.nodes?.[0]?.id || '', endNodeId: detail.value?.nodes?.[1]?.id || '', direction: 'ONE_WAY', speedLimit: 0.6 })
}

function openCreate(kind) {
  if (!editable.value) return ElMessage.warning('已发布配置为只读，请先在地图信息页创建草稿')
  if (kind === 'points' && !detail.value?.machines?.length) return ElMessage.warning('请先新增机台')
  if (kind === 'links' && (detail.value?.nodes?.length || 0) < 2) return ElMessage.warning('至少需要两个通行节点')
  entityKind.value = kind
  editingId.value = null
  clearForm(kind)
  dialogVisible.value = true
}

function openEdit(row) {
  if (!editable.value) return ElMessage.warning('已发布配置为只读，请先创建草稿')
  entityKind.value = row._kind
  editingId.value = row.id
  clearForm(row._kind)
  Object.keys(form).forEach((key) => { if (row[key] != null) form[key] = row[key] })
  dialogVisible.value = true
}

function payload() {
  const kind = entityKind.value
  if (kind === 'machines') return { code: form.code.trim(), name: form.name.trim(), type: form.type.trim(), anchorX: Number(form.anchorX), anchorY: Number(form.anchorY), anchorYaw: Number(form.anchorYaw) }
  if (kind === 'points') return { machineId: Number(form.machineId), locationId: form.locationId === '' ? undefined : Number(form.locationId), navNodeId: form.navNodeId === '' ? undefined : Number(form.navNodeId), code: form.code.trim(), name: form.name.trim(), type: form.type.trim(), frame: form.frame, x: Number(form.x), y: Number(form.y), z: Number(form.z), rx: Number(form.rx), ry: Number(form.ry), rz: Number(form.rz) }
  if (kind === 'nodes') return { code: form.code.trim(), name: form.name.trim(), type: form.type.trim(), locationId: form.locationId === '' ? undefined : Number(form.locationId), x: Number(form.x), y: Number(form.y), yaw: Number(form.yaw) }
  return { code: form.code.trim(), startNodeId: Number(form.startNodeId), endNodeId: Number(form.endNodeId), direction: form.direction, speedLimit: Number(form.speedLimit) }
}

async function submit() {
  const data = payload()
  if (!data.code || ('name' in data && !data.name)) return ElMessage.warning('请完整填写编号和名称')
  if (entityKind.value === 'links' && data.startNodeId === data.endNodeId) return ElMessage.warning('起点和终点不能相同')
  try {
    await saveLabEntity(configId.value, entityKind.value, editingId.value, data)
    ElMessage.success(editingId.value == null ? '配置项已新增' : '配置项已更新')
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确认删除“${row.name || row.code}”吗？`, '删除配置项', { type: 'warning' })
    await deleteLabEntity(configId.value, row._kind, row.id)
    ElMessage.success('配置项已删除')
    await load()
  } catch (error) {
    if (!['cancel', 'close'].includes(error)) ElMessage.error(error.message)
  }
}

async function load() {
  loading.value = true
  try {
    const lab = await getLaboratory()
    const config = lab?.draft || lab?.published
    configId.value = config?.configId ?? config?.id
    detail.value = configId.value ? await getLabConfig(configId.value) : null
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-view lab-resource-view">
    <PageHeader :title="title" :description="description">
      <template v-if="isStations">
        <el-button :icon="Plus" :disabled="!editable" @click="openCreate('machines')">新增机台</el-button>
        <el-button type="primary" :icon="Plus" :disabled="!editable" @click="openCreate('points')">新增点位</el-button>
      </template>
      <template v-else>
        <el-button :icon="Plus" :disabled="!editable" @click="openCreate('nodes')">新增节点</el-button>
        <el-button type="primary" :icon="Plus" :disabled="!editable" @click="openCreate('links')">新增连接</el-button>
        <el-button type="primary" plain @click="pathDialogVisible = true">进入路径管理</el-button>
      </template>
    </PageHeader>

    <section class="page-card table-card">
      <ResourceTabs :tabs="tabs" />
      <div class="section-heading"><div><h2>{{ title }}列表</h2><p>实验室配置 #{{ configId || '-' }} · R{{ detail?.revision || '-' }} · {{ editable ? '草稿可编辑' : '发布版只读' }}</p></div><el-button :icon="Refresh" @click="load">刷新</el-button></div>

      <el-table v-loading="loading" :data="rows" :row-key="(row) => `${row._kind}-${row.id}`">
        <template v-if="isStations">
          <el-table-column label="机台 / 点位" min-width="190"><template #default="{ row }"><div class="stacked-cell"><strong>{{ row.name }}</strong><span>{{ row.code }}</span></div></template></el-table-column>
          <el-table-column prop="type" label="类型" min-width="125" /><el-table-column label="所属空间（地图）" min-width="150"><template #default>实验室主空间</template></el-table-column>
          <el-table-column prop="owner" label="所属对象" min-width="145" /><el-table-column prop="frame" label="坐标系" width="95"><template #default="{ row }">{{ row.frame || 'MAP' }}</template></el-table-column><el-table-column prop="coordinate" label="坐标值" min-width="250" />
          <el-table-column prop="relation" label="关联导航点" min-width="125" />
        </template>
        <template v-else>
          <el-table-column prop="code" label="节点编号" min-width="140" /><el-table-column prop="name" label="名称" min-width="190" />
          <el-table-column prop="categoryLabel" label="节点类型" width="110" /><el-table-column label="所属空间（地图）" min-width="150"><template #default>实验室主空间</template></el-table-column>
          <el-table-column prop="coordinate" label="地图坐标（X / Y / θ）" min-width="210" /><el-table-column prop="rule" label="通行规则" min-width="180" />
        </template>
        <el-table-column label="状态" width="100"><template #default><el-tag :type="editable ? 'warning' : 'success'">{{ editable ? '草稿' : '已发布' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" fixed="right" width="120"><template #default="{ row }"><div class="row-actions"><el-button link type="danger" :disabled="!editable" @click="remove(row)">删除</el-button><el-button link type="primary" :disabled="!editable" @click="openEdit(row)">编辑</el-button></div></template></el-table-column>
        <template #empty><el-empty :description="`当前配置暂无${title}数据`" /></template>
      </el-table>
      <div class="pagination-bar"><span>共 {{ rows.length }} 条数据</span><span>数据来源：实验室配置接口</span></div>
    </section>

    <el-dialog v-model="dialogVisible" :title="`${editingId == null ? '新增' : '编辑'}${entityKind === 'machines' ? '机台' : entityKind === 'points' ? '点位' : entityKind === 'nodes' ? '通行节点' : '通行连接'}`" width="720px" class="reference-dialog" destroy-on-close>
      <el-form label-position="top" class="dynamic-form">
        <template v-if="entityKind === 'machines'">
          <el-form-item label="机台编号" required><el-input v-model="form.code" /></el-form-item><el-form-item label="机台名称" required><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="机台类型" required><el-input v-model="form.type" /></el-form-item><el-form-item label="锚点 X"><el-input-number v-model="form.anchorX" style="width:100%" /></el-form-item>
          <el-form-item label="锚点 Y"><el-input-number v-model="form.anchorY" style="width:100%" /></el-form-item><el-form-item label="锚点航向角"><el-input-number v-model="form.anchorYaw" :min="-180" :max="180" style="width:100%" /></el-form-item>
        </template>
        <template v-else-if="entityKind === 'points'">
          <el-form-item label="点位编号" required><el-input v-model="form.code" /></el-form-item><el-form-item label="点位名称" required><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="点位类型"><el-input v-model="form.type" /></el-form-item><el-form-item label="所属机台" required><el-select v-model="form.machineId" style="width:100%"><el-option v-for="item in detail?.machines || []" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="坐标系"><el-select v-model="form.frame" style="width:100%"><el-option label="MAP" value="MAP" /><el-option label="MACHINE" value="MACHINE" /></el-select></el-form-item><el-form-item label="关联导航节点"><el-select v-model="form.navNodeId" clearable style="width:100%"><el-option v-for="item in detail?.nodes || []" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" /></el-select></el-form-item>
          <el-form-item v-for="key in ['x','y','z','rx','ry','rz']" :key="key" :label="key.toUpperCase()"><el-input-number v-model="form[key]" style="width:100%" /></el-form-item>
        </template>
        <template v-else-if="entityKind === 'nodes'">
          <el-form-item label="节点编号" required><el-input v-model="form.code" /></el-form-item><el-form-item label="节点名称" required><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="节点类型"><el-input v-model="form.type" /></el-form-item><el-form-item label="位置 ID"><el-input v-model="form.locationId" /></el-form-item>
          <el-form-item label="X"><el-input-number v-model="form.x" style="width:100%" /></el-form-item><el-form-item label="Y"><el-input-number v-model="form.y" style="width:100%" /></el-form-item><el-form-item label="航向角"><el-input-number v-model="form.yaw" :min="-180" :max="180" style="width:100%" /></el-form-item>
        </template>
        <template v-else>
          <el-form-item label="连接编号" required><el-input v-model="form.code" /></el-form-item><el-form-item label="方向"><el-select v-model="form.direction" style="width:100%"><el-option label="单向" value="ONE_WAY" /><el-option label="双向" value="BIDIRECTIONAL" /></el-select></el-form-item>
          <el-form-item label="起点" required><el-select v-model="form.startNodeId" style="width:100%"><el-option v-for="item in detail?.nodes || []" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" /></el-select></el-form-item><el-form-item label="终点" required><el-select v-model="form.endNodeId" style="width:100%"><el-option v-for="item in detail?.nodes || []" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="限速 m/s"><el-input-number v-model="form.speedLimit" :min="0.1" :step="0.1" style="width:100%" /></el-form-item>
        </template>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="pathDialogVisible" title="路径管理" width="860px" class="reference-dialog">
      <p class="dialog-description">查看导航连接关系、方向和限速；连接的新增与编辑仍通过页面操作完成。</p>
      <el-table :data="detail?.links || []" max-height="420"><el-table-column prop="code" label="连接编号" min-width="140" /><el-table-column label="起点" min-width="160"><template #default="{ row }">{{ nodeMap.get(String(row.startNodeId))?.name || row.startNodeId }}</template></el-table-column><el-table-column label="终点" min-width="160"><template #default="{ row }">{{ nodeMap.get(String(row.endNodeId))?.name || row.endNodeId }}</template></el-table-column><el-table-column label="方向" width="110"><template #default="{ row }">{{ row.direction === 'BIDIRECTIONAL' ? '双向' : '单向' }}</template></el-table-column><el-table-column prop="speedLimit" label="限速 m/s" width="110" /></el-table>
      <template #footer><el-button type="primary" @click="pathDialogVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>
