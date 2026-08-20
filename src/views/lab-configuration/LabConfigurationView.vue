<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ShieldCheck } from '@lucide/vue'

import PageHeading from '@/components/common/PageHeading.vue'
import LabMachinesPanel from '@/components/lab/LabMachinesPanel.vue'
import LabMapDialog from '@/components/lab/LabMapDialog.vue'
import LabMapPanel from '@/components/lab/LabMapPanel.vue'
import LabPeripheralsPanel from '@/components/lab/LabPeripheralsPanel.vue'
import LabRecordDialog from '@/components/lab/LabRecordDialog.vue'
import LabTopologyPanel from '@/components/lab/LabTopologyPanel.vue'
import pageMockData from './mockdata.json'

const router = useRouter()
const activeTab = ref('spaces')
const configuration = reactive(structuredClone(pageMockData))
const recordDialogVisible = ref(false)
const mapDialogVisible = ref(false)
const editingSection = ref('spaces')
const editingRecord = ref(null)
const editingPreset = ref({})
const selectedSpace = ref(null)
const mapDialogFocus = ref('map')
const saving = ref(false)
const connectionTesting = ref(false)

const tabItems = [
  { name: 'spaces', label: '地图信息' },
  { name: 'topology', label: '通行规则' },
  { name: 'machines', label: '机台与点位' },
  { name: 'peripherals', label: '外围资源' },
]

const sectionLabels = {
  spaces: '实验室空间',
  topology: '通行规则',
  machines: '机台或点位',
  peripherals: '外围资源',
}

const openCreate = (section, preset = {}) => {
  editingSection.value = section
  editingRecord.value = null
  editingPreset.value = preset
  recordDialogVisible.value = true
}

const openEdit = (section, record) => {
  editingSection.value = section
  editingRecord.value = record
  editingPreset.value = {}
  recordDialogVisible.value = true
}

const saveRecord = async ({ section, record, isEditing }) => {
  const records = configuration[section]
  const existingIndex = records.findIndex((item) => item.id === record.id)

  if (!isEditing && existingIndex >= 0) {
    ElMessage.error(`配置编号 ${record.id} 已存在，请更换编号`)
    return
  }

  saving.value = true
  try {
    // 当前阶段维护页面内存数据，刷新页面后恢复初始配置。
    if (existingIndex >= 0) records.splice(existingIndex, 1, record)
    else records.unshift(record)
    recordDialogVisible.value = false
    ElMessage.success(`${sectionLabels[section]}已保存`)
  } finally {
    saving.value = false
  }
}

const removeRecord = async (section, record) => {
  const displayName = record.name || record.id
  try {
    await ElMessageBox.confirm(`确定删除“${displayName}”吗？`, `删除${sectionLabels[section]}`, {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  const index = configuration[section].findIndex((item) => item.id === record.id)
  if (index >= 0) configuration[section].splice(index, 1)
  ElMessage.success('配置记录已删除')
}

const openMapDialog = (space, focus) => {
  selectedSpace.value = space
  mapDialogFocus.value = focus
  mapDialogVisible.value = true
}

const testPeripheralConnection = async () => {
  connectionTesting.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 600))
    ElMessage.success('4 个外围资源连接测试通过')
  } finally {
    connectionTesting.value = false
  }
}

const validateConfiguration = () => {
  const recordCount = Object.values(configuration).reduce(
    (total, records) => total + records.length,
    0,
  )
  ElMessage.success(`配置校验通过：共核对 ${recordCount} 条配置记录`)
}
</script>

<template>
  <section class="lab-configuration-page">
    <PageHeading>
      <template #actions>
        <div class="heading-actions">
          <el-button type="primary" @click="validateConfiguration"
            ><ShieldCheck :size="16" />配置校验</el-button
          >
        </div>
      </template>
    </PageHeading>

    <div class="configuration-tabs panel-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane v-for="tab in tabItems" :key="tab.name" :name="tab.name">
          <template #label>
            <span class="tab-label"
              >{{ tab.label }}<b>{{ configuration[tab.name].length }}</b></span
            >
          </template>

          <LabMapPanel
            v-if="tab.name === 'spaces'"
            :rows="configuration.spaces"
            @create="openCreate('spaces')"
            @edit="openEdit('spaces', $event)"
            @remove="removeRecord('spaces', $event)"
            @view-map="openMapDialog($event, 'map')"
            @view-points="openMapDialog($event, 'points')"
          />
          <LabTopologyPanel
            v-else-if="tab.name === 'topology'"
            :rows="configuration.topology"
            @create="openCreate('topology', $event)"
            @edit="openEdit('topology', $event)"
            @remove="removeRecord('topology', $event)"
            @go-paths="router.push('/configuration/paths')"
          />
          <LabMachinesPanel
            v-else-if="tab.name === 'machines'"
            :rows="configuration.machines"
            @create="openCreate('machines', $event)"
            @edit="openEdit('machines', $event)"
            @remove="removeRecord('machines', $event)"
          />
          <LabPeripheralsPanel
            v-else
            :rows="configuration.peripherals"
            :testing="connectionTesting"
            @create="openCreate('peripherals')"
            @edit="openEdit('peripherals', $event)"
            @remove="removeRecord('peripherals', $event)"
            @test-connection="testPeripheralConnection"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <LabRecordDialog
      v-model="recordDialogVisible"
      :section="editingSection"
      :record="editingRecord"
      :preset="editingPreset"
      :saving="saving"
      @save="saveRecord"
    />
    <LabMapDialog v-model="mapDialogVisible" :space="selectedSpace" :focus="mapDialogFocus" />
  </section>
</template>

<style scoped lang="scss">
.heading-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.configuration-tabs {
  padding: 0 20px 20px;
  overflow: hidden;
}

.configuration-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.configuration-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: var(--border);
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.tab-label b {
  display: grid;
  min-width: 21px;
  height: 21px;
  padding: 0 5px;
  color: var(--text-secondary);
  background: #edf2f6;
  border-radius: 999px;
  place-items: center;
  font-family: Bahnschrift, sans-serif;
  font-size: 10px;
}

.el-tabs__item.is-active .tab-label b {
  color: var(--primary);
  background: var(--primary-soft);
}

@media (max-width: 760px) {
  .heading-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .configuration-tabs {
    padding: 0 11px 13px;
  }
}
</style>
