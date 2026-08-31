<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Lock, User } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const form = reactive({ account: localStorage.getItem('agv-account') || 'admin', password: '123456', remember: true })

async function login() {
  if (!form.account.trim() || !form.password.trim()) return ElMessage.warning('请输入账号和密码')
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 350))
  if (form.remember) localStorage.setItem('agv-account', form.account)
  else localStorage.removeItem('agv-account')
  sessionStorage.setItem('agv-session', form.account)
  ElMessage.success('登录成功')
  router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')
}
</script>

<template>
  <main class="login-page">
    <section class="login-visual">
      <div class="login-copy">
        <span>SMART AGV CONTROL</span>
        <h1>让每一台设备<br />高效协同运行</h1>
        <p>统一管理订单、流程、地图与机器人任务，实时掌握现场运行状态。</p>
      </div>
      <div class="route-art" aria-hidden="true">
        <svg viewBox="0 0 720 360">
          <path class="grid" d="M30 70H690M30 150H690M30 230H690M30 310H690M110 30V335M240 30V335M370 30V335M500 30V335M630 30V335" />
          <path class="route" d="M70 290H240V120H480V220H650" />
          <circle cx="70" cy="290" r="12" /><circle cx="240" cy="120" r="12" /><circle cx="480" cy="220" r="12" /><circle cx="650" cy="220" r="18" />
          <g class="vehicle" transform="translate(320 94)"><rect width="82" height="50" rx="12" /><path d="M19 18h44M24 32h34" /><circle cx="18" cy="48" r="5" /><circle cx="64" cy="48" r="5" /></g>
        </svg>
      </div>
      <small>AGV · ROBOT · WORKFLOW · DIGITAL MAP</small>
    </section>
    <section class="login-panel">
      <div class="login-card">
        <span class="login-eyebrow">欢迎回来</span>
        <h2>登录系统</h2>
        <p>请输入账号信息进入管理平台</p>
        <el-form label-position="top" size="large" @submit.prevent="login">
          <el-form-item label="账号"><el-input v-model="form.account" :prefix-icon="User" placeholder="请输入账号" @keyup.enter="login" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="form.password" :prefix-icon="Lock" type="password" show-password placeholder="请输入密码" @keyup.enter="login" /></el-form-item>
          <div class="login-options"><el-checkbox v-model="form.remember">记住账号</el-checkbox><el-button link type="primary" @click="ElMessage.info('请联系系统管理员重置密码')">忘记密码</el-button></div>
          <el-button class="login-submit" type="primary" :loading="loading" :icon="ArrowRight" @click="login">登录</el-button>
        </el-form>
        <p class="login-demo">静态演示：输入任意账号和密码即可登录</p>
      </div>
      <small>© 2026 · v2.3 · Vue</small>
    </section>
  </main>
</template>
