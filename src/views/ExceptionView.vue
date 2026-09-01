<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { appState, updateRecord } from '../stores/appStore'

const props = defineProps({
  mode: { type: String, default: 'anomalies' },
})

const router = useRouter()
const keyword = ref('')
const level = ref('全部')
const status = ref('全部')
const detailVisible = ref(false)
const actionVisible = ref(false)
const current = ref(null)
const actionForm = reactive({ owner: '陈工', note: '', action: '继续任务', conclusion: '待确认' })
const recoveryMode = ref('继续运行')
const resultNote = ref('')

const tabs = [
  { label: '当前异常', path: '/operations/anomalies', mode: 'anomalies' },
  { label: '历史告警', path: '/operations/alarms', mode: 'alarms' },
  { label: '恢复任务', path: '/operations/recovery', mode: 'recoveryTasks' },
]

const metadata = computed(() => ({
  anomalies: { title: '历史异常与恢复', listTitle: '当前异常', description: '集中处理设备、任务与资源异常，跟踪责任人及恢复进度。' },
  alarms: { title: '历史异常与恢复', listTitle: '告警记录', description: '查询已关闭或已恢复的告警事件与处理结果。' },
  recoveryTasks: { title: '历史异常与恢复', listTitle: '恢复检查记录', description: '核对物理状态和系统状态，安全恢复中断的运输任务。' },
}[props.mode]))

const sourceRows = computed(() => appState[props.mode] || [])
const rows = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return sourceRows.value.filter((row) => {
    const textMatched = !query || Object.values(row).join(' ').toLowerCase().includes(query)
    const levelMatched = level.value === '全部' || row.level === level.value
    const statusMatched = status.value === '全部' || row.status === status.value || row.consistency === status.value
    return textMatched && levelMatched && statusMatched
  })
})

const summary = computed(() => {
  if (props.mode === 'recoveryTasks') {
    return [
      { label: '待恢复任务', value: sourceRows.value.length, tone: 'blue' },
      { label: '状态一致', value: sourceRows.value.filter((item) => item.consistency === '一致').length, tone: 'green' },
      { label: '需要核对', value: sourceRows.value.filter((item) => item.consistency !== '一致').length, tone: 'orange' },
    ]
  }
  return [
    { label: '事件总数', value: sourceRows.value.length, tone: 'blue' },
    { label: '严重', value: sourceRows.value.filter((item) => item.level === '严重').length, tone: 'red' },
    { label: props.mode === 'anomalies' ? '处理中' : '已恢复', value: sourceRows.value.filter((item) => ['处理中', '已恢复'].includes(item.status)).length, tone: 'green' },
  ]
})

function tagType(value) {
  if (['严重', '待处理', '不一致'].includes(value)) return 'danger'
  if (['警告', '处理中', '待确认'].includes(value)) return 'warning'
  if (['已确认', '已恢复', '已关闭', '一致'].includes(value)) return 'success'
  return 'info'
}

function showDetail(row) {
  current.value = row
  detailVisible.value = true
}

function showAction(row) {
  current.value = row
  actionForm.owner = row.owner && row.owner !== '未分配' ? row.owner : '陈工'
  actionForm.note = ''
  actionForm.action = row.action || '继续任务'
  actionForm.conclusion = row.consistency || '待确认'
  recoveryMode.value = '继续运行'
  resultNote.value = ''
  actionVisible.value = true
}

async function confirmAction(modeChoice = recoveryMode.value) {
  if (props.mode === 'anomalies') {
    updateRecord('anomalies', current.value.id, {
      status: resultNote.value.trim() ? '已恢复' : '处理中',
      owner: actionForm.owner,
      recoveryMode: modeChoice,
      result: resultNote.value || `${modeChoice}方案已确认`,
    })
  } else if (props.mode === 'recoveryTasks') {
    updateRecord('recoveryTasks', current.value.id, {
      consistency: actionForm.conclusion,
      action: actionForm.action,
    })
  }
  actionVisible.value = false
  ElMessage.success('处理信息已保存')
}

async function closeAnomaly(row) {
  await ElMessageBox.confirm(`确认将 ${row.code} 标记为已确认？`, '确认异常', { type: 'warning' })
  updateRecord('anomalies', row.id, { status: '已确认', owner: row.owner === '未分配' ? '当前用户' : row.owner })
  ElMessage.success('异常已确认')
}
</script>

<template>
  <section class="page-view">
    <PageHeader :title="metadata.title" :description="metadata.description">
      <template #actions>
        <el-button @click="router.push('/operations/logs')">查看系统日志</el-button>
        <el-button type="primary" @click="ElMessage.success('异常数据已刷新')">刷新数据</el-button>
      </template>
    </PageHeader>

    <div class="subnav-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="subnav-tab"
        :class="{ active: tab.mode === mode }"
        @click="router.push(tab.path)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="metric-grid metric-grid--three">
      <article v-for="item in summary" :key="item.label" class="metric-card" :class="`metric-card--${item.tone}`">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div class="content-card exception-list-card">
      <div class="card-heading"><div><h3>{{ metadata.listTitle }}</h3><p>{{ mode === 'recoveryTasks' ? '恢复结果规则：物理状态、系统状态和任务检查点必须一致' : '点击详情查看完整事件与处置记录' }}</p></div></div>
      <div class="filter-bar">
        <el-input v-model="keyword" clearable placeholder="搜索编号、来源、任务或内容" class="filter-search" />
        <el-select v-if="mode !== 'recoveryTasks'" v-model="level" class="filter-select">
          <el-option v-for="item in ['全部', '严重', '警告', '提示']" :key="item" :label="`等级：${item}`" :value="item" />
        </el-select>
        <el-select v-model="status" class="filter-select">
          <el-option
            v-for="item in mode === 'recoveryTasks' ? ['全部', '一致', '不一致', '待确认'] : ['全部', '待处理', '处理中', '已确认', '已恢复', '已关闭']"
            :key="item"
            :label="`状态：${item}`"
            :value="item"
          />
        </el-select>
      </div>

      <el-table v-if="mode !== 'recoveryTasks'" :data="rows" stripe>
        <el-table-column prop="code" :label="mode === 'anomalies' ? '异常编号' : '告警编号'" min-width="178" />
        <el-table-column prop="time" label="发生时间" min-width="168" />
        <el-table-column label="等级" width="92">
          <template #default="{ row }"><el-tag :type="tagType(row.level)" effect="light">{{ row.level }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="105">
          <template #default="{ row }"><el-tag :type="tagType(row.status)">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="类型" min-width="130"><template #default="{ row }">{{ row.source.includes('AGV') ? '车辆异常' : row.source.includes('库位') ? '状态不一致' : '设备异常' }}</template></el-table-column>
        <el-table-column prop="title" :label="mode === 'anomalies' ? '异常内容' : '告警内容'" min-width="250" show-overflow-tooltip />
        <el-table-column prop="source" :label="mode === 'anomalies' ? '异常对象' : '来源模块'" min-width="135" />
        <el-table-column v-if="mode === 'anomalies'" prop="object" label="关联对象" min-width="140" />
        <template v-else><el-table-column label="异常对象" min-width="130"><template #default="{ row }">{{ row.source }}</template></el-table-column><el-table-column label="AGV" width="95"><template #default="{ row }">{{ row.source.startsWith('AGV') ? row.source : '-' }}</template></el-table-column></template>
        <el-table-column v-if="mode === 'anomalies'" prop="owner" label="负责人" width="105" /><el-table-column v-else label="负责人" width="105"><template #default>系统</template></el-table-column>
        <el-table-column label="操作" fixed="right" width="185">
          <template #default="{ row }">
              <TableActionButton kind="view" label="查看详情" @click="showDetail(row)"/>
            <template v-if="mode === 'anomalies'">
                <TableActionButton kind="edit" label="分派" @click="showAction(row)"/>
                <TableActionButton v-if="row.status !== '已确认'" kind="toggle" label="确认" active @click="closeAnomaly(row)"/>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-table v-else :data="rows" stripe>
        <el-table-column prop="task" label="检查编号" min-width="150" />
        <el-table-column label="检查类型" min-width="150"><template #default>任务恢复状态核对</template></el-table-column>
        <el-table-column prop="order" label="关联对象" min-width="180" />
        <el-table-column prop="checkpoint" label="触发原因" min-width="190" />
        <el-table-column label="当前结论" min-width="180"><template #default="{ row }"><div class="stacked-cell"><strong>{{ row.consistency }}</strong><span>{{ row.physical }} / {{ row.system }}</span></div></template></el-table-column>
        <el-table-column label="一致性" width="100">
          <template #default="{ row }"><el-tag :type="tagType(row.consistency)">{{ row.consistency }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="action" label="建议动作" min-width="120" />
        <el-table-column label="操作" fixed="right" width="135">
          <template #default="{ row }">
              <TableActionButton kind="view" label="检查结果" @click="showDetail(row)"/>
              <TableActionButton kind="publish" label="发起检查" @click="showAction(row)"/>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" :title="mode === 'recoveryTasks' ? '恢复检查结果' : mode === 'alarms' ? '告警详情' : '异常详情'" width="760px" class="reference-dialog">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item v-for="(value, key) in current" :key="key" :label="key">{{ value }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="mode === 'anomalies'" class="exception-flow"><span class="done">异常上报</span><i /><span :class="{ done: current?.status !== '待处理' }">方案确认</span><i /><span :class="{ done: current?.status === '已恢复' }">处理完成</span></div>
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <el-dialog v-model="actionVisible" :title="mode === 'recoveryTasks' ? '发起恢复检查' : '异常恢复处置'" width="620px" class="reference-dialog">
      <template v-if="mode === 'anomalies'"><p class="dialog-description">选择安全处置方式，确认后由负责人执行并提交最终处理结果。</p><div class="recovery-options"><button :class="['recovery-option',{selected:recoveryMode==='继续运行'}]" @click="recoveryMode='继续运行'"><strong>继续运行</strong><span>确认环境安全后，从当前检查点继续</span></button><button :class="['recovery-option',{selected:recoveryMode==='人工处置'}]" @click="recoveryMode='人工处置'"><strong>人工处置</strong><span>暂停任务，由现场人员完成状态核对</span></button></div><el-form label-position="top" class="exception-action-form"><el-form-item label="负责人"><el-select v-model="actionForm.owner" class="full-width"><el-option v-for="name in ['陈工', '王工', '当前用户']" :key="name" :label="name" :value="name" /></el-select></el-form-item><el-form-item label="处理方案说明"><el-input v-model="actionForm.note" type="textarea" :rows="3" placeholder="请输入处置步骤或安全确认内容" /></el-form-item><el-form-item label="处理结果（完成后填写）"><el-input v-model="resultNote" type="textarea" :rows="3" placeholder="填写后提交将把异常标记为已恢复" /></el-form-item></el-form></template>
      <el-form v-else label-position="top" class="two-column-form"><el-form-item label="检查类型"><el-select model-value="任务恢复状态核对"><el-option label="任务恢复状态核对" value="任务恢复状态核对" /><el-option label="载具位置核对" value="载具位置核对" /></el-select></el-form-item><el-form-item label="关联对象"><el-input :model-value="current?.order" disabled /></el-form-item><el-form-item label="触发原因" class="form-wide"><el-input :model-value="current?.checkpoint" disabled /></el-form-item><el-form-item label="恢复动作"><el-select v-model="actionForm.action"><el-option v-for="name in ['继续任务', '重置检查点', '补录反馈', '取消任务']" :key="name" :label="name" :value="name" /></el-select></el-form-item><el-form-item label="当前结论"><el-select v-model="actionForm.conclusion"><el-option label="一致" value="一致" /><el-option label="不一致" value="不一致" /><el-option label="待确认" value="待确认" /></el-select></el-form-item><el-form-item label="检查说明" class="form-wide"><el-input v-model="actionForm.note" type="textarea" :rows="4" placeholder="请输入物理状态与系统状态核对结果" /></el-form-item></el-form>
      <template #footer><el-button @click="actionVisible = false">取消</el-button><el-button v-if="mode === 'anomalies'" @click="confirmAction('人工处置')">确认人工处置方案</el-button><el-button type="primary" @click="confirmAction(mode === 'anomalies' ? '继续运行' : recoveryMode)">{{ mode === 'anomalies' ? (resultNote ? '提交处理结果' : '确认继续方案') : '发起检查' }}</el-button></template>
    </el-dialog>
  </section>
</template>
