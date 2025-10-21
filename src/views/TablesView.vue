<!-- src/views/TablesView.vue -->
<template>
  <main class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2>Interactive Tables</h2>
      <router-link to="/" class="btn btn-outline-primary btn-sm">← Back to Home</router-link>
    </div>

    <!-- Programs -->
    <section class="card mb-5">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">Programs</span>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-success" @click="exportProgramsCSV" aria-label="Export programs as CSV">
            Export CSV
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="exportProgramsPDF" aria-label="Export programs as PDF">
            Export PDF
          </button>
        </div>
      </div>
      <div class="card-body">
        <DataTable
          id="programsTable"
          class="display table table-striped"
          :data="programs"
          :columns="programColumns"
          :options="dtOptions"
        />
      </div>
    </section>

    <!-- Enquiries -->
    <section class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">Enquiries</span>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-success" @click="exportEnquiriesCSV" aria-label="Export enquiries as CSV">
            Export CSV
          </button>
          <button class="btn btn-sm btn-outline-danger" @click="exportEnquiriesPDF" aria-label="Export enquiries as PDF">
            Export PDF
          </button>
        </div>
      </div>
      <div class="card-body">
        <DataTable
          id="enquiriesTable"
          class="display table table-striped"
          :data="enquiries"
          :columns="enquiryColumns"
          :options="dtOptions"
        />
      </div>
    </section>

    <footer class="text-center text-muted small py-3">
      © 2025 NFP Health Initiative
    </footer>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// ✅ DataTables（Vue3 + Bootstrap5）
import DataTable from 'datatables.net-vue3'
import DataTablesBS from 'datatables.net-bs5'
import 'datatables.net-bs5/css/dataTables.bootstrap5.css'
DataTable.use(DataTablesBS)

// ✅ 导出库
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

/* ------------ 示例 Programs 数据（与你首页一致） ------------ */
const programs = ref([
  { id: 1, title: 'Community Sport Outreach', area: 'Community Sport', type: 'Workshop', summary: 'Promotes activity & inclusion.' },
  { id: 2, title: 'Nutrition Education Hub',  area: 'Nutrition',       type: 'Resource',  summary: 'Guides for families and schools.' },
  { id: 3, title: 'Youth Wellbeing Chats',    area: 'Youth Mental Health', type: 'Support', summary: 'Peer-led sessions.' },
  { id: 4, title: "Men's Health Check Days",  area: "Men's Health",    type: 'Clinic',    summary: 'Free screenings and education.' },
  { id: 5, title: "Women's Health Connect",   area: "Women's Health",  type: 'Program',   summary: 'Workshops on health resources.' },
])

/* ------------ Enquiries：从 localStorage 读取并做“字段规范化” ------------ */
const enquiries = ref([])

onMounted(() => {
  const raw = JSON.parse(localStorage.getItem('nfp_server_submissions') || '[]')

  // 把旧记录统一映射到：time, name, email, program, consent, message
  const normalize = (x) => ({
    time:    x.time || x.createdAt || x.timestamp || '',
    name:    x.name || x.fullName || '',
    email:   x.email || '',
    program: x.program || x.topic || '',
    consent: typeof x.consent === 'boolean' ? (x.consent ? 'Yes' : 'No') : (x.consent ?? ''),
    message: x.message || x.text || ''
  })

  enquiries.value = raw.map(normalize)
})

/* ------------ DataTables 列定义（加 defaultContent 防止告警） ------------ */
const programColumns = [
  { data: 'id',      title: 'ID',      defaultContent: '' },
  { data: 'title',   title: 'Title',   defaultContent: '' },
  { data: 'area',    title: 'Area',    defaultContent: '' },
  { data: 'type',    title: 'Type',    defaultContent: '' },
  { data: 'summary', title: 'Summary', defaultContent: '' },
]

const enquiryColumns = [
  { data: 'time',    title: 'Time',    defaultContent: '' },
  { data: 'name',    title: 'Name',    defaultContent: '' },
  { data: 'email',   title: 'Email',   defaultContent: '' },
  { data: 'program', title: 'Program', defaultContent: '' },
  { data: 'consent', title: 'Consent', defaultContent: '' },
  { data: 'message', title: 'Message', defaultContent: '' },
]

/* ------------ DataTables 选项：每页 5 条，保留搜索/排序 ------------ */
const dtOptions = {
  pageLength: 5,
  lengthMenu: [5, 10, 25, 50],
  order: [], // 保持原数据顺序
}

/* ------------ 导出：CSV ------------ */
function exportProgramsCSV() {
  const csv = Papa.unparse(programs.value)
  downloadFile(csv, 'programs.csv', 'text/csv')
}
function exportEnquiriesCSV() {
  const csv = Papa.unparse(enquiries.value)
  downloadFile(csv, 'enquiries.csv', 'text/csv')
}

/* ------------ 导出：PDF（jsPDF + autoTable） ------------ */
function exportProgramsPDF() {
  const doc = new jsPDF()
  doc.text('Programs List', 14, 15)
  autoTable(doc, {
    startY: 20,
    head: [programColumns.map(c => c.title)],
    body: programs.value.map(p => [p.id, p.title, p.area, p.type, p.summary]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 110, 253] }
  })
  doc.save('programs.pdf')
}

function exportEnquiriesPDF() {
  const doc = new jsPDF()
  doc.text('Enquiries List', 14, 15)
  autoTable(doc, {
    startY: 20,
    head: [enquiryColumns.map(c => c.title)],
    body: enquiries.value.map(e => [
      e.time, e.name, e.email, e.program, e.consent, e.message
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 110, 253] }
  })
  doc.save('enquiries.pdf')
}

/* ------------ 通用下载工具 ------------ */
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.container { max-width: 1100px; }
.card { border-radius: 1rem; }
.dataTables_wrapper .dataTables_length,
.dataTables_wrapper .dataTables_filter {
  margin-bottom: .5rem;
}
</style>
