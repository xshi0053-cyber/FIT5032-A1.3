<template>
  <div class="container py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Admin Panel (Role: admin)</h1>
      <router-link to="/" class="btn btn-outline-primary btn-sm">← Back to Home</router-link>
    </div>

    <div class="alert alert-info py-2 mb-3">
      Rule: only accounts whose email ends with
      <code>@{{ ADMIN_DOMAIN }}</code>
      are allowed to have the <b>admin</b> role. These accounts also cannot be downgraded to <b>member</b>.
    </div>

    <div class="card">
      <div class="card-body">
        <p class="text-muted small">Manage user roles.</p>

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
                <td><span class="badge text-bg-secondary text-uppercase">{{ u.role }}</span></td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary"
                            @click="changeRole(u.email, 'admin')"
                            :disabled="u.role==='admin'">
                      Make Admin
                    </button>
                    <button class="btn btn-sm btn-outline-secondary"
                            @click="changeRole(u.email, 'member')"
                            :disabled="u.role==='member' || u.email.endsWith('@' + ADMIN_DOMAIN)">
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

        <div v-if="toast" class="alert alert-success mt-2 py-2">{{ toast }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getUsers, setUserRole, ADMIN_DOMAIN } from '../authentication'

const users = ref([])
const toast = ref('')

function load() {
  users.value = getUsers()
}
function changeRole(email, role) {
  setUserRole(email, role)
  load()
  toast.value = `Role of ${email} set to ${role}`
  setTimeout(() => (toast.value = ''), 2000)
}

onMounted(load)
</script>
