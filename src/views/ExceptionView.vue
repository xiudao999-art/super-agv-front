<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import PageHeader from "../components/PageHeader.vue";
import { appState } from "../stores/appStore";
const props = defineProps({ mode: { type: String, default: "anomalies" } });
const router = useRouter(),
  keyword = ref(""),
  selected = ref(null),
  page = ref(1),
  pageSize = ref(20);
const tabs = [
  { label: "当前异常", path: "/operations/anomalies", mode: "anomalies" },
  { label: "告警记录", path: "/operations/alarms", mode: "alarms" },
  {
    label: "任务恢复与状态核对",
    path: "/operations/recovery",
    mode: "recoveryTasks",
  },
];
const anomalyDesignRows = [
  {
    id: "D-01",
    objectName: "贴标机台进样许可",
    title: "机台允许进样事件等待超过流程配置的 30秒",
    eventCode: "TASK-PERMIT-TIMEOUT",
    robot: "AGV-01（孔板机型）",
    location: "ARM.PLACE @ 培养箱-窗口2",
    disposal: "L3 现场人工",
    disposalTone: "disposal-l3",
    type: "任务执行",
    time: "2026.08.31 14:00:00",
    status: "待处理",
  },
  {
    id: "DEVICE-B-DOCK",
    objectName: "立库 A 第 4 层 / 07 位",
    title: "系统记录为空，但库位传感器检测有物",
    eventCode: "LOCATION-STATE-MISMATCH",
    robot: "AGV-02（摆臂机型）",
    location: "ARM.PICK @ 智能货架-B12",
    disposal: "L2 远程人工",
    disposalTone: "disposal-l2",
    type: "库位一致性",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
  {
    id: "DEVICE-BPLACE-1",
    displayId: "DEVICE-BPLACE",
    objectName: "视觉 VISION-01",
    title: "视觉设备在 60 秒内出现 3 次短时断连",
    eventCode: "DEVICE-LINK-UNSTABLE",
    robot: "AGV-01（孔板机型）",
    location: "DOCK.TRANSFER @ 窗口暂存架-W1",
    disposal: "L1 自动降级",
    disposalTone: "disposal-l1",
    type: "设备通信",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
  {
    id: "DEVICE-BPLACE-2",
    displayId: "DEVICE-BPLACE",
    objectName: "视觉 VISION-01",
    title: "视觉设备在 60 秒内出现 3 次短时断连",
    eventCode: "DEVICE-LINK-UNSTABLE",
    robot: "AGV-03（孔板机型）",
    location: "WAIT.PERMIT @ 静置综合台-窗口1",
    disposal: "L1 自动降级",
    disposalTone: "disposal-l1",
    type: "设备通信",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
  {
    id: "DEVICE-BPLACE-3",
    displayId: "DEVICE-BPLACE",
    objectName: "视觉 VISION-01",
    title: "视觉设备在 60 秒内出现 3 次短时断连",
    eventCode: "DEVICE-LINK-UNSTABLE",
    robot: "AGV-02（摆臂机型）",
    location: "RFID.WRITE @ 智能货架-A07",
    disposal: "L1 自动降级",
    disposalTone: "disposal-l1",
    type: "设备通信",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
  {
    id: "DEVICE-BPLACE-4",
    displayId: "DEVICE-BPLACE",
    objectName: "视觉 VISION-01",
    title: "视觉设备在 60 秒内出现 3 次短时断连",
    eventCode: "DEVICE-LINK-UNSTABLE",
    robot: "AGV-02（摆臂机型）",
    location: "RFID.WRITE @ 智能货架-A07",
    disposal: "L1 自动降级",
    disposalTone: "disposal-l1",
    type: "设备通信",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
  {
    id: "DEVICE-BPLACE-5",
    displayId: "DEVICE-BPLACE",
    objectName: "视觉 VISION-01",
    title: "视觉设备在 60 秒内出现 3 次短时断连",
    eventCode: "DEVICE-LINK-UNSTABLE",
    robot: "AGV-02（摆臂机型）",
    location: "RFID.WRITE @ 智能货架-A07",
    disposal: "L1 自动降级",
    disposalTone: "disposal-l1",
    type: "设备通信",
    time: "2026.08.31 14:00:00",
    status: "处理中",
  },
];
const sourceRows = computed(() =>
  props.mode === "anomalies" ? anomalyDesignRows : appState[props.mode] || [],
);
const rows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return sourceRows.value.filter(
    (row) => !q || Object.values(row).join(" ").toLowerCase().includes(q),
  );
});
const current = computed(() => selected.value || rows.value[0] || null);
function tone(value) {
  if (["严重", "不一致"].includes(value)) return "error";
  if (["警告", "待处理", "待人工核对", "待确认"].includes(value))
    return "warning";
  if (
    ["已恢复", "已关闭", "一致", "补发完成", "可信", "已完成"].includes(value)
  )
    return "success";
  return "info";
}
function selectRow(row) {
  selected.value = row;
}
</script>
<template>
  <section class="page-view exception-design-page">
    <PageHeader
      class="page-head"
      title="异常与恢复"
      description="聚合异常原因、影响范围、恢复状态和人工处理建议"
    />
    <div class="exception-workspace">
      <div class="exception-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.mode"
          :class="['exception-tab', { active: tab.mode === mode }]"
          type="button"
          @click="router.push(tab.path)"
        >
          {{ tab.label }}
        </button>
      </div>
      <template v-if="mode === 'anomalies'"
        ><div class="section-title">
          <strong>当前异常</strong
          ><span class="status-tag error">{{ rows.length }} 项处理</span>
        </div>
        <div class="table-wrap anomaly-table">
          <table>
            <thead>
              <tr>
                <th>异常编号</th>
                <th>异常对象</th>
                <th>异常内容</th>
                <th>异常内容</th>
                <th>处置级别</th>
                <th>异常类型</th>
                <th>发生时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>{{ row.displayId || row.id }}</td>
                <td>{{ row.objectName }}</td>
                <td>
                  <strong>{{ row.title }}</strong
                  ><small>{{ row.eventCode }}</small>
                </td>
                <td>
                  <strong>{{ row.robot }}</strong
                  ><small>{{ row.location }}</small>
                </td>
                <td>
                  <span :class="['status-tag', row.disposalTone]">{{
                    row.disposal
                  }}</span>
                </td>
                <td>{{ row.type }}</td>
                <td>{{ row.time }}</td>
                <td>
                  <span :class="['status-tag', tone(row.status)]">{{
                    row.status
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span>共计 {{ rows.length }} 条数据</span>
          <div>
            <button>‹</button><button class="active">1</button><button>2</button
            ><button>3</button><button>4</button><button>5</button
            ><button>•••</button><button>98</button><button>›</button
            ><select v-model="pageSize">
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
              <option :value="50">50 条/页</option></select
            ><span>跳至</span><input v-model="page" /><span>页</span>
          </div>
        </div></template
      >
      <template v-else-if="mode === 'alarms'"
        ><div class="split">
          <section class="panel">
            <h3>告警记录</h3>
            <div class="search">
              <img src="/assets/list-icons/alarm-search.svg" alt="" />
              <input v-model="keyword" placeholder="搜索记录" />
            </div>
            <button
              v-for="row in rows"
              :key="row.id"
              :class="['record', { selected: current?.id === row.id }]"
              @click="selectRow(row)"
            >
              <span
                ><strong>{{ row.title }}</strong
                ><small>{{ row.time.split(" ")[0] }} · 记录完整</small></span
              ><i :class="['status-tag', tone(row.status)]">{{ row.status }}</i>
            </button>
          </section>
          <aside class="panel details">
            <h3>详情</h3>
            <template v-if="current"
              ><article>
                <strong>关联 ID</strong><small>TRACE-20260816-1028</small>
              </article>
              <article>
                <div>
                  <strong>操作者/来源</strong
                  ><span :class="['status-tag', tone(current.status)]">{{
                    current.status
                  }}</span>
                </div>
                <small>调度服务 / 陈工</small>
              </article>
              <article>
                <div>
                  <strong>证据</strong
                  ><span class="status-tag success">可信</span>
                </div>
                <small>请求、状态、结果和审计链完整</small>
              </article></template
            >
          </aside>
        </div></template
      >
      <template v-else
        ><div class="recovery-head">
          <div>
            <strong>恢复检查记录</strong
            ><small
              >只处理重启、中断、执行结果不确定或系统记录与现场不一致的情况</small
            >
          </div>
          <button @click="ElMessage.success('恢复检查已发起')">
            <img
              src="/assets/list-icons/recovery-check.svg"
              alt=""
            />发起恢复检查
          </button>
        </div>
        <div class="table-wrap recovery-table">
          <table>
            <thead>
              <tr>
                <th>检查编号</th>
                <th>检查类型</th>
                <th>关联对象</th>
                <th>触发原因</th>
                <th>当前状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in rows"
                :key="row.id"
                :class="{ selected: current?.id === row.id }"
                @click="selectRow(row)"
              >
                <td>REC-20260816-00{{ 3 - index }}</td>
                <td>
                  {{
                    index === 0
                      ? "系统重启恢复"
                      : index === 1
                        ? "库位状态核对"
                        : "上游结果补发"
                  }}
                </td>
                <td>{{ row.task }}</td>
                <td>{{ row.checkpoint }}</td>
                <td>
                  <span
                    :class="[
                      'status-tag',
                      tone(
                        index === 0
                          ? '可自动继续'
                          : index === 1
                            ? '待人工核对'
                            : '补发完成',
                      ),
                    ]"
                    >{{
                      index === 0
                        ? "可自动继续"
                        : index === 1
                          ? "待人工核对"
                          : "补发完成"
                    }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="recovery-bottom">
          <section class="panel process">
            <div class="process-head">
              <div>
                <h3>REC-20260816-003·处理过程</h3>
                <small>系统重启恢复 / {{ current?.task }}</small>
              </div>
              <span class="status-tag info">可自动继续</span>
            </div>
            <ol>
              <li
                v-for="(step, index) in [
                  '冻结影响范围',
                  '读取系统检查点',
                  '采集现场与上游状态',
                  '比对并判断',
                  '执行恢复结果',
                ]"
                :key="step"
              >
                <b>{{ index + 1 }}</b
                ><span
                  ><strong>{{ step }}</strong
                  ><small>{{
                    index === 0
                      ? "暂停相关任务，锁定涉及的机器人、库位和机台，避免状态继续变化"
                      : index === 1
                        ? "等待机台许可"
                        : index === 2
                          ? "AGV-01 位于 W-B01，载具 TRAY-000238 在 C01；MES 订单处理中，完成回调未发送"
                          : index === 3
                            ? "现场状态与检查点一致，可继续等待许可"
                            : "安全继续、补记完成、补发通知，或转待人工扫码与管理员审批"
                  }}</small></span
                ><i
                  :class="[
                    'status-tag',
                    index < 3 ? 'success' : index === 3 ? 'info' : 'warning',
                  ]"
                  >{{
                    index < 3
                      ? "已完成"
                      : index === 3
                        ? "可自动继续"
                        : "按规则执行"
                  }}</i
                >
              </li>
            </ol>
          </section>
          <aside class="panel rules">
            <h3>恢复结果规则</h3>
            <article
              v-for="item in [
                ['确认未执行', '从最近安全检查点继续'],
                ['确认已完成', '补记结果并进入下一步，不重复动作'],
                [
                  '状态无法确定',
                  '保持锁定，要求操作员现场扫码或确认',
                  '人工处理',
                ],
                [
                  '需要改物理记录',
                  '管理员审批后修改载具位置或库位占用',
                  '需审批',
                ],
                ['仅回调未确认', '使用同一幂等键补发通知，不重复物理动作'],
              ]"
              :key="item[0]"
            >
              <div class="rule-head">
                <strong>{{ item[0] }}</strong>
                <span v-if="item[2]" class="status-tag gray">{{ item[2] }}</span>
              </div>
              <small>{{ item[1] }}</small>
            </article>
          </aside>
        </div></template
      >
    </div>
  </section>
</template>
<style scoped>
.exception-design-page {
  min-width: 0;
  padding: 0 !important;
  overflow-x: hidden;
}
.exception-design-page > .page-head {
  margin: 0;
  padding: 17px 20px;
}
.exception-workspace {
  width: calc(100% - 48px);
  min-width: 0;
  box-sizing: border-box;
  margin: 24px 24px 0;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.exception-tabs {
  height: 77px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(8, 24, 41, 0.06);
}
.exception-tab {
  height: 32px;
  padding: 0 16px;
  border: 0;
  background: #f5f6f7;
  color: #081829;
  font-size: 14px;
  cursor: pointer;
}
.exception-tab:first-child {
  border-radius: 8px 0 0 8px;
}
.exception-tab:last-child {
  border-radius: 0 8px 8px 0;
}
.exception-tab.active {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(21, 27, 41, 0.09);
  font-weight: 600;
}
.section-title {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.section-title strong,
.panel h3,
.recovery-head strong {
  font-size: 14px;
}
.table-wrap {
  margin: 0 20px;
  border: 1px solid #f5f6f7;
  border-radius: 10px;
  overflow: auto;
}
.table-wrap table {
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  color: #081829;
  font-size: 14px;
}
.table-wrap th {
  height: 48px;
  padding: 0 16px;
  background: rgba(8, 24, 41, 0.02);
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
.table-wrap td {
  height: 68px;
  padding: 0 16px;
  border-top: 1px solid #f5f6f7;
  white-space: nowrap;
}
.table-wrap td strong,
.table-wrap td small {
  display: block;
}
.table-wrap td small {
  margin-top: 7px;
  color: rgba(8, 24, 41, 0.48);
  font-size: 12px;
}
.table-wrap tbody tr.selected {
  background: rgba(21, 119, 210, 0.08);
}
.anomaly-table .status-tag.disposal-l3 {
  color: #f24e3f !important;
  border-color: rgba(242, 78, 63, 0.15) !important;
  background: rgba(242, 78, 63, 0.08) !important;
}
.anomaly-table .status-tag.disposal-l2 {
  color: #ff711f !important;
  border-color: rgba(255, 113, 31, 0.15) !important;
  background: rgba(255, 113, 31, 0.08) !important;
}
.anomaly-table .status-tag.disposal-l1,
.anomaly-table .status-tag.warning {
  color: #f6b714 !important;
  border-color: rgba(246, 183, 20, 0.15) !important;
  background: rgba(246, 183, 20, 0.08) !important;
}
.anomaly-table .status-tag.info {
  color: #1577d2 !important;
  border-color: rgba(21, 119, 210, 0.15) !important;
  background: rgba(21, 119, 210, 0.08) !important;
}
.pagination {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: rgba(8, 24, 41, 0.48);
  font-size: 14px;
}
.pagination > div {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #081829;
}
.pagination button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: #fff;
}
.pagination button.active {
  background: rgba(8, 24, 41, 0.06);
  font-weight: 600;
}
.pagination select,
.pagination input {
  height: 32px;
  border: 1px solid rgba(8, 24, 41, 0.1);
  border-radius: 8px;
  background: #fff;
}
.pagination select {
  padding: 0 10px;
}
.pagination input {
  width: 42px;
  text-align: center;
}
.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 492px;
  gap: 20px;
  padding: 20px;
}
.panel {
  border: 1px solid rgba(8, 24, 41, 0.06);
  border-radius: 12px;
  background: #fff;
  padding: 20px;
}
.panel h3 {
  margin: 0 0 16px;
}
.search {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  margin-bottom: 16px;
  border: 1px solid rgba(8, 24, 41, 0.1);
  border-radius: 8px;
  color: rgba(8, 24, 41, 0.48);
}
.search input {
  min-width: 0;
  flex: 1;
  width: 100%;
  border: 0;
  outline: 0;
}
.search img {
  width: 16px;
  height: 16px;
  display: block;
  flex: 0 0 16px;
}
.record {
  width: 100%;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(8, 24, 41, 0.06);
  border-radius: 10px;
  background: #fff;
  text-align: left;
}
.record.selected {
  border-color: rgba(21, 119, 210, 0.18);
  background: rgba(21, 119, 210, 0.08);
}
.record span strong,
.record span small,
.details article small,
.recovery-head small,
.process-head small,
.process li small,
.rules article small {
  display: block;
}
.record small,
.details article small,
.recovery-head small,
.process-head small,
.process li small,
.rules article small {
  margin-top: 8px;
  color: rgba(8, 24, 41, 0.48);
  font-size: 12px;
}
.details article,
.rules article {
  min-height: 72px;
  padding: 12px 16px;
  margin-top: 12px;
  border: 1px solid rgba(8, 24, 41, 0.06);
  border-radius: 10px;
}
.details article > div {
  display: flex;
  justify-content: space-between;
}
.recovery-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}
.recovery-head button {
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: #1577d2;
}
.recovery-head button img {
  width: 18px;
  height: 18px;
  display: block;
}
.recovery-table {
  margin-top: 0;
}
.recovery-table table {
  min-width: 900px;
}
.recovery-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 20px;
  padding: 20px;
}
.process-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.process-head h3 {
  margin-bottom: 0;
}
.process ol {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
}
.process li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(8, 24, 41, 0.06);
}
.process li > b {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #1577d2;
  background: rgba(21, 119, 210, 0.08);
}
.process li > span {
  flex: 1;
}
.rules article {
  margin-top: 8px;
}
.rules article strong {
  font-size: 14px;
}
.rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
@media (max-width: 1000px) {
  .table-wrap {
    overflow: hidden;
  }
  .table-wrap table,
  .recovery-table table {
    min-width: 0;
    table-layout: fixed;
  }
  .anomaly-table th:nth-child(4),
  .anomaly-table td:nth-child(4),
  .anomaly-table th:nth-child(5),
  .anomaly-table td:nth-child(5),
  .anomaly-table th:nth-child(6),
  .anomaly-table td:nth-child(6),
  .anomaly-table th:nth-child(7),
  .anomaly-table td:nth-child(7) {
    display: none;
  }
  .anomaly-table th:nth-child(1) {
    width: 22%;
  }
  .anomaly-table th:nth-child(2) {
    width: 22%;
  }
  .anomaly-table th:nth-child(3) {
    width: 36%;
  }
  .anomaly-table th:nth-child(8) {
    width: 20%;
  }
  .table-wrap td,
  .table-wrap td strong,
  .table-wrap td small {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .split,
  .recovery-bottom {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .exception-design-page > .page-head {
    padding: 14px;
  }
}
@media (max-width: 620px) {
  .exception-tabs {
    height: auto;
    align-items: stretch;
    flex-direction: column;
    padding: 10px;
  }
  .exception-tab,
  .exception-tab:first-child,
  .exception-tab:last-child {
    border-radius: 8px;
  }
  .section-title,
  .recovery-head {
    height: auto;
    align-items: flex-start;
    gap: 12px;
    flex-direction: column;
    padding: 16px;
  }
  .pagination {
    align-items: flex-start;
    gap: 12px;
    flex-direction: column;
    height: auto;
    padding: 16px;
    overflow: hidden;
  }
  .pagination > div {
    min-width: 0;
    flex-wrap: wrap;
  }
  .recovery-table th:nth-child(4),
  .recovery-table td:nth-child(4) {
    display: none;
  }
  .split,
  .recovery-bottom {
    padding: 12px;
  }
  .panel {
    padding: 14px;
  }
}
/* 异常恢复页面设计稿样式 */
</style>
