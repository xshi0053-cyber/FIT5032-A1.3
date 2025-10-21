// 轻量监听 navigator.onLine + online/offline 事件
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useOnline() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const setOnline = () => (online.value = true);
  const setOffline = () => (online.value = false);

  onMounted(() => {
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('online', setOnline);
    window.removeEventListener('offline', setOffline);
  });

  return { online };
}
