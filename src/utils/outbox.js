// 统一管理离线队列；依赖你现有的 serverStub 提交函数
import { submitEnquiryToServer } from '../serverStub';

const KEY = 'nfp_outbox_enquiries'; // 本地发件箱 key

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addToOutbox(payload) {
  const list = read();
  list.push({ payload, ts: Date.now() });
  write(list);
}

export function outboxCount() {
  return read().length;
}

export async function flushOutbox() {
  const list = read();
  if (!list.length) return 0;

  const still = [];
  let sent = 0;

  for (const item of list) {
    try {
      await submitEnquiryToServer(item.payload);   // 用你现有的提交 API
      sent++;
      // 通知全局（比如 /tables 监听这个事件刷新）
      window.dispatchEvent(new CustomEvent('enquiry:created'));
    } catch (e) {
      // 继续保留未成功的
      still.push(item);
    }
  }
  write(still);
  return sent;
}

// 可在应用启动或恢复在线时调用
export function setupOutboxAutoFlush() {
  const tryFlush = async () => {
    if (navigator.onLine) {
      try { await flushOutbox(); } catch (_) {}
    }
  };
  window.addEventListener('online', tryFlush);
  // 启动时也尝试一次
  tryFlush();
}
