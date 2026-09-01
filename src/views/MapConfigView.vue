<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '../components/PageHeader.vue'
import { createLabDraft, getLabConfig, getLaboratory, publishLabConfig, updateLabMap, uploadLabMap, validateLabConfig } from '../api/agv'

const lab = ref(null)
const loading = ref(false)
const previewVisible = ref(false)
const editVisible = ref(false)
const validationVisible = ref(false)
const validationIssues = ref([])
const selectedFile = ref(null)
const saving = ref(false)
const imageFailed = ref(false)
const form = reactive({ mapName: '', version: '', imageUrl: '' })

const currentConfig = computed(() => lab.value?.published || lab.value?.draft || null)
const draftConfig = computed(() => lab.value?.draft || null)
const configId = (config) => config?.configId ?? config?.id
const counts = computed(() => currentConfig.value?.counts || {})
const mapInfo = computed(() => currentConfig.value?.map || {})
const currentStatus = computed(() => lab.value?.published && currentConfig.value === lab.value.published ? '已发布' : currentConfig.value ? '草稿' : '未配置')

async function load() {
  loading.value = true
  try { lab.value = await getLaboratory() }
  catch (error) { lab.value = null; ElMessage.error(`唯一实验室加载失败：${error.message}`) }
  finally { loading.value = false }
}

async function openPreview() {
  if (!currentConfig.value) return
  imageFailed.value = false
  try {
    const detail = await getLabConfig(configId(currentConfig.value))
    if (detail) {
      currentConfig.value._detail = detail
    }
  } catch (error) {
    ElMessage.warning(`地图详情加载失败，已展示列表信息：${error.message}`)
  }
  previewVisible.value = true
}

async function openEditor() {
  let config = draftConfig.value
  if (!config) {
    if (!lab.value?.published) return ElMessage.warning('当前没有可编辑的地图配置')
    try {
      await createLabDraft()
      await load()
      config = draftConfig.value
      ElMessage.success('已进入地图编辑')
    } catch (error) { return ElMessage.error(`打开地图编辑失败：${error.message}`) }
  }
  selectedFile.value = null
  Object.assign(form, { mapName: config?.map?.name || '', version: config?.map?.version || '', imageUrl: config?.map?.imageUrl || '' })
  editVisible.value = true
}

function chooseImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)) return ElMessage.warning('仅支持 PNG、JPEG、GIF 和 WEBP 图片')
  if (file.size > 10 * 1024 * 1024) return ElMessage.warning('图片不能超过 10MB')
  selectedFile.value = file
}

async function saveMap() {
  if (!form.mapName.trim() || !form.version.trim()) return ElMessage.warning('请完整填写地图信息')
  saving.value = true
  try {
    let imageUrl = form.imageUrl
    if (selectedFile.value) {
      const uploaded = await uploadLabMap(selectedFile.value)
      imageUrl = uploaded?.imageUrl || uploaded?.url || uploaded?.path
    }
    if (!imageUrl) return ElMessage.warning('请选择地图图片')
    await updateLabMap(configId(draftConfig.value), { name: form.mapName.trim(), version: form.version.trim(), imageUrl })
    editVisible.value = false
    ElMessage.success('草稿地图信息已更新')
    await load()
  } catch (error) { ElMessage.error(`保存失败：${error.message}`) }
  finally { saving.value = false }
}

async function validateDraft() {
  if (!draftConfig.value) return
  try {
    const result = await validateLabConfig(configId(draftConfig.value))
    if (result?.valid) return ElMessage.success('配置校验通过，可以发布')
    validationIssues.value = result?.issues || []
    validationVisible.value = true
  } catch (error) { ElMessage.error(`校验失败：${error.message}`) }
}

async function publishDraft() {
  if (!draftConfig.value) return
  try {
    await ElMessageBox.confirm('确认发布当前实验室配置草稿吗？', '发布配置', { type: 'warning' })
    await publishLabConfig(configId(draftConfig.value))
    ElMessage.success('实验室配置已发布')
    await load()
  } catch (error) { if (!['cancel','close'].includes(error)) ElMessage.error(`发布失败：${error.message}`) }
}

async function createDraftOnly() {
  try {
    await ElMessageBox.confirm('确认从已发布版本创建新草稿吗？', '创建草稿', { type: 'warning' })
    await createLabDraft(); ElMessage.success('草稿创建成功'); await load()
  } catch (error) { if (!['cancel','close'].includes(error)) ElMessage.error(`草稿创建失败：${error.message}`) }
}

onMounted(load)
</script>

<template>
  <div class="page-view map-reference-page">
    <PageHeader class="page-head" title="实验室配置" description="按“一张地图对应一个实验室空间”配置地图、通行规则、机台、点位和外围资源" />
    <div class="page-canvas map-config-canvas">
      <section class="page-panel map-config-panel">
        <div class="tabs-row"><nav class="tabs"><router-link class="tab-btn active" to="/config/map">地图信息</router-link><router-link class="tab-btn" to="/config/stations">机台与点位</router-link><router-link class="tab-btn" to="/config/peripherals">外围资源</router-link></nav></div>
        <div class="content map-config-content">
          <div class="rule-banner"><svg class="icon"><use href="#i-info" /></svg><span>数据规则：一个实验室空间只对应一张当前发布的底盘地图，但该地图可以关联多个导航点。实验室空间是机台、库位、动作点位、路径和外围资源的统一归属对象。</span></div>
          <div class="list-head"><div><h2>地图信息列表</h2><p>点击编辑可维护实验室空间内地图信息，并通过导航点查看地图内已标记的目标位置。</p></div></div>
          <div class="table-wrap"><table><thead><tr><th>实验室空间 / 编号</th><th>地图 / 版本</th><th>空间内对象</th><th>关联导航点</th><th>当前状态</th><th class="col-actions">操作</th></tr></thead><tbody>
            <tr v-if="loading"><td colspan="6" class="empty-row">正在加载唯一实验室…</td></tr>
            <tr v-else-if="!lab"><td colspan="6" class="empty-row backend-warning">未获取到唯一实验室数据</td></tr>
            <tr v-else :class="{ 'clickable-map-row': currentConfig }" tabindex="0" @click.self="openPreview" @keydown.enter="openPreview">
              <td class="two-line"><strong>{{ lab.name || '-' }}</strong><span>唯一实验室</span></td>
              <td class="two-line"><strong>{{ mapInfo.name || '-' }}{{ mapInfo.version ? ` ${mapInfo.version}` : '' }}</strong><span>{{ mapInfo.imageUrl || '-' }}</span></td>
              <td>机台 {{ counts.machineCount ?? 0 }} · 节点 {{ counts.nodeCount ?? 0 }} · 连线 {{ counts.linkCount ?? 0 }}</td>
              <td><span class="nav-count">{{ counts.pointCount ?? 0 }} 个点位</span></td>
              <td><span :class="['badge', currentStatus === '已发布' ? 'badge-green' : 'badge-blue']">{{ currentStatus }}<template v-if="currentConfig"> R{{ currentConfig.revision }}</template></span></td>
              <td class="col-actions"><div class="row-actions">
                <TableActionButton kind="edit" label="编辑地图" :disabled="!currentConfig" @click="openEditor"/>
                <TableActionButton kind="map" label="查看地图" :disabled="!currentConfig" @click="openPreview"/>
                <TableActionButton kind="view" label="配置详情" :disabled="!currentConfig" @click="openPreview"/>
                <router-link v-if="currentConfig" class="table-action-link" aria-label="配置通行与机台" title="配置通行与机台" :to="{ path:'/config/passage-rules', query:{ configId:configId(currentConfig) } }"><svg viewBox="0 0 24 24"><path d="M4 7h10M4 12h16M10 17h10"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/></svg></router-link>
                <TableActionButton v-if="draftConfig" kind="view" label="校验草稿" @click="validateDraft"/><TableActionButton v-if="draftConfig" kind="publish" label="发布草稿" @click="publishDraft"/>
                <TableActionButton v-else-if="lab.published" kind="edit" label="创建草稿" @click="createDraftOnly"/>
              </div></td>
            </tr>
          </tbody></table></div>
          <div class="total">{{ lab ? '共计 1 条数据' : loading ? '正在加载' : '共计 0 条数据' }}</div>
        </div>
      </section>
      <section class="summary-grid map-summary-grid">
        <article class="summary-card"><span>实验室空间与当前地图</span><div class="summary-icon"><svg class="icon"><use href="#i-map" /></svg></div><strong>{{ lab ? `${lab.name || '-'} / ${mapInfo.name || '-'}` : '-' }}</strong><p>{{ lab ? '当前实验室空间与其发布地图' : '暂无实验室数据' }}</p></article>
        <article class="summary-card"><span>地图与导航点</span><div class="summary-icon blue"><svg class="icon"><use href="#i-flow" /></svg></div><strong>{{ currentConfig ? `1 : ${counts.pointCount ?? 0}` : '-' }}</strong><p>一张地图可定义多个导航点</p></article>
        <article class="summary-card"><span>引用关系</span><div class="summary-icon purple"><svg class="icon"><use href="#i-link" /></svg></div><strong>{{ counts.machineCount ?? 0 }} / {{ counts.nodeCount ?? 0 }} / {{ counts.pointCount ?? 0 }}</strong><p>机台 / 通行节点 / 导航点</p></article>
      </section>
    </div>

    <div v-if="previewVisible" class="modal-overlay open" @click.self="previewVisible = false"><section class="modal-card map-preview-modal" role="dialog" aria-modal="true"><h2>{{ lab?.name || '实验室' }} · 查看地图</h2>
      <div class="map-preview"><div class="map-preview-stage"><img v-if="mapInfo.imageUrl && !imageFailed" :src="mapInfo.imageUrl" :alt="mapInfo.name" @error="imageFailed = true"><div v-else class="map-preview-empty"><svg class="icon"><use href="#i-map" /></svg><strong>{{ mapInfo.imageUrl ? '地图图片加载失败' : '暂无地图图片' }}</strong><span>{{ mapInfo.imageUrl ? '请检查图片地址或后端文件服务' : '请先编辑地图并上传图片' }}</span></div></div><div class="map-preview-caption"><div><span>当前地图</span><strong>{{ mapInfo.name || '未命名地图' }}</strong></div><span>{{ mapInfo.version ? `版本 ${mapInfo.version}` : '未设置版本' }}</span></div></div>
      <div class="detail-grid"><article class="detail-item"><span>实验室</span><strong>唯一实验室</strong></article><article class="detail-item"><span>configId / 状态</span><strong>{{ configId(currentConfig) }} / {{ currentConfig?.status || currentStatus }} · R{{ currentConfig?.revision ?? '-' }}</strong></article><article class="detail-item wide"><span>地图 / 版本</span><strong>{{ mapInfo.name || '-' }} / {{ mapInfo.version || '-' }}</strong></article><article class="detail-item wide"><span>地图图片</span><strong class="map-url">{{ mapInfo.imageUrl || '-' }}</strong></article><article class="detail-item wide"><span>配置对象</span><strong>机台 {{ counts.machineCount ?? 0 }} · 节点 {{ counts.nodeCount ?? 0 }} · 连线 {{ counts.linkCount ?? 0 }} · 点位 {{ counts.pointCount ?? 0 }}</strong></article></div>
      <div class="modal-actions"><button class="modal-close" type="button" @click="previewVisible = false">关闭</button></div></section></div>

    <div v-if="editVisible" class="modal-overlay open" @click.self="editVisible = false"><section class="modal-card" role="dialog" aria-modal="true"><h2>编辑地图信息</h2><form @submit.prevent="saveMap"><div class="form-grid"><label class="form-field"><span>地图名称</span><input v-model="form.mapName" maxlength="128" required></label><label class="form-field"><span>地图版本</span><input v-model="form.version" maxlength="64" required></label><label class="form-field wide"><span>地图图片</span><input class="image-upload-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" @change="chooseImage"><small>PNG、JPEG、GIF 或 WEBP，最大 10MB；不选图片会保留原图</small></label><label class="form-field wide"><span>图片地址</span><input v-model="form.imageUrl" maxlength="512" readonly><small class="upload-result">{{ selectedFile ? `已选择：${selectedFile.name} · ${Math.ceil(selectedFile.size / 1024)}KB` : form.imageUrl ? `当前图片：${form.imageUrl}` : '' }}</small></label></div><div class="modal-actions"><button class="modal-close" type="button" @click="editVisible = false">取消</button><button class="modal-primary" type="submit" :disabled="saving">{{ saving ? (selectedFile ? '上传图片中…' : '保存中…') : '保存地图信息' }}</button></div></form></section></div>

    <div v-if="validationVisible" class="modal-overlay open" @click.self="validationVisible = false"><section class="modal-card"><h2>{{ lab?.name || '实验室' }} · 校验未通过</h2><div class="detail-grid"><article class="detail-item"><span>问题数量</span><strong>{{ validationIssues.length }} 项</strong></article><article class="detail-item wide"><span>问题详情</span><strong class="validation-issues">{{ validationIssues.map(item => `${item.code ? `${item.code}：` : ''}${item.message || '未知问题'}`).join('；') || '后端未返回详细问题' }}</strong></article></div><div class="modal-actions"><button class="modal-close" type="button" @click="validationVisible = false">关闭</button></div></section></div>
  </div>
</template>

<style scoped src="../styles/components.css"></style>
<style scoped>
:root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif}
    *{box-sizing:border-box}body{margin:0;min-width:320px;color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}button,input,select{font:inherit}button{color:inherit}svg{display:block}[hidden]{display:none!important}.icon{width:19px;height:19px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .page-head{min-height:92px;display:flex;align-items:center;padding:17px 20px;background:#fff}.page-head h1{margin:0 0 7px;font-size:20px;line-height:1.25}.page-head p{margin:0;color:var(--muted);font-size:13px}.page-canvas{min-height:calc(100vh - 145px);padding:20px}.page-panel{overflow:hidden;border-radius:11px;background:#fff}.tabs-row{padding:16px;border-bottom:1px solid var(--line)}.tabs{width:fit-content;display:inline-flex;align-items:center;padding:2px;border-radius:9px;background:#f3f5f7}.tab-btn{height:34px;display:inline-flex;align-items:center;padding:0 15px;border:0;border-radius:8px;color:var(--ink);background:transparent;font-size:13px;text-decoration:none;cursor:pointer}.tab-btn.active{background:#fff;font-weight:700;box-shadow:0 2px 8px rgba(17,36,54,.08)}.tab-divider{width:1px;height:18px;margin:0 2px;background:#d8dde1}
    .content{padding:20px 16px 18px}.rule-banner{padding:17px 18px;border-radius:9px;color:var(--orange);background:#fff5ef;font-size:12px;font-weight:650;line-height:1.65}.list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:18px 0 14px}.list-head h2{margin:0;font-size:15px}.list-head p{margin:7px 0 0;color:var(--muted);font-size:12px}.primary-btn{height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 16px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650;white-space:nowrap;cursor:pointer}.primary-btn:hover{background:#176fb5}.primary-btn .icon{width:18px;height:18px}.table-wrap{overflow-x:auto;border:1px solid #edf0f2;border-radius:9px}table{width:100%;min-width:1180px;border-collapse:separate;border-spacing:0;font-size:12px}th,td{padding:0 13px;text-align:left;white-space:nowrap;border-right:1px solid #f0f2f4;border-bottom:1px solid #edf0f2}th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}th{height:48px;background:#fafbfc;font-size:12px;font-weight:700}td{height:68px}.two-line strong{display:block;font-size:13px}.two-line span{display:block;margin-top:8px;color:var(--muted);font-size:11px}.badge{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:26px;padding:4px 11px;border:1px solid currentColor;border-radius:18px;font-size:11px;font-weight:650}.badge:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.badge-green{color:var(--green);border-color:#d1efdf;background:#f4fcf7}.badge-blue{color:var(--blue-strong);border-color:#cee3f5;background:#f2f8fd}.nav-count{padding:6px 10px;border:1px solid #e2e6e9;border-radius:16px;background:#fff}.row-actions{display:flex;gap:7px}.row-btn{height:27px;padding:0 10px;border:1px solid #e2e6e9;border-radius:15px;background:#f7f8f9;font-size:11px;font-weight:650;cursor:pointer}.row-btn.blue{color:var(--blue-strong);border-color:#cde2f3;background:#f1f8fd}.total{margin-top:14px;color:var(--muted);font-size:12px}.summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px}.summary-card{min-height:142px;padding:20px;border-radius:11px;background:#fff}.summary-card span{color:var(--muted);font-size:13px}.summary-card strong{display:block;margin-top:23px;font-size:24px}.summary-card p{margin:13px 0 0;font-size:17px;line-height:1.45}
    .modal-overlay,.alert-overlay{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.55);opacity:0;transition:opacity .2s ease}.modal-overlay.open,.alert-overlay.open{opacity:1}.modal-overlay{display:grid;place-items:center;padding:24px}.modal-card{width:min(590px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px;border-radius:14px;background:#f5f7f9;box-shadow:0 22px 70px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .18s ease}.modal-overlay.open .modal-card{transform:none}.modal-card h2{margin:0 0 17px;font-size:19px}.status-list{display:grid;gap:12px}.status-item{padding:15px;border-radius:7px;background:#fff}.status-item strong{display:block;margin-bottom:7px;font-size:16px}.status-item p{margin:0;color:var(--muted);font-size:12px}.normal strong{color:#23c36b}.limited strong{color:#ffb000}.abnormal strong{color:#ff493d}.maintenance strong{color:#59616a}.detail-grid,.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.detail-item{padding:13px;border:1px solid #e5e9ec;border-radius:9px;background:#fff}.detail-item.wide,.form-field.wide{grid-column:1/-1}.detail-item span,.form-field span{display:block;margin-bottom:7px;color:#7c858e;font-size:11px}.detail-item strong{font-size:13px}.form-field{display:grid;gap:7px}.form-field input,.form-field select{height:39px;padding:0 11px;border:1px solid #dfe3e6;border-radius:8px;outline:0;background:#fff;font-size:12px}.modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:17px}.modal-close,.modal-primary{height:36px;padding:0 15px;border:0;border-radius:8px;font-size:13px;font-weight:650;cursor:pointer}.modal-close{background:#e9edf1}.modal-primary{color:#fff;background:var(--blue)}
    .alert-overlay{z-index:75}.alert-drawer{position:absolute;inset:0 0 0 auto;width:min(444px,100vw);display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#f5f7f9;transform:translateX(100%);transition:transform .24s ease}.alert-overlay.open .alert-drawer{transform:none}.alert-header{padding:22px 16px 16px;border-bottom:1px solid #e6e9ec}.alert-header h2{margin:0 0 5px;font-size:20px}.alert-header p{margin:0;color:var(--muted);font-size:12px}.alert-feed{overflow-y:auto;padding:16px}.alert-list{display:grid;gap:12px}.alert-card{padding:14px;border-radius:11px;background:#fff}.alert-card strong{font-size:13px}.alert-card p{margin:8px 0 0;color:#77808a;font-size:11px;line-height:1.5}.severity{float:right;padding:3px 7px;border:1px solid #ffd8d5;border-radius:13px;color:var(--red);font-size:10px}.alert-footer{display:grid;place-items:center;min-height:72px;border-top:1px solid #e6e9ec;background:#fff}.alert-primary{width:240px;height:37px;border:0;border-radius:8px;color:#fff;background:var(--blue);font-size:13px;font-weight:650}.toast{position:fixed;left:50%;bottom:24px;z-index:90;padding:11px 16px;border-radius:8px;color:#fff;background:rgba(12,29,47,.92);font-size:13px;opacity:0;pointer-events:none;transform:translate(-50%,20px);transition:.22s ease}.toast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:900px){.summary-grid{grid-template-columns:1fr}.list-head{align-items:flex-start;flex-direction:column}.primary-btn{align-self:flex-end}}
    @media(max-width:760px){.page-head{padding:14px}.page-head h1{font-size:18px}.page-head p{font-size:12px}.page-canvas{padding:12px}.tabs-row{padding:12px;overflow-x:auto}.tabs{white-space:nowrap}.content{padding:16px 12px}.rule-banner{padding:14px}.primary-btn{width:100%;justify-content:center}.detail-grid,.form-grid{grid-template-columns:1fr}.detail-item.wide,.form-field.wide{grid-column:auto}.alert-drawer{width:100vw}}
    .tabs a[href="passage-rules.html"],.tabs a[href="passage-rules.html"]+.tab-divider{display:none}

/* Controller-rendered states */
.row-btn:disabled,.modal-primary:disabled,.primary-btn:disabled,.nav-count:disabled{opacity:.52;cursor:not-allowed}.empty-row td{text-align:center;color:var(--muted)}.form-field small{color:var(--muted);font-size:10px;line-height:1.45}.map-url{max-width:470px;overflow-wrap:anywhere;white-space:normal}.form-field .image-upload-input{height:auto;padding:7px 9px}.upload-result{color:var(--blue-strong)!important;overflow-wrap:anywhere}.row-actions{flex-wrap:wrap;min-width:330px}.row-btn.danger{color:var(--red);border-color:#f3d7d5;background:#fff5f4}.validation-issues{color:var(--red)!important;white-space:normal;line-height:1.55}.backend-warning{color:var(--red)!important}


/* Figma 35098:9172 · map information */
.map-config-canvas{padding:24px;background:#f5f6f7}.map-config-panel{border-radius:12px;box-shadow:none}.map-config-panel .tabs-row{padding:20px 20px 16px;border-bottom:1px solid #edf0f3}.map-config-panel .tabs{gap:20px;padding:0;border-radius:0;background:transparent}.map-config-panel .tab-btn{position:relative;height:36px;padding:0 2px;border-radius:0;color:#607080;font-size:14px}.map-config-panel .tab-btn.active{color:#1677ff;background:transparent;box-shadow:none;font-weight:600}.map-config-panel .tab-btn.active:after{content:"";position:absolute;right:2px;bottom:0;left:2px;height:2px;border-radius:2px;background:#1677ff}.map-config-content{padding:20px}.map-config-content .rule-banner{display:flex;align-items:flex-start;gap:10px;padding:15px 16px;border:1px solid #ffe0cc;border-radius:10px;color:#d85d1d;background:#fff8f3;font-size:13px;font-weight:400;line-height:22px}.map-config-content .rule-banner .icon{width:17px;height:17px;margin-top:2px;color:#e88037;stroke-width:2}.map-config-content .list-head{align-items:center;margin:24px 0 16px}.map-config-content .list-head h2{color:#081829;font-size:16px;line-height:24px}.map-config-content .list-head p{margin-top:4px;color:#8a96a3;font-size:13px;line-height:20px}.map-config-content .primary-btn{height:40px;padding:0 16px;border-radius:7px;background:#1677ff;font-size:14px;box-shadow:0 2px 4px rgba(22,119,255,.18)}.map-config-content .primary-btn:hover{background:#4096ff}.map-config-content .table-wrap{border-color:#e9edf1;border-radius:10px;overflow:auto}.map-config-content table{min-width:1000px;color:#344154;font-size:13px}.map-config-content th,.map-config-content td{padding:0 16px;border-right:0;border-bottom:1px solid #edf0f3}.map-config-content th{height:48px;color:#526070;background:#fafbfd;font-size:13px;font-weight:600}.map-config-content td{height:68px}.map-config-content .two-line strong{color:#253247;font-size:14px;font-weight:500;line-height:20px}.map-config-content .two-line span{margin-top:3px;color:#98a2ad;font-size:12px;line-height:18px}.map-config-content .nav-count{padding:0;border:0;color:#1677ff;background:transparent;font-size:13px;cursor:pointer}.map-config-content .nav-count:hover{text-decoration:underline}.map-config-content .badge{min-height:26px;padding:3px 10px;border-width:1px;font-size:12px;font-weight:400}.map-config-content .badge-green{color:#1ca970;border-color:#ccefdc;background:#f2fbf7}.map-config-content .badge-orange{color:#dd8a15;border-color:#ffe0ad;background:#fff9eb}.map-config-content .row-actions{align-items:center;flex-wrap:nowrap;min-width:0;gap:12px}.map-config-content .icon-action{display:inline-grid;place-items:center;width:22px;height:28px;padding:0;border:0;color:#1677ff;background:transparent;cursor:pointer}.map-config-content .icon-action:hover{border-radius:5px;background:#edf6ff}.map-config-content .icon-action .icon{width:17px;height:17px;stroke-width:1.9}.map-config-content .icon-action[data-map-action="more"]{font-size:18px;font-weight:700;letter-spacing:1px;line-height:1}.map-config-content .muted-cell{color:#98a2ad}.map-config-content .total{margin-top:14px;color:#8a96a3;font-size:13px}.map-summary-grid{gap:16px;margin-top:20px}.map-summary-grid .summary-card{position:relative;min-height:160px;padding:20px;border-radius:12px;overflow:hidden}.map-summary-grid .summary-card span{color:#718096;font-size:14px}.map-summary-grid .summary-card strong{margin-top:25px;color:#081829;font-size:24px;line-height:32px;font-weight:600}.map-summary-grid .summary-card p{margin-top:8px;color:#8a96a3;font-size:13px;line-height:20px}.summary-icon{position:absolute;top:20px;right:20px;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:#22b573;background:#edfcf5}.summary-icon.blue{color:#1677ff;background:#edf6ff}.summary-icon.purple{color:#7b61d1;background:#f3f0ff}.summary-icon .icon{width:20px;height:20px}.tabs a[href="passage-rules.html"],.tabs a[href="passage-rules.html"]+.tab-divider{display:none!important}@media(max-width:760px){.map-config-canvas{padding:12px}.map-config-panel .tabs-row{padding:14px 16px}.map-config-panel .tabs{gap:16px}.map-config-content{padding:16px}.map-config-content .list-head{align-items:flex-start}.map-config-content .primary-btn{width:100%}.map-summary-grid .summary-card{min-height:145px}}
.map-config-panel .tabs-row{display:none}

/* Click the map row to preview its image */
.map-config-content .clickable-map-row{cursor:pointer;transition:background-color .16s ease}.map-config-content .clickable-map-row:hover{background:#f7fbff}.map-config-content .clickable-map-row:focus-visible{outline:2px solid #1677ff;outline-offset:-2px}.map-config-content .clickable-map-row:focus-visible td{background:#f7fbff}.map-config-content agv-action-menu{display:none!important}

/* Map image preview dialog */
#mapModal.map-preview-open .modal-card{width:min(900px,calc(100vw - 32px))}.map-preview{margin-bottom:14px;overflow:hidden;border:1px solid #e2e7ec;border-radius:11px;background:#fff}.map-preview-stage{min-height:340px;max-height:56vh;display:grid;place-items:center;overflow:auto;background-color:#eef2f5;background-image:linear-gradient(45deg,rgba(118,137,155,.08) 25%,transparent 25%),linear-gradient(-45deg,rgba(118,137,155,.08) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(118,137,155,.08) 75%),linear-gradient(-45deg,transparent 75%,rgba(118,137,155,.08) 75%);background-position:0 0,0 8px,8px -8px,-8px 0;background-size:16px 16px}.map-preview-stage img{display:block;max-width:100%;max-height:56vh;width:auto;height:auto;object-fit:contain}.map-preview-empty{display:grid;justify-items:center;gap:8px;padding:44px 20px;color:#7d8a98;text-align:center}.map-preview-empty .icon{width:42px;height:42px;color:#a7b2bd;stroke-width:1.4}.map-preview-empty strong{color:#465569;font-size:15px}.map-preview-empty span{font-size:12px}.map-preview-caption{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 15px;border-top:1px solid #e8ecef}.map-preview-caption div{min-width:0}.map-preview-caption div span{display:block;margin-bottom:3px;color:#909ba6;font-size:11px}.map-preview-caption strong{display:block;overflow:hidden;color:#243247;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.map-preview-caption>span{flex:0 0 auto;padding:4px 9px;border-radius:12px;color:#1677ff;background:#eef6ff;font-size:12px}@media(max-width:760px){.map-preview-stage{min-height:230px;max-height:46vh}.map-preview-stage img{max-height:46vh}.map-preview-caption{align-items:flex-start;flex-direction:column;gap:8px}}
</style>
<style scoped>
.map-reference-page { padding: 0; }
.map-reference-page > .page-head { margin: 0; }
</style>
