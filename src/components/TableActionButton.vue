<script setup>
defineProps({ kind:{type:String,default:'view'}, label:{type:String,required:true}, danger:Boolean, active:Boolean })
</script>

<template>
  <button class="table-action-button" :class="[{danger,active},`is-${kind}`]" type="button" :aria-label="label" :title="label">
    <svg v-if="kind==='view'" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
    <svg v-else-if="kind==='edit'" viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
    <svg v-else-if="kind==='delete'" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v7M14 10v7"/></svg>
    <svg v-else-if="kind==='publish'" viewBox="0 0 24 24"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/></svg>
    <svg v-else-if="kind==='reset'" viewBox="0 0 24 24"><path d="M4 4v6h6M5.5 9A8 8 0 1 1 5 16"/><path d="M12 8v4l3 2"/></svg>
    <svg v-else-if="kind==='map'" viewBox="0 0 24 24"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>
    <svg v-else-if="kind==='document'" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6V3Z"/><path d="M9 10h6M9 14h6M9 18h4M15 3v4h4"/></svg>
    <svg v-else-if="kind==='toggle'" viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M7.5 5.7a8 8 0 1 0 9 0"/></svg>
    <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
  </button>
</template>

<style scoped>
.table-action-button{width:30px;height:30px;display:inline-grid;place-items:center;flex:0 0 auto;padding:0;border:1px solid transparent;border-radius:6px;color:#1677d2;background:transparent;cursor:pointer;transition:.15s}.table-action-button:hover:not(:disabled){border-color:#d5e9fa;background:#edf6ff}.table-action-button.danger{color:#d84343}.table-action-button.danger:hover:not(:disabled){border-color:#f3d7d5;background:#fff2f0}.table-action-button.active{color:#1f9d63;background:#eef9f3}.table-action-button:disabled{opacity:.42;cursor:not-allowed}.table-action-button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
</style>
