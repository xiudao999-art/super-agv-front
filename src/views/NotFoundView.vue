<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="not-found">
    <section>
      <span>404</span>
      <h1>页面不存在</h1>
      <p>当前地址没有对应的业务页面。</p>
      <el-button type="primary" @click="router.replace('/dashboard')">返回运行总览</el-button>
    </section>
  </main>
</template>

<style scoped>
.not-found {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f3f6f8;
  text-align: center;
}

section {
  width: min(420px, 100%);
  padding: 44px;
  border: 1px solid #e1e7ec;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 44px rgb(18 34 53 / 8%);
}

span {
  color: #1677c8;
  font-size: 54px;
  font-weight: 800;
}

h1 {
  margin: 12px 0 8px;
  font-size: 22px;
}

p {
  margin: 0 0 24px;
  color: #768392;
  font-size: 14px;
}
</style>
