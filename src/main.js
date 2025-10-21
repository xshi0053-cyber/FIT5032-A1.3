// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { onAuthReady } from './authentication'

// DataTables（Vue3 适配 + 样式）
import DataTable from 'datatables.net-vue3'
import DataTablesLib from 'datatables.net'
import 'datatables.net-dt/css/dataTables.dataTables.min.css'
import './assets/a11y.css'

// ① 绑定底层库
DataTable.use(DataTablesLib)

onAuthReady.then(() => {
  const app = createApp(App)

  // ② 注册全局组件：<DataTable />
  app.component('DataTable', DataTable)

  app.use(router).mount('#app')
})
