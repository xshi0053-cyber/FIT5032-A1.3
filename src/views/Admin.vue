<template>
  <div class="container py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Admin Panel (Role: admin)</h1>
      <router-link to="/" class="btn btn-outline-primary btn-sm">← Back to Home</router-link>
    </div>

    <!-- 规则提示 -->
    <div class="alert alert-info py-2 mb-3">
      Rule: only accounts whose email ends with
      <code>@{{ ADMIN_DOMAIN }}</code>
      are allowed to have the <b>admin</b> role. These accounts also cannot be downgraded to <b>member</b>.
    </div>

    <!-- KPI cards -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">用户总数</div>
            <div class="fs-3 fw-bold">{{ kpi.usersTotal }}</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">管理员</div>
            <div class="fs-3 fw-bold">{{ kpi.admins }}</div>
            <div class="text-muted small">普通用户：{{ kpi.members }}</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">近 7 天咨询</div>
            <div class="fs-3 fw-bold">{{ kpi.enquiries7d }}</div>
          </div>
        </div>
      </div>
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-muted small">平均评分</div>
            <div class="fs-3 fw-bold">{{ kpi.avgRating.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色管理 -->
    <div class="card mb-3">
      <div class="card-body">
        <p class="text-muted small mb-3">Manage user roles.</p>

        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th style="width:220px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.name }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="badge text-bg-secondary text-uppercase">
                    {{ u.role }}
                  </span>
                </td>
                <td>
                  <div class="btn-group">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="changeRole(u.email, 'admin')"
                      :disabled="busy || u.role === 'admin'">
                      Make Admin
                    </button>
                    <button
                      class="btn btn-sm btn-outline-secondary"
                      @click="changeRole(u.email, 'member')"
                      :disabled="busy || u.role === 'member' || u.email.toLowerCase().endsWith('@' + ADMIN_DOMAIN)">
                      Make Member
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!users.length">
                <td colspan="4" class="text-center text-muted">No users yet.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="toast" class="alert mt-2 py-2" :class="toastClass">{{ toast }}</div>
      </div>
    </div>

    <!-- 最近咨询 Top 10 -->
    <div class="card">
      <div class="card-header">
        最近咨询
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th style="min-width:120px;">姓名</th>
                <th style="min-width:200px;">邮箱</th>
                <th style="min-width:140px;">项目</th>
                <th style="min-width:180px;">时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in latest" :key="it.id">
                <td>{{ it.name }}</td>
                <td>{{ it.email }}</td>
                <td>{{ it.program }}</td>
                <td>{{ formatTime(it.createdAt) }}</td>
              </tr>
              <tr v-if="!latest.length">
                <td colspan="4" class="text-center text-muted py-3">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import {onMounted, ref, computed} from 'vue'
import {listUsers, setUserRole, ADMIN_DOMAIN} from '../authentication'

const users = ref([])
const toast = ref('')
const busy = ref(false)

// KPI + 最近咨询
const kpi = ref({usersTotal: 0, admins: 0, members: 0, enquiries7d: 0, avgRating: 0})
const latest = ref([])

const base = import.meta.env.VITE_CF_BASE_URL

async function loadUsers () {
  busy.value = true
  try {
    users.value = await listUsers()
  } finally {
    busy.value = false
  }
}

async function loadKpi () {
  try {
    const r = await fetch(`${base}/admin/metrics`)
    if (!r.ok) throw new Error('metrics failed')
    kpi.value = await r.json()
  } catch (e) {
    // 静默失败即可，不影响角色管理
    console.error(e)
  }
}

async function loadLatest () {
  try {
    const r = await fetch(`${base}/submissions?limit=10`)
    if (!r.ok) throw new Error('submissions failed')
    const data = await r.json()
    latest.value = Array.isArray(data.items) ? data.items : []
  } catch (e) {
    console.error(e)
  }
}

function formatTime (ts) {
  try {
    if (ts && ts.seconds) return new Date(ts.seconds * 1000).toLocaleString()
    return new Date(ts).toLocaleString()
  } catch (e) {
    return '-'
  }
}

async function changeRole (email, role) {
  busy.value = true
  try {
    await setUserRole(email, role)
    await loadUsers()
    toast.value = `Role of ${email} set to ${role}`
  } catch (e) {
    toast.value = e?.message || 'Failed to update role'
  } finally {
    busy.value = false
    setTimeout(() => (toast.value = ''), 2500)
  }
}

const toastClass = computed(() =>
  toast.value.startsWith('Role of') ? 'alert-success' : 'alert-danger'
)

onMounted(async () => {
  await Promise.all([loadUsers(), loadKpi(), loadLatest()])
})

// 暴露 ADMIN_DOMAIN 给模板使用（你原本的写法保留）
defineExpose({ADMIN_DOMAIN})
</script>
