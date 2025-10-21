<template>
  <div
    v-if="!online"
    class="alert alert-warning text-center m-0 py-1"
    role="status"
    aria-live="polite"
  >
    You are currently <b>offline</b>. Actions that require network will be queued.
  </div>
</template>

<script setup>
import { useOnline } from '../components/useOnline';
const { online } = useOnline();
</script>

<style scoped>
/* 让 banner 占满顶部宽度，样式与 Bootstrap alert 一致即可 */
</style>
