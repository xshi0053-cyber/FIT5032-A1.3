<!-- src/views/Home.vue -->
<template>
  <main class="container py-4">
    <!-- Top toolbar -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Programs</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" @click="gotoTables">
          View interactive tables
        </button>
        <router-link class="btn btn-sm btn-outline-secondary" :to="{ name: 'email-campaigns' }">
          Email Campaigns
        </router-link>
        <router-link class="btn btn-sm btn-outline-secondary" :to="{ name: 'booking' }">
          Booking
        </router-link>
        <router-link class="btn btn-sm btn-outline-secondary" :to="{ name: 'map' }">
          Map / Find &amp; Route
        </router-link>
      </div>
    </div>

    <!-- Admin quick bar (only for admins) -->
    <div
      v-if="isAdmin"
      class="alert alert-warning d-flex align-items-center justify-content-between mb-3 py-2"
    >
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <strong class="me-2">Admin tools</strong>
        <router-link class="btn btn-sm btn-outline-dark" to="/admin">Dashboard</router-link>
        <router-link class="btn btn-sm btn-outline-dark" to="/tables">Interactive tables</router-link>
        <router-link class="btn btn-sm btn-outline-dark" to="/email-campaigns">Email Campaigns</router-link>
        <router-link class="btn btn-sm btn-outline-dark" to="/map">Map / Find &amp; Route</router-link>
      </div>
      <div class="small text-muted d-flex gap-3">
        <span>7d enquiries: <b>{{ kpi.enquiries7d }}</b></span>
        <span>Avg rating: <b>{{ kpi.avgRating.toFixed(2) }}</b></span>
      </div>
    </div>

    <!-- Filters -->
    <div class="row g-2 mb-3" role="region" aria-label="Filter programs">
      <div class="col-md-6">
        <label for="filterTitle" class="sr-only">Filter by title</label>
        <input
          id="filterTitle"
          v-model.trim="filterTitle"
          type="text"
          class="form-control"
          placeholder="Filter by title..."
        />
      </div>
      <div class="col-md-6">
        <label for="filterArea" class="sr-only">Filter by area</label>
        <select id="filterArea" v-model="filterArea" class="form-select" aria-label="Filter by area">
          <option value="">All Areas</option>
          <option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
    </div>

    <!-- Program cards -->
    <div class="row g-3 mb-5" role="region" aria-label="Programs list">
      <div
        v-for="p in filteredPrograms"
        :key="p.id"
        class="col-12 col-md-6 col-lg-4"
      >
        <article class="card h-100 shadow-sm rounded-4" :aria-labelledby="`p-${p.id}`">
          <div class="card-body">
            <h5 class="card-title mb-1" :id="`p-${p.id}`">{{ p.title }}</h5>
            <div class="text-muted small mb-2">Area: {{ p.area }}</div>
            <p class="card-text">{{ p.summary }}</p>

            <div class="mt-2">
              <RatingStars :program-id="p.id" :user-id="currentUserId" />
            </div>

            <div class="mt-3 d-flex align-items-center">
              <span class="badge rounded-pill bg-primary-subtle text-primary border me-auto">
                {{ p.type }}
              </span>
              <button
                class="btn btn-sm btn-outline-primary"
                @click="selectProgram(p.title)"
                type="button"
              >
                Learn more
              </button>
              <button
                class="btn btn-sm btn-primary ms-2"
                type="button"
                @click="bookThisProgram(p)"
              >
                Book
              </button>
            </div>
          </div>
        </article>
      </div>

      <p
        v-if="filteredPrograms.length === 0"
        class="text-muted text-center py-4"
        role="status"
        aria-live="polite"
      >
        No programs match the current filters.
      </p>
    </div>

    <!-- Contact & Referral form -->
    <h3 class="mb-3">Contact &amp; Referral</h3>

    <p v-if="toast.success" class="alert alert-success" role="status" aria-live="polite">
      {{ toast.success }}
    </p>
    <p v-if="toast.error" class="alert alert-danger" role="alert" aria-live="assertive">
      {{ toast.error }}
    </p>

    <form
      novalidate
      role="form"
      aria-labelledby="contact-title"
      @submit.prevent="handleSubmit"
      @reset.prevent="handleReset"
    >
      <span id="contact-title" class="sr-only">Contact and referral form</span>

      <div class="card">
        <div class="card-body">
          <div class="row g-3">
            <!-- Name -->
            <div class="col-md-6">
              <label class="form-label" for="fullName">Full name</label>
              <input
                id="fullName"
                v-model.trim="name"
                type="text"
                class="form-control"
                :class="{ 'is-invalid': errors.name }"
                placeholder="Please enter your name."
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? 'err-name' : null"
                autocomplete="name"
                required
                ref="refName"
              />
              <div class="invalid-feedback" id="err-name" v-if="errors.name">
                {{ errors.name }}
              </div>
            </div>

            <!-- Email -->
            <div class="col-md-6">
              <label class="form-label" for="emailInput">Email</label>
              <input
                id="emailInput"
                v-model.trim="email"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': errors.email }"
                placeholder="Please enter a valid email address."
                :aria-invalid="!!errors.email"
                :aria-describedby="errors.email ? 'err-email' : null"
                autocomplete="email"
                required
                ref="refEmail"
              />
              <div class="invalid-feedback" id="err-email" v-if="errors.email">
                {{ errors.email }}
              </div>
            </div>

            <!-- Program -->
            <div class="col-md-6">
              <label class="form-label" for="programSel">Program of interest</label>
              <select
                id="programSel"
                v-model="programTitle"
                class="form-select"
                :class="{ 'is-invalid': errors.program }"
                :aria-invalid="!!errors.program"
                :aria-describedby="errors.program ? 'err-program' : null"
                required
                ref="refProgram"
              >
                <option value="">Select a program...</option>
                <option v-for="p in programs" :key="p.id" :value="p.title">
                  {{ p.title }}
                </option>
              </select>
              <div class="invalid-feedback" id="err-program" v-if="errors.program">
                {{ errors.program }}
              </div>
            </div>

            <!-- Message -->
            <div class="col-12">
              <label class="form-label" for="msgArea">Message</label>
              <textarea
                id="msgArea"
                v-model="message"
                class="form-control"
                rows="5"
                maxlength="500"
                :class="{ 'is-invalid': errors.message }"
                placeholder="Please include relevant details (20–500 characters)."
                :aria-invalid="!!errors.message"
                :aria-describedby="errors.message ? 'err-message' : 'msg-help'"
                required
                ref="refMessage"
              />
              <div id="msg-help" class="form-text">20–500 characters.</div>
              <div class="invalid-feedback d-block" id="err-message" v-if="errors.message">
                {{ errors.message }}
              </div>
              <small class="text-muted ms-auto">{{ message.length }}/500</small>
            </div>

            <!-- Consent -->
            <fieldset class="col-12">
              <legend class="sr-only">Consent</legend>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="consent"
                  v-model="consentChecked"
                  :class="{ 'is-invalid': errors._global || errors.consent }"
                  :aria-invalid="!!(errors._global || errors.consent)"
                  :aria-describedby="(errors._global || errors.consent) ? 'err-consent' : null"
                  required
                  ref="refConsent"
                />
                <label class="form-check-label" for="consent">
                  I consent to be contacted about this enquiry.
                </label>
              </div>
              <div class="invalid-feedback d-block" id="err-consent" v-if="errors._global || errors.consent">
                {{ errors._global || errors.consent || 'Consent is required.' }}
              </div>
            </fieldset>
          </div>

          <!-- Actions -->
          <div class="mt-3 d-flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Submitting…' : (online ? 'Submit' : 'Save to Outbox') }}
            </button>
            <button type="reset" class="btn btn-outline-secondary" :disabled="submitting">
              Reset
            </button>
            <button type="button" class="btn btn-outline-primary ms-auto" @click="gotoTables">
              View tables
            </button>
          </div>
        </div>
      </div>
    </form>
  </main>
</template>

<script setup>
import { ref, computed, nextTick, watchEffect, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import RatingStars from '../components/RatingStars.vue'
import { submitEnquiryToServer } from '../serverStub.js'
import { authState, ADMIN_DOMAIN } from '../authentication.js'
import { useOnline } from '../components/useOnline'
import { addToOutbox, outboxCount } from '../utils/outbox'

const router = useRouter()
const { online } = useOnline()                 // online/offline state
const OUTBOX_KEY = 'nfp_draft_enquiry'         // local draft key

/* Programs data */
const programs = ref([
  { id: 'p1', title: 'Community Sport Outreach', area: 'Community Sport', type: 'Workshop',
    summary: 'Local sports programs that promote physical activity and social inclusion.' },
  { id: 'p2', title: 'Nutrition Education Hub', area: 'Nutrition', type: 'Resource',
    summary: 'Evidence-based nutrition guides for families and schools.' },
  { id: 'p3', title: 'Youth Wellbeing Chats', area: 'Youth Mental Health', type: 'Support',
    summary: 'Peer-led sessions focusing on resilience and help-seeking.' },
  { id: 'p4', title: "Men's Health Check Days", area: "Men's Health", type: 'Clinic',
    summary: 'Free screenings and education on preventable conditions.' },
  { id: 'p5', title: "Women's Health Connect", area: "Women's Health", type: 'Program',
    summary: 'Workshops on reproductive health and community resources.' },
])

/* Filters */
const filterTitle = ref('')
const filterArea  = ref('')
const areaOptions = computed(() => Array.from(new Set(programs.value.map(p => p.area))))
const filteredPrograms = computed(() => {
  const t = filterTitle.value.toLowerCase()
  const a = filterArea.value
  return programs.value.filter(p => {
    const okTitle = !t || p.title.toLowerCase().includes(t)
    const okArea  = !a || p.area === a
    return okTitle && okArea
  })
})

/* Form bindings */
const name = ref(''); const email = ref(''); const programTitle = ref('')
const message = ref(''); const consentChecked = ref(false)
const submitting = ref(false); const errors = ref({})
const toast = ref({ success: '', error: '' })
const currentUserId = computed(() => authState?.user?.uid || '')

/* Refs for focusing first error field */
const refName = ref(null)
const refEmail = ref(null)
const refProgram = ref(null)
const refMessage = ref(null)
const refConsent = ref(null)

/* Admin & KPI */
const base = import.meta.env.VITE_CF_BASE_URL
const kpi = ref({ enquiries7d: 0, avgRating: 0 })

const isAdmin = computed(() => {
  const role = authState?.role || authState?.claims?.role
  if (role === 'admin') return true
  const emailAddr = (authState?.user?.email || '').toLowerCase()
  return emailAddr.endsWith('@' + ADMIN_DOMAIN)
})

async function loadKpi () {
  try {
    const r = await fetch(`${base}/admin/metrics`)
    if (!r.ok) return
    const data = await r.json()
    kpi.value.enquiries7d = data.enquiries7d ?? 0
    kpi.value.avgRating = data.avgRating ?? 0
  } catch (_) {}
}
watchEffect(() => { if (isAdmin.value) loadKpi() })

/* ----- Draft: restore on mount ----- */
onMounted(() => {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      name.value = d.name || ''
      email.value = d.email || ''
      programTitle.value = d.program || ''
      message.value = d.message || ''
      consentChecked.value = !!d.consent
    }
  } catch (_) {}
})

/* ----- Draft: autosave whenever fields change ----- */
watch([name, email, programTitle, message, consentChecked], () => {
  const d = {
    name: name.value,
    email: email.value,
    program: programTitle.value,
    message: message.value,
    consent: consentChecked.value,
    t: Date.now(),
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(d))
})

/* Interactions */
function selectProgram (title) {
  programTitle.value = title
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}
function bookThisProgram (p) {
  router.push({ name: 'booking', query: { programId: p.id, programName: p.title } })
}

async function focusFirstError () {
  await nextTick()
  if (errors.value.name && refName.value) return refName.value.focus()
  if (errors.value.email && refEmail.value) return refEmail.value.focus()
  if (errors.value.program && refProgram.value) return refProgram.value.focus()
  if (errors.value.message && refMessage.value) return refMessage.value.focus()
  if ((errors.value._global || errors.value.consent) && refConsent.value) return refConsent.value.focus()
}

async function handleSubmit () {
  errors.value = {}
  toast.value = { success: '', error: '' }
  submitting.value = true

  const payload = {
    name: name.value,
    email: email.value,
    program: programTitle.value,
    message: message.value,
    consent: consentChecked.value,
  }

  try {
    if (!online.value) {
      // Offline: push to Outbox and notify
      addToOutbox(payload)
      toast.value.success = `Saved to Outbox (${outboxCount()} queued). It will auto-send when you're online.`
      localStorage.removeItem(OUTBOX_KEY)
      name.value = email.value = programTitle.value = message.value = ''
      consentChecked.value = false
      return
    }

    // Online: normal submit
    await submitEnquiryToServer(payload)

    toast.value.success = 'Your enquiry has been submitted successfully.'
    localStorage.removeItem(OUTBOX_KEY)
    name.value = email.value = programTitle.value = message.value = ''
    consentChecked.value = false

    router.push({ name: 'tables', query: { t: Date.now() } })
  } catch (e) {
    if (e?.errors) {
      errors.value = e.errors
      toast.value.error = 'Please fix the highlighted fields.'
      await focusFirstError()
    } else {
      toast.value.error = 'Submission failed. Please try again later.'
    }
  } finally {
    submitting.value = false
  }
}

function handleReset () {
  name.value = email.value = programTitle.value = message.value = ''
  consentChecked.value = false
  errors.value = {}
  toast.value = { success: '', error: '' }
}

function gotoTables () {
  router.push({ name: 'tables', query: { t: Date.now() } })
}
</script>

<style scoped>
.container { max-width: 1100px; }
.card-title { font-weight: 600; }
.badge { font-size: 0.8rem; }
</style>
