<script setup>
import { computed, reactive, ref, toRaw, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  section: { type: String, default: 'spaces' },
  record: { type: Object, default: null },
  preset: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'save'])
const formRef = ref()
const form = reactive({})
const cloneValue = (value) => structuredClone(toRaw(value))

const sectionConfigs = {
  spaces: {
    label: '实验室空间',
    idPrefix: 'SPACE-',
    defaults: { status: '草稿', mapVersion: 'V0.1', navPoints: [] },
    fields: [
      { prop: 'id', label: '空间编号', placeholder: '例如 SPACE-LAB-C' },
      { prop: 'name', label: '空间名称', placeholder: '例如 实验室 C' },
      { prop: 'mapName', label: '地图名称', placeholder: '例如 实验室总览地图' },
      { prop: 'mapVersion', label: '地图版本', placeholder: '例如 V1.0' },
      { prop: 'fileName', label: '地图文件名', placeholder: '请输入地图文件名称' },
      { prop: 'scope', label: '空间内对象', type: 'textarea', placeholder: '多个对象使用顿号分隔' },
      { prop: 'status', label: '状态', type: 'select', options: ['草稿', '待发布', '已发布'] },
    ],
  },
  topology: {
    label: '通行规则',
    idPrefix: 'N-',
    defaults: { type: '导航节点', status: '有效' },
    fields: [
      { prop: 'id', label: '节点编号', placeholder: '例如 N20' },
      { prop: 'name', label: '名称', placeholder: '输入节点或连接名称' },
      {
        prop: 'type',
        label: '节点类型',
        type: 'select',
        options: ['导航节点', '路径节点', '等待资源', '通行连接'],
      },
      {
        prop: 'spaceMap',
        label: '所属空间（地图）',
        placeholder: '例如 实验室 A / 实验室总览地图 V3.2',
      },
      {
        prop: 'coordinate',
        label: '地图坐标（X / Y / θ）',
        placeholder: '例如 12.600 / 6.200 / 90.0°',
      },
      { prop: 'rule', label: '通行规则', placeholder: '例如 双向通行、限速 0.6 m/s' },
      { prop: 'status', label: '状态', type: 'select', options: ['有效', '草稿', '停用'] },
    ],
  },
  machines: {
    label: '机台或点位',
    idPrefix: 'POINT-',
    defaults: { type: '导航停靠点', status: '草稿', owner: '—' },
    fields: [
      { prop: 'id', label: '配置编号', placeholder: '例如 DEVICE-C-DOCK' },
      { prop: 'name', label: '名称', placeholder: '输入机台或点位名称' },
      {
        prop: 'type',
        label: '类型',
        type: 'select',
        options: ['检测机台', '导航停靠点', '机械臂抓取点', '机械臂放料点', '安全位'],
      },
      {
        prop: 'spaceMap',
        label: '所属空间（地图）',
        placeholder: '例如 实验室 A / 实验室总览地图 V3.2',
      },
      { prop: 'owner', label: '所属对象', required: false, placeholder: '机台本身可填写 —' },
      {
        prop: 'coordinateSystem',
        label: '坐标系',
        type: 'select',
        options: ['空间地图坐标系', '机台坐标系', '机械臂基坐标系'],
      },
      { prop: 'coordinate', label: '坐标值', placeholder: '必须包含坐标系要求的完整位姿' },
      { prop: 'navPoint', label: '关联导航点', placeholder: '例如 DEVICE-C-DOCK' },
      {
        prop: 'status',
        label: '状态',
        type: 'select',
        options: ['草稿', '启用', '已发布', '停用'],
      },
    ],
  },
  peripherals: {
    label: '外围资源',
    idPrefix: 'RES-',
    defaults: { type: '自动门', status: '草稿' },
    fields: [
      { prop: 'id', label: '资源编号', placeholder: '例如 D-02' },
      { prop: 'name', label: '资源名称', placeholder: '输入门、电梯或充电桩名称' },
      { prop: 'type', label: '资源类型', type: 'select', options: ['自动门', '电梯', '充电桩'] },
      {
        prop: 'spaceMap',
        label: '所属 / 连接空间（地图）',
        placeholder: '跨空间资源请填写两端空间',
      },
      { prop: 'coordinate', label: '地图坐标或两端连接点', placeholder: '输入完整坐标与朝向' },
      { prop: 'navPoint', label: '关联导航点', placeholder: '例如 DOOR-A-02' },
      {
        prop: 'status',
        label: '状态',
        type: 'select',
        options: ['草稿', '在线', '可用', '备用', '停用'],
      },
    ],
  },
}

const currentConfig = computed(() => sectionConfigs[props.section] || sectionConfigs.spaces)
const dialogTitle = computed(() => `${props.record ? '编辑' : '新增'}${currentConfig.value.label}`)
const rules = computed(() =>
  Object.fromEntries(
    currentConfig.value.fields
      .filter((field) => field.required !== false)
      .map((field) => [
        field.prop,
        [
          {
            required: true,
            message: `请输入${field.label}`,
            trigger: field.type === 'select' ? 'change' : 'blur',
          },
        ],
      ]),
  ),
)

const createDefaultId = () => {
  const tail = String(Date.now()).slice(-5)
  return `${currentConfig.value.idPrefix}${tail}`
}

const initializeForm = () => {
  Object.keys(form).forEach((key) => delete form[key])
  const initialValue = props.record
    ? cloneValue(props.record)
    : {
        id: createDefaultId(),
        ...cloneValue(currentConfig.value.defaults),
        ...cloneValue(props.preset),
      }
  Object.assign(form, initialValue)
}

watch(
  () => [props.modelValue, props.section, props.record, props.preset],
  ([visible]) => {
    if (visible) initializeForm()
  },
  { immediate: true, deep: true },
)

const close = () => emit('update:modelValue', false)

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('save', {
    section: props.section,
    record: cloneValue(form),
    isEditing: Boolean(props.record),
  })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="min(720px, 94vw)"
    :close-on-click-modal="false"
    @close="close"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="record-form">
      <el-form-item
        v-for="field in currentConfig.fields"
        :key="field.prop"
        :label="field.label"
        :prop="field.prop"
        :class="{
          'is-full-row':
            field.type === 'textarea' || field.prop === 'coordinate' || field.prop === 'spaceMap',
        }"
      >
        <el-select
          v-if="field.type === 'select'"
          v-model="form[field.prop]"
          :placeholder="`请选择${field.label}`"
        >
          <el-option
            v-for="option in field.options"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
        <el-input
          v-else-if="field.type === 'textarea'"
          v-model="form[field.prop]"
          type="textarea"
          :rows="3"
          :placeholder="field.placeholder"
          maxlength="200"
          show-word-limit
        />
        <el-input
          v-else
          v-model="form[field.prop]"
          :placeholder="field.placeholder"
          :disabled="Boolean(record) && field.prop === 'id'"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.record-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.record-form :deep(.el-select) {
  width: 100%;
}

.is-full-row {
  grid-column: 1 / -1;
}

@media (max-width: 600px) {
  .record-form {
    grid-template-columns: 1fr;
  }

  .is-full-row {
    grid-column: auto;
  }
}
</style>
