<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h5 mb-0">Interactive Tables (D.3)</h1>
      <router-link class="btn btn-outline-primary btn-sm" to="/">← Back</router-link>
    </div>

    <!-- Table A: Programs -->
    <div class="card mb-4">
      <div class="card-header">Programs</div>
      <div class="card-body">
        <!-- DataTable A -->
        <DataTable
          class="display"
          :data="programRows"
          :columns="programCols"
          :options="dtOptions('programs')"
        />
      </div>
    </div>

    <!-- Table B: Enquiries / Users -->
    <div class="card">
      <div class="card-header">Enquiries (Mock Data)</div>
      <div class="card-body">
        <!-- DataTable B -->
        <DataTable
          class="display"
          :data="enquiryRows"
          :columns="enquiryCols"
          :options="dtOptions('enquiries')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// ------- A) Programs 表 -------
// 你也可以直接从服务器/已有状态拿，本示例用 /programs.json 或种子
const seedPrograms = [
  { id: 1, title: 'Community Sport Outreach', area: 'Community Sport', type: 'Workshop' },
  { id: 2, title: 'Nutrition Education Hub',  area: 'Nutrition',      type: 'Resource'  },
  { id: 3, title: 'Youth Wellbeing Chats',    area: 'Youth Mental Health', type: 'Support' },
  { id: 4, title: "Men's Health Check Days",  area: "Men's Health",   type: 'Clinic'    },
  { id: 5, title: "Women's Health Connect",   area: "Women's Health", type: 'Program'   },
]
const programs = ref([])

onMounted(async () => {
  try {
    const r = await fetch('/programs.json', { cache: 'no-store' })
    programs.value = r.ok ? await r.json() : seedPrograms
  } catch {
    programs.value = seedPrograms
  }
})

const programRows = computed(() =>
  programs.value.map(p => ({
    title: p.title,
    area: p.area,
    type: p.type,
    id: p.id
  }))
)

const programCols = [
  { title: 'Title', data: 'title' },
  { title: 'Area',  data: 'area'  },
  { title: 'Type',  data: 'type'  },
  { title: 'ID',    data: 'id'    },
]

// ------- B) Enquiries/Users 表（Mockaroo 或本地 fallback） -------
// 推荐在 /public/data/enquiries.json 放一份 Mockaroo 生成的 JSON：
// 字段示例：id, name, email, program, createdAt
const enquiries = ref([])
const fallbackEnquiries = [
  { id: 1001, name: 'Alice Walker',   email: 'alice@example.com',  program: 'Nutrition Education Hub', createdAt: '2025-10-01' },
  { id: 1002, name: 'Ben Turner',     email: 'ben@example.org',    program: 'Community Sport Outreach', createdAt: '2025-10-02' },
  { id: 1003, name: 'Chloe Smith',    email: 'chloe@example.net',  program: 'Youth Wellbeing Chats',    createdAt: '2025-10-03' },
  { id: 1004, name: 'Daniel Johnson', email: 'daniel@example.com', program: "Men's Health Check Days",  createdAt: '2025-10-04' },
  { id: 1005, name: 'Emma Brown',     email: 'emma@example.com',   program: "Women's Health Connect",   createdAt: '2025-10-05' },
  // ...建议用 Mockaroo 生成 50~200 条，演示分页更明显
]

onMounted(async () => {
  try {
    const r = await fetch('/data/enquiries.json', { cache: 'no-store' })
    enquiries.value = r.ok ? await r.json() : fallbackEnquiries
  } catch {
    enquiries.value = fallbackEnquiries
  }
})

const enquiryRows = computed(() =>
  enquiries.value.map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    program: e.program,
    createdAt: e.createdAt
  }))
)

const enquiryCols = [
  { title: 'ID',        data: 'id'        },
  { title: 'Name',      data: 'name'      },
  { title: 'Email',     data: 'email'     },
  { title: 'Program',   data: 'program'   },
  { title: 'Created At',data: 'createdAt' },
]

// ------- 公共：DataTables 选项（分页10/页 + 每列搜索 + 排序 + 全局搜索） -------
// key 用于区分两张表，避免 header/input 混淆
function dtOptions(key) {
  return {
    paging: true,
    pageLength: 10,
    lengthChange: false,   // 不展示 10/25/50 切换
    searching: true,       // 顶部全局搜索
    ordering: true,
    order: [],             // 默认不强制排序，让用户自己点表头
    responsive: true,
    autoWidth: false,
    dom: 'ftip',           // f=filter, t=table, i=info, p=pagination（精简布局）
    initComplete: function () {
      // 在每个表头th下方放一个输入框做“单列搜索”
      const api = this.api()
      const header = api.table().header()
      // 避免重复插入
      if (header.dataset.filtersReady === '1') return
      header.dataset.filtersReady = '1'

      const headerCells = header.querySelectorAll('th')
      headerCells.forEach((th, idx) => {
        const wrap = document.createElement('div')
        wrap.style.marginTop = '4px'
        const input = document.createElement('input')
        input.type = 'search'
        input.placeholder = 'Search'
        input.className = 'form-control form-control-sm'
        input.style.minWidth = '120px'
        input.addEventListener('keyup', () => {
          api.column(idx).search(input.value).draw()
        })
        wrap.appendChild(input)
        th.appendChild(wrap)
      })
    },
    language: {
      search: 'Search all:',
      zeroRecords: 'No matching records',
      info: 'Showing _START_ to _END_ of _TOTAL_ rows',
      infoEmpty: '0 rows',
      paginate: { previous: 'Prev', next: 'Next' }
    }
  }
}
</script>
