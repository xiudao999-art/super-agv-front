<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Fold, UserFilled } from '@element-plus/icons-vue'
import { activeMenuForRoute, navigation } from '../config/navigation'

const route = useRoute()
const router = useRouter()
const mobileMenu = ref(false)
const statusVisible = ref(false)
const alertsVisible = ref(false)
const alertDetailVisible = ref(false)
const statusQueryVisible = ref(false)
const relatedTaskVisible = ref(false)
const handlingResultVisible = ref(false)
const handlingConclusion = ref('机台许可已恢复，任务可继续')
const handlingDescription = ref('')

const alertItems = [
  { title: '机台允许进样事件等待超过流程配置的30秒', code: 'ALM-20260817-0042', time: '2026-08-17 09:42:18', level: '严重', levelClass: 'danger', object: '贴标机台进样许可', impact: '运输任务保持在 W-B01；贴标机台进样位继续预约；后续同目标任务暂停派发', status: '待处理', statusClass: 'pending', owner: '陈工' },
  { title: '系统记录为空，但库位传感器检测有物', code: 'ALM-20260817-0041', time: '2026-08-17 09:36:54', level: '警告', levelClass: 'warning', object: '立库 A 第4层07位', impact: '库位 A-04-07 已锁定，不参与新任务分配；同层其他库位不受影响', status: '处理中', statusClass: 'processing', owner: '王工' },
  { title: '系统记录为空，但库位传感器检测有物', code: 'ALM-20260817-0041', time: '2026-08-17 09:36:54', level: '警告', levelClass: 'warning', object: '立库 A 第4层07位', impact: '库位 A-04-07 已锁定，不参与新任务分配；同层其他库位不受影响', status: '处理中', statusClass: 'processing', owner: '王工' },
  { title: '视觉设备在60秒内出现3次短时断连', code: 'ALM-20260817-0040', time: '2026-08-17 09:31:12', level: '警告', levelClass: 'warning', object: '视觉 VISION-01', impact: '当前动作在重试前暂停；底盘和机械臂保持安全状态；其他任务等待', status: '已确认', statusClass: 'confirmed', owner: '李工' },
]

const alertDetailCards = [
  { title: '发生了什么', text: '视觉设备在 60 秒内出现 3 次短时断连' },
  { title: '系统已经采取的保护', text: '系统已暂停当前动作，底盘和机械臂保持安全状态，未自动重复抓取或放置。', tag: '保护已生效' },
  { title: '影响范围', text: '当前动作在重试前暂停；底盘和机械臂保持安全状态；其他任务等待' },
  { title: '判断证据', text: '三次 TCP 连接重置；最后一次心跳已恢复' },
  { title: '关联对象', text: '视觉 VISION-01 · 实验室 A' },
  { title: '当前负责人', text: '李工' },
  { title: '关联任务', text: 'MES-20260817-0067 / TRN-0067-01 / AGV-01' },
  { title: '异常状态 / 最近更新', text: '已确认 / 09:33:46' },
]

const recoverySteps = [
  { number: 1, title: '检查设备供电与网络', text: '核对网线、交换机端口、设备电源和服务进程。', role: '实施工程师' },
  { number: 2, title: '刷新连接与设备状态', text: '恢复通信后先读取设备当前状态和最后命令结果。', role: '系统' },
  { number: 3, title: '根据证据判断是否继续', text: '确认动作未执行才允许重试；结果不确定时进入恢复核对。', role: '系统＋实施工程师' },
  { number: 3, title: '反复断连则安排维护', text: '保留通信记录和原始错误码，转厂商工具进一步诊断。', role: '实施工程师' },
]

const activeMenu = computed(() => activeMenuForRoute[route.path] || route.path)
const title = computed(() => route.meta.title || '运行总览')
const sectionTitle = computed(() => navigation.find(group => group.items.some(item => item.path === activeMenu.value))?.label || '')

function logout() {
  sessionStorage.removeItem('agv-session')
  router.replace('/login')
}

function openAlertDetail() {
  alertsVisible.value = false
  alertDetailVisible.value = true
}

function openStatusQuery() {
  alertDetailVisible.value = false
  statusQueryVisible.value = true
}

function openRelatedTask() {
  alertDetailVisible.value = false
  relatedTaskVisible.value = true
}

function openHandlingResult() {
  alertDetailVisible.value = false
  handlingResultVisible.value = true
}
</script>

<template>
  <el-container class="app-shell">
    <el-aside class="app-sidebar" width="220px">
      <router-link class="brand" to="/dashboard">
        <img src="/assets/logo.svg" alt="昆灵科技" />
      </router-link>
      <el-scrollbar class="sidebar-scroll">
        <el-menu :default-active="activeMenu" router @select="mobileMenu = false">
          <template v-for="(group, index) in navigation" :key="index">
            <p v-if="group.label" class="menu-label">{{ group.label }}</p>
            <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
              <span class="menu-figma-icon" :style="{'--menu-icon':`url(${item.icon})`}" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
      <div class="sidebar-version">v2.3</div>
    </el-aside>

    <el-drawer v-model="mobileMenu" direction="ltr" :with-header="false" size="240px" class="mobile-nav-drawer">
      <router-link class="brand mobile" to="/dashboard" @click="mobileMenu = false"><img src="/assets/logo.svg" alt="昆灵科技" /></router-link>
      <el-menu :default-active="activeMenu" router @select="mobileMenu = false">
        <template v-for="(group, index) in navigation" :key="index">
          <p v-if="group.label" class="menu-label">{{ group.label }}</p>
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
            <span class="menu-figma-icon" :style="{'--menu-icon':`url(${item.icon})`}" aria-hidden="true" /><span>{{ item.label }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-drawer>

    <el-container class="app-main-container">
      <el-header class="topbar">
        <div class="topbar-title">
          <el-button class="mobile-menu-button" text :icon="Fold" @click="mobileMenu = true" />
          <span class="topbar-title-icon"><img src="/assets/topbar/breadcrumb.svg" alt=""></span>
          <span v-if="sectionTitle" class="breadcrumb-section">{{ sectionTitle }}</span>
          <span v-if="sectionTitle" class="breadcrumb-separator">/</span>
          <span>{{ title }}</span>
        </div>
        <div class="topbar-actions">
          <el-button round @click="statusVisible = true"><img class="topbar-action-icon" src="/assets/topbar/status.svg" alt="">状态说明</el-button>
          <el-button round @click="alertsVisible = true"><img class="topbar-action-icon" src="/assets/topbar/warning.svg" alt="">异常提醒</el-button>
          <el-dropdown trigger="click">
            <button class="user-chip">
              <el-avatar :size="32" :icon="UserFilled" />
              <span>陈工</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/system/users')">个人信息</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="statusVisible" title="系统运行状态" width="600px" :show-close="false" align-center class="reference-dialog status-reference-dialog">
    <div class="status-explain-list">
      <article class="success"><strong>绿色•系统正常</strong><p>核心服务、数据库、任务引擎和机器人连接正常。</p></article>
      <article class="warning"><strong>黄色•受限运行</strong><p>部分非核心设备或上游接口异常，系统仍可继续部分业务。</p></article>
      <article class="danger"><strong>红色•系统异常</strong><p>核心能力异常，系统暂停接收和分配新任务。</p></article>
      <article class="info"><strong>灰色•维护模式</strong><p>系统处于人工维护、升级或硬件调试状态。</p></article>
    </div>
    <template #footer><el-button @click="statusVisible = false">关闭</el-button></template>
  </el-dialog>

  <el-drawer v-model="alertsVisible" size="444px" :show-close="false" class="reference-alert-drawer">
    <template #header><div><h2>异常提醒</h2><p>3条未完成 · 1条严重</p></div></template>
    <div class="alert-feed">
      <article v-for="(alert, index) in alertItems" :key="`${alert.code}-${index}`" class="alert-card">
        <div class="alert-card__head">
          <div class="alert-card__title"><strong>{{ alert.title }}</strong><p>{{ alert.code }} · {{ alert.time }}</p></div>
          <span class="alert-severity" :class="alert.levelClass"><img :src="`/assets/topbar/alert-${alert.levelClass}.svg`" alt="">{{ alert.level }}</span>
        </div>
        <dl class="alert-card__details">
          <div><dt>异常对象：</dt><dd class="alert-object">{{ alert.object }}</dd></div>
          <div><dt>影响：</dt><dd>{{ alert.impact }}</dd></div>
          <div><dt>当前状态：</dt><dd class="alert-state" :class="alert.statusClass">{{ alert.status }}</dd></div>
          <div><dt>负责人：</dt><dd>{{ alert.owner }}</dd></div>
        </dl>
        <button class="alert-detail-button" @click="openAlertDetail">查看详情与处理</button>
      </article>
    </div>
    <template #footer><el-button type="primary" @click="alertsVisible = false; router.push('/operations/exception-recovery')">进入异常与恢复</el-button></template>
  </el-drawer>

  <el-dialog v-model="alertDetailVisible" width="800px" :show-close="false" align-center class="alert-detail-dialog">
    <div class="alert-detail-layout">
      <header class="alert-detail-header">
        <h2>异常详情与处理意见•ALM-20260817-0040</h2>
        <button aria-label="关闭" @click="alertDetailVisible = false"><img src="/assets/topbar/dialog-close.svg" alt=""></button>
      </header>

      <div class="alert-detail-grid">
        <article v-for="card in alertDetailCards" :key="card.title" class="alert-info-card" :class="{ 'is-clickable': card.title === '关联任务' }" @click="card.title === '关联任务' && openRelatedTask()">
          <div class="alert-info-card__title"><strong>{{ card.title }}</strong><span v-if="card.tag" class="detail-success-tag"><img src="/assets/topbar/detail-success.svg" alt="">{{ card.tag }}</span></div>
          <p>{{ card.text }}</p>
        </article>
      </div>

      <section class="alert-detail-section">
        <h3>建议处理步骤</h3>
        <p>系统根据“设备通信”异常类型给出对应建议和可执行操作</p>
      </section>

      <div class="recovery-step-list">
        <article v-for="step in recoverySteps" :key="step.title" class="recovery-step">
          <span class="recovery-step__number">{{ step.number }}</span>
          <div><strong>{{ step.title }}</strong><p>{{ step.text }}</p></div>
          <span class="detail-role-tag"><img src="/assets/topbar/detail-role.svg" alt="">{{ step.role }}</span>
        </article>
      </div>

      <section class="alert-detail-section operation-heading">
        <h3>处理操作</h3>
        <p>先执行必要的核对和恢复操作，确认影响已经解除后再填写处理结果</p>
      </section>
      <div class="alert-operation-buttons">
        <el-button type="primary" @click="openStatusQuery">刷新设备状态</el-button>
        <el-button>查看通信证据</el-button>
        <el-button>发起恢复检查</el-button>
      </div>
    </div>
    <template #footer>
      <el-button @click="alertDetailVisible = false">取消</el-button>
      <el-button type="primary" @click="openHandlingResult">填写处理结果</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="statusQueryVisible" width="600px" :show-close="false" align-center class="status-query-dialog">
    <div class="status-query-layout">
      <header class="status-query-header">
        <h2>异常处理 •刷新设备状态</h2>
        <button aria-label="关闭" @click="statusQueryVisible = false"><img src="/assets/topbar/status-query-close.svg" alt=""></button>
      </header>
      <div class="status-query-list">
        <article>
          <div><strong>连接状态</strong><span class="query-status success"><img src="/assets/topbar/status-query-success.svg" alt="">在线</span></div>
          <p>最近一次心跳已经恢复</p>
        </article>
        <article>
          <div><strong>最后命令</strong><span class="query-status warning"><img src="/assets/topbar/status-query-warning.svg" alt="">核对中</span></div>
          <p>已受理，物理结果仍需查询确认</p>
        </article>
        <article>
          <div><strong>安全状态</strong><span class="query-status success"><img src="/assets/topbar/status-query-success.svg" alt="">正常</span></div>
          <p>底盘停止，机械臂保持当前安全姿态</p>
        </article>
      </div>
      <div class="status-query-notice">刷新连接不等于自动重试动作。系统会结合最后命令、设备状态和现场证据判断是否可继续。</div>
    </div>
    <template #footer>
      <el-button @click="statusQueryVisible = false">取消</el-button>
      <el-button type="primary" @click="statusQueryVisible = false">完成状态查询</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="relatedTaskVisible" width="600px" :show-close="false" align-center class="related-task-dialog">
    <div class="related-task-layout">
      <header class="related-task-header">
        <h2>关联运输任务</h2>
        <button aria-label="关闭" @click="relatedTaskVisible = false"><img src="/assets/topbar/related-task-close.svg" alt=""></button>
      </header>
      <div class="related-task-list">
        <article>
          <div><strong>运输任务</strong><span class="related-task-status"><img src="/assets/topbar/related-task-warning.svg" alt="">挂起</span></div>
          <p>TRN-0068-02</p>
        </article>
        <article><strong>当前步骤</strong><p>等待贴标机台 进样许可</p></article>
        <article><strong>安全检查点</strong><p>机器人已到达 W-B01，尚未进入机台、尚未执行放料</p></article>
        <article><strong>自动重试</strong><p>已达到机台配置的3次查询上限</p></article>
      </div>
    </div>
    <template #footer><el-button @click="relatedTaskVisible = false">关闭</el-button></template>
  </el-dialog>

  <el-dialog v-model="handlingResultVisible" width="600px" :show-close="false" align-center class="handling-result-dialog">
    <div class="handling-result-layout">
      <header class="handling-result-header">
        <h2>填写处理结果•ALM-20260817-0042</h2>
        <button aria-label="关闭" @click="handlingResultVisible = false"><img src="/assets/topbar/handling-close.svg" alt=""></button>
      </header>
      <div class="handling-result-notice">提交后，该异常将标记为“已完成”并从当前异常列表移除。处理记录将保留在告警记录和系统日志中。</div>
      <div class="handling-result-form">
        <label><span>异常类型</span><input value="任务执行• 机台允许进样事件等待超过流程配置的30秒" disabled></label>
        <label><span>处理结论</span><span class="handling-select"><select v-model="handlingConclusion"><option>机台许可已恢复，任务可继续</option><option>异常仍存在，继续保持任务挂起</option><option>转人工处理并安排现场维护</option></select><img src="/assets/topbar/handling-arrow.svg" alt=""></span></label>
        <label><span>处理人</span><input value="陈工" disabled></label>
        <label><span>处理说明</span><span class="handling-textarea"><textarea v-model="handlingDescription" maxlength="200" placeholder="请填写现场采取的措施、核对结果以及任务后续安排"></textarea><span>{{ handlingDescription.length }}/200 <img src="/assets/topbar/handling-resize.svg" alt=""></span></span></label>
      </div>
    </div>
    <template #footer>
      <el-button @click="handlingResultVisible = false">取消</el-button>
      <el-button type="primary" @click="handlingResultVisible = false">提交处理结果</el-button>
    </template>
  </el-dialog>
</template>
