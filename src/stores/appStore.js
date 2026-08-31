import { reactive, watch } from 'vue'
import { seedState } from '../data/seed'

const STORAGE_KEY = 'agv-native-vue-state-v1'

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    const state = structuredClone(seedState)
    if (!saved || typeof saved !== 'object') return state
    Object.keys(state).forEach((key) => {
      if (Array.isArray(saved[key])) state[key] = saved[key]
    })
    return state
  } catch {
    return structuredClone(seedState)
  }
}

export const appState = reactive(loadState())

watch(
  appState,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true },
)

export function collection(name) {
  if (!Array.isArray(appState[name])) throw new Error(`未知数据集合：${name}`)
  return appState[name]
}

export function createRecord(name, payload) {
  const rows = collection(name)
  const id = Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1
  const record = { id, ...payload }
  rows.unshift(record)
  return record
}

export function updateRecord(name, id, payload) {
  const rows = collection(name)
  const index = rows.findIndex((row) => String(row.id) === String(id))
  if (index < 0) throw new Error('记录不存在')
  rows[index] = { ...rows[index], ...payload, id: rows[index].id }
  return rows[index]
}

export function removeRecord(name, id) {
  const rows = collection(name)
  const index = rows.findIndex((row) => String(row.id) === String(id))
  if (index < 0) return null
  return rows.splice(index, 1)[0]
}
