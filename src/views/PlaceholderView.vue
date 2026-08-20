<script setup>
import { Construction } from '@lucide/vue'

import PageHeading from '@/components/common/PageHeading.vue'
</script>

<template>
  <section>
    <PageHeading />
    <div class="placeholder panel-card">
      <div class="placeholder__mark"><Construction :size="34" /></div>
      <h2>页面将在后续迭代中实现</h2>
      <p>当前版本优先完成“配置中心 → 实验室配置”，导航和整体框架已预留扩展位置。</p>
      <RouterLink to="/configuration/labs"
        ><el-button type="primary">进入实验室配置</el-button></RouterLink
      >
    </div>
  </section>
</template>

<style scoped lang="scss">
.placeholder {
  display: grid;
  min-height: 430px;
  padding: 50px 24px;
  text-align: center;
  place-items: center;
  align-content: center;
}

.placeholder__mark {
  display: grid;
  width: 74px;
  height: 74px;
  margin-bottom: 16px;
  color: var(--primary);
  background: var(--primary-soft);
  border: 1px solid #cee2f2;
  border-radius: 20px;
  place-items: center;
}

h2 {
  margin: 0;
  font-size: 21px;
}

p {
  max-width: 520px;
  margin: 11px 0 22px;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
