<template>
  <div>
    <!-- Programs -->
    <section class="mb-4">
      <div class="d-flex flex-column flex-md-row align-items-md-center mb-3 gap-2">
        <h2 class="h5 mb-0">Programs</h2>
        <div class="ms-md-auto d-flex gap-2">
          <input class="form-control" type="search" placeholder="Filter by title…"
                 v-model.trim="filters.q" aria-label="Filter programs" />
          <select class="form-select" v-model="filters.area" aria-label="Area filter">
            <option value="">All Areas</option>
            <option v-for="a in areas" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-md-6 col-lg-4" v-for="p in filteredPrograms" :key="p.id">
          <div class="card h-100">
            <div class="card-body d-flex flex-column">
              <h3 class="h6">{{ p.title }}</h3>
              <p class="text-muted small mb-2">Area: {{ p.area }}</p>
              <p class="mb-2">{{ p.summary }}</p>

              
              <div class="d-flex align-items-center gap-2 mb-1">
                <RatingStars :value="roundedAvg(p.id)" :readonly="true" aria-label="Average rating"/>
                <small class="text-muted">
                  {{ avgNumber(p.id) }} ({{ ratingMap[p.id]?.count || 0 }})
                </small>
              </div>

              <div v-if="isAuthed" class="mb-2">
                <div class="d-flex align-items-center gap-2">
                  <span class="small text-muted">Your rating:</span>
                  <RatingStars
                    :value="ratingMap[p.id]?.my || 0"
                    @rate="n => rateProgram(p, n)"
                    aria-label="Your rating"
                  />
                  <small v-if="ratingMap[p.id]?.my" class="text-muted">
                    ({{ ratingMap[p.id]?.my }}/5)
                  </small>
                </div>
              </div>

              <div class="mt-auto d-flex justify-content-between align-items-center">
                <span class="badge text-bg-primary">{{ p.type }}</span>
                <button class="btn btn-sm btn-outline-primary" @click="selectProgram(p)">Learn more</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Offcanvas -->
      <div class="offcanvas offcanvas-end" tabindex="-1" id="programCanvas" aria-labelledby="programCanvasLabel">
        <div class="offcanvas-header">
          <h5 id="programCanvasLabel">{{ selected?.title || 'Program' }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
          <p class="mb-1"><strong>Area:</strong> {{ selected?.area }}</p>
          <p class="mb-1"><strong>Type:</strong> {{ selected?.type }}</p>
          <p class="mb-3"><strong>Summary:</strong> {{ selected?.summary }}</p>
          <p class="small text-muted">ID: {{ selected?.id }}</p>
        </div>
      </div>
    </section>

    <!-- Contact & Referral -->
    <section class="mb-5">
      <h2 class="h5 mb-3">Contact & Referral</h2>

      <div class="alert alert-info" v-if="isAdmin">
        You are signed in as <strong>ADMIN</strong>. Admins cannot submit enquiries here.
        Please use a <em>member</em> account to submit referrals.
      </div>

      <div :class="['card', formStateClass]">
        <div class="card-body">
          <form novalidate @submit.prevent="handleSubmit">
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label" for="name">Full name</label>
                <input id="name" type="text" class="form-control"
                       v-model.trim="form.name" maxlength="60"
                       :disabled="formDisabled" :aria-invalid="!!errors.name" />
                <div class="invalid-feedback d-block" v-if="errors.name">{{ errors.name }}</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label" for="email">Email</label>
                <input id="email" type="email" class="form-control"
                       v-model.trim="form.email" :disabled="formDisabled"
                       :aria-invalid="!!errors.email" />
                <div class="invalid-feedback d-block" v-if="errors.email">{{ errors.email }}</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label" for="topic">Program of interest</label>
                <select id="topic" class="form-select" v-model="form.topic"
                        :disabled="formDisabled" :aria-invalid="!!errors.topic">
                  <option value="">Select a program…</option>
                  <option v-for="p in programs" :key="p.id" :value="p.title">{{ p.title }}</option>
                </select>
                <div class="invalid-feedback d-block" v-if="errors.topic">{{ errors.topic }}</div>
              </div>

              <div class="col-12">
                <label class="form-label" for="message">Message</label>
                <textarea id="message" rows="4" class="form-control"
                          v-model.trim="form.message" maxlength="500"
                          :disabled="formDisabled" :aria-invalid="!!errors.message"></textarea>
                <div class="form-text text-end">{{ form.message.length }}/500</div>
                <div class="invalid-feedback d-block" v-if="errors.message">{{ errors.message }}</div>
              </div>

              <div class="col-12">
                <div class="form-check">
                  <input id="consent" class="form-check-input" type="checkbox"
                         v-model="form.consent" :disabled="formDisabled"
                         :aria-invalid="!!errors.consent" />
                  <label class="form-check-label" for="consent">
                    I consent to be contacted about this enquiry.
                  </label>
                </div>
                <div class="invalid-feedback d-block" v-if="errors.consent">{{ errors.consent }}</div>
              </div>

              <div class="col-12 d-flex gap-2">
                <button class="btn btn-primary" type="submit" :disabled="!canSubmit || formDisabled">Submit</button>
                <button class="btn btn-outline-secondary" type="button" @click="resetForm" :disabled="formDisabled">Reset</button>
              </div>

              <div class="col-12" v-if="serverError">
                <div class="alert alert-danger mt-2 mb-0">{{ serverError }}</div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="alert alert-success mt-3" role="alert" v-if="submitted">
        ✅ Thank you! Your enquiry has been received.
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import RatingStars from '../components/RatingStars.vue'
import { authState as auth, isAuthenticated, hasRole } from '../authentication'
import { submitEnquiryToServer, getProgramRating, submitProgramRating } from '../serverStub'
import { sanitizeText } from '../utils/sanitize'        

/* ---------- Programs & Filters ---------- */
const programs = ref([])
const selected = ref(null)
const areas = ref(['Community Sport','Nutrition','Youth Mental Health',"Men's Health","Women's Health"])
const filters = reactive({ q: '', area: '' })

const seed = [
  { id: 1, title: 'Community Sport Outreach', area: 'Community Sport', type: 'Workshop', summary: 'Local sports programs that promote physical activity and social inclusion.' },
  { id: 2, title: 'Nutrition Education Hub', area: 'Nutrition', type: 'Resource', summary: 'Evidence-based nutrition guides for families and schools.' },
  { id: 3, title: 'Youth Wellbeing Chats', area: 'Youth Mental Health', type: 'Support', summary: 'Peer-led sessions focusing on resilience and help-seeking.' },
  { id: 4, title: "Men's Health Check Days", area: "Men's Health", type: 'Clinic', summary: 'Free screenings and education on preventable conditions.' },
  { id: 5, title: "Women's Health Connect", area: "Women's Health", type: 'Program', summary: 'Workshops on reproductive health and community resources.' },
]

onMounted(async () => {
  try {
    const r = await fetch('/programs.json', { cache: 'no-store' })
    programs.value = r.ok ? await r.json() : seed
  } catch {
    programs.value = seed
  } finally {
    await refreshAllRatings()
  }
})

const filteredPrograms = computed(() => {
  const q = (filters.q || '').toLowerCase()
  return programs.value.filter(p => {
    const matchesQ = !q || p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)
    const matchesArea = !filters.area || p.area === filters.area
    return matchesQ && matchesArea
  })
})

function selectProgram(p) {
  selected.value = p
  const el = document.getElementById('programCanvas')
  if (el && window.bootstrap) new window.bootstrap.Offcanvas(el).show()
}


const ratingMap = reactive({}) // { [programId]: { avg, count, my } }
const isAuthed = computed(() => isAuthenticated && isAuthenticated())
const userId = computed(() => auth?.user?.email || auth?.user?.name || null)

async function refreshAllRatings() {
  const uid = userId.value
  programs.value.forEach(p => {
    ratingMap[p.id] = getProgramRating(p.id, uid)
  })
}
function roundedAvg(id) { return Math.round(ratingMap[id]?.avg || 0) }
function avgNumber(id)  { const a = ratingMap[id]?.avg || 0; return a.toFixed(1) }

async function rateProgram(p, stars) {
  if (!isAuthed.value) return
  try {
    const res = await submitProgramRating({
      programId: p.id,
      userId: userId.value,
      stars,
      comment: '' 
    })
    ratingMap[p.id] = res
  } catch (e) {
    console.error(e)
  }
}


const form = reactive({ name: '', email: '', topic: '', message: '', consent: false })
const submitted = ref(false)
const errors = reactive({ name: '', email: '', topic: '', message: '', consent: '' })
const serverError = ref('')

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
const MAX_NAME = 60
const MAX_MSG  = 500
const tagRegex = /<[^>]*>/          
const urlRegex = /https?:\/\/\S+/i  
const repeat3  = /(.)\1{2,}/        

function validate() {
  // name
  errors.name = !form.name
    ? 'Please enter your name.'
    : form.name.length > MAX_NAME
    ? `Name must be <= ${MAX_NAME} characters.`
    : ''

  // email
  errors.email = emailRegex.test(form.email) ? '' : 'Please enter a valid email address.'

  // topic
  errors.topic = form.topic ? '' : 'Please select a program.'

  
  errors.message = !form.message
    ? 'Message is required.'
    : tagRegex.test(form.message)
    ? 'HTML/JS is not allowed in message.'
    : urlRegex.test(form.message)
    ? 'Please do not include URLs.'
    : repeat3.test(form.message)
    ? 'Please avoid repeated characters (e.g. "aaa").'
    : form.message.length < 20
    ? 'Message must be at least 20 characters.'
    : form.message.length > MAX_MSG
    ? `Message must be <= ${MAX_MSG} characters.`
    : ''

  // consent
  errors.consent = form.consent ? '' : 'Consent is required.'
}

const hasErrors = computed(() => Object.values(errors).some(Boolean))
const canSubmit = computed(() => { validate(); return !hasErrors.value })
const formStateClass = computed(() => (!hasErrors.value ? 'is-valid' : 'is-invalid'))

const isAdmin = computed(() => hasRole && hasRole('admin'))
const formDisabled = computed(() => isAdmin.value)

const router = useRouter()

async function handleSubmit() {
  validate()
  if (hasErrors.value) return

  if (!isAuthed.value) {
    router.push({ name: 'login', query: { redirect: '/' } })
    return
  }
  if (isAdmin.value) return

  serverError.value = ''
  try {
    const payload = {
      name: sanitizeText(form.name),
      email: sanitizeText(form.email),
      topic: sanitizeText(form.topic),
      message: sanitizeText(form.message)
    }
    await submitEnquiryToServer(payload)
    submitted.value = true
    resetForm()
  } catch (e) {
    const es = e?.errors || {}
    if (es._global) serverError.value = es._global
    if (es.name) errors.name = es.name
    if (es.email) errors.email = es.email
    if (es.topic) errors.topic = es.topic
    if (es.message) errors.message = es.message
  }
}

function resetForm() {
  Object.assign(form, { name: '', email: '', topic: '', message: '', consent: false })
  Object.keys(errors).forEach(k => (errors[k] = ''))
  
}
</script>

<style scoped>

:deep(.rating .star) {
  color: #d0d5dd;            
  text-shadow: 0 0 0.5px #888;
}
:deep(.rating .star.filled) {
  color: #ffb300;            
  filter: drop-shadow(0 0 1px rgba(0,0,0,.15));
}
</style>
