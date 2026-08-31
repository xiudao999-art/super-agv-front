<script setup>
import { useRoute, useRouter } from 'vue-router'

defineProps({ tabs: { type: Array, required: true } })
const route = useRoute()
const router = useRouter()
</script>

<template>
  <el-tabs class="resource-tabs" :model-value="route.path" @tab-change="router.push($event)">
    <el-tab-pane v-for="tab in tabs" :key="tab.path" :label="tab.label" :name="tab.path" />
  </el-tabs>
</template>
