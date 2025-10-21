<!-- src/views/ContactEmail.vue -->
<template>
  <main class="container py-4">
    <h2 class="mb-3">Contact Us</h2>

    <form @submit.prevent="onSubmit" novalidate>
      <div class="mb-3">
        <label class="form-label" for="name">Your Name</label>
        <input
          id="name"
          v-model.trim="name"
          type="text"
          class="form-control"
          :class="{'is-invalid': errors.name}"
          placeholder="Jane Doe"
          required
          maxlength="80"
        />
        <div class="invalid-feedback" v-if="errors.name">{{ errors.name }}</div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="email">Your Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          class="form-control"
          :class="{'is-invalid': errors.email}"
          placeholder="you@example.com"
          required
          maxlength="120"
        />
        <div class="invalid-feedback" v-if="errors.email">{{ errors.email }}</div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="title">Subject</label>
        <input
          id="title"
          v-model.trim="title"
          type="text"
          class="form-control"
          :class="{'is-invalid': errors.title}"
          placeholder="How can we help?"
          required
          maxlength="120"
        />
        <div class="invalid-feedback" v-if="errors.title">{{ errors.title }}</div>
      </div>

      <div class="mb-3">
        <label class="form-label" for="message">Message</label>
        <textarea
          id="message"
          v-model.trim="message"
          rows="5"
          class="form-control"
          :class="{'is-invalid': errors.message}"
          placeholder="Please include relevant details (20–1000 characters)."
          required
          minlength="20"
          maxlength="1000"
        />
        <div class="invalid-feedback" v-if="errors.message">{{ errors.message }}</div>
        <small class="text-muted">{{ message.length }}/1000</small>
      </div>

      <!-- 简单的 spam 蜜罐：用户看不见，机器人会填 -->
      <input v-model="honeypot" type="text" class="d-none" tabindex="-1" autocomplete="off" />

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          <span v-if="submitting">Sending…</span>
          <span v-else>Send</span>
        </button>
        <button type="button" class="btn btn-outline-secondary" :disabled="submitting" @click="resetForm">
          Reset
        </button>
      </div>
    </form>

    <p v-if="statusMsg" class="alert mt-3" :class="statusClass" role="status" aria-live="polite">
      {{ statusMsg }}
    </p>
  </main>
</template>

<script setup>
import emailjs from '@emailjs/browser'
import { ref, computed } from 'vue'

// form state
const name = ref('')
const email = ref('')
const title = ref('')
const message = ref('')
const errors = ref({})
const submitting = ref(false)
const statusMsg = ref('')
const honeypot = ref('') // 非空则直接忽略

// 样式：根据状态提示自动切换
const statusClass = computed(() =>
  statusMsg.value.startsWith('✅') ? 'alert-success' : 'alert-danger'
)

// 简单校验
const emailRe = /^\S+@\S+\.\S+$/
function validate() {
  const e = {}
  if (!name.value || name.value.length < 2) e.name = 'Please enter your name.'
  if (!emailRe.test(email.value)) e.email = 'Please enter a valid email address.'
  if (!title.value || title.value.length < 2) e.title = 'Please provide a subject.'
  if (!message.value || message.value.length < 20) e.message = 'Message should be at least 20 characters.'
  errors.value = e
  return Object.keys(e).length === 0
}

// 30 秒节流，避免重复提交
const KEY_LAST_SENT = 'contact_email_last_sent'
function canSendNow() {
  const last = Number(localStorage.getItem(KEY_LAST_SENT) || 0)
  return Date.now() - last > 30_000
}
function markSent() {
  localStorage.setItem(KEY_LAST_SENT, String(Date.now()))
}

function resetForm() {
  name.value = ''
  email.value = ''
  title.value = ''
  message.value = ''
  errors.value = {}
  statusMsg.value = ''
  honeypot.value = ''
}

async function onSubmit() {
  statusMsg.value = ''
  if (honeypot.value) return // 机器人命中蜜罐，直接静默返回

  if (!validate()) {
    statusMsg.value = '❌ Please fix the highlighted fields.'
    return
  }
  if (!canSendNow()) {
    statusMsg.value = '❌ You are sending too frequently. Please wait a moment.'
    return
  }

  submitting.value = true
  try {
    const vars = {
      name: name.value,
      email: email.value,
      title: title.value,
      message: message.value,
      time: new Date().toLocaleString(),
    }

    // 通过环境变量提供配置（Vite 前缀必须是 VITE_）
    const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS env is missing (SERVICE_ID / TEMPLATE_ID / PUBLIC_KEY).')
    }

    // 注意：也可以先 emailjs.init(publicKey)；这里用 send 的第四参即可
    await emailjs.send(serviceId, templateId, vars, publicKey)

    statusMsg.value = '✅ Message sent successfully!'
    markSent()
    resetForm()
  } catch (err) {
    statusMsg.value = `❌ Failed to send: ${err?.text || err?.message || 'Unknown error'}`
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* 让 d-none 在无 Bootstrap 时也隐藏 */
.d-none { display: none; }
</style>
