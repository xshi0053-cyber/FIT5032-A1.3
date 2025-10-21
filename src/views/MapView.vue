<template>
  <main class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Find & Route</h2>
      <router-link class="btn btn-sm btn-outline-primary" :to="{ name: 'home' }">← Back to Home</router-link>
    </div>

    <!-- 控件区：搜索/我的位置/一键规划 -->
    <form class="card mb-3" @submit.prevent="routeNow" aria-label="Map controls">
      <div class="card-body">
        <div class="row g-3">
          <!-- 起点 -->
          <div class="col-md-5 position-relative">
            <label class="form-label" for="start">Start</label>
            <div class="input-group">
              <input
                id="start"
                v-model.trim="startQuery"
                class="form-control"
                type="text"
                autocomplete="off"
                placeholder="Search a place or click on map…"
                @input="debouncedSearch('start')"
                aria-autocomplete="list"
                aria-controls="start-suggestions"
              />
              <button class="btn btn-outline-secondary" type="button" @click="useMyLocation('start')">
                Use my location
              </button>
            </div>
            <ul
              v-if="showStartList"
              id="start-suggestions"
              class="list-group position-absolute z-10 w-100"
              role="listbox"
              style="max-height: 220px; overflow:auto;"
            >
              <li
                v-for="(s, i) in startResults"
                :key="'s-'+i"
                class="list-group-item list-group-item-action"
                role="option"
                tabindex="0"
                @click="pickSuggestion('start', s)"
                @keydown.enter.prevent="pickSuggestion('start', s)"
              >
                {{ s.display_name }}
              </li>
            </ul>
            <div class="form-text" v-if="startPickedLabel">Chosen: {{ startPickedLabel }}</div>
          </div>

          <!-- 终点 -->
          <div class="col-md-5 position-relative">
            <label class="form-label" for="end">Destination</label>
            <div class="input-group">
              <input
                id="end"
                v-model.trim="endQuery"
                class="form-control"
                type="text"
                autocomplete="off"
                placeholder="Search a place or click on map…"
                @input="debouncedSearch('end')"
                aria-autocomplete="list"
                aria-controls="end-suggestions"
              />
              <button class="btn btn-outline-secondary" type="button" @click="useMyLocation('end')">
                Use my location
              </button>
            </div>
            <ul
              v-if="showEndList"
              id="end-suggestions"
              class="list-group position-absolute z-10 w-100"
              role="listbox"
              style="max-height: 220px; overflow:auto;"
            >
              <li
                v-for="(s, i) in endResults"
                :key="'e-'+i"
                class="list-group-item list-group-item-action"
                role="option"
                tabindex="0"
                @click="pickSuggestion('end', s)"
                @keydown.enter.prevent="pickSuggestion('end', s)"
              >
                {{ s.display_name }}
              </li>
            </ul>
            <div class="form-text" v-if="endPickedLabel">Chosen: {{ endPickedLabel }}</div>
          </div>

          <div class="col-md-2 d-flex align-items-end gap-2">
            <button class="btn btn-primary w-100" type="submit">Route</button>
            <button class="btn btn-outline-secondary w-100" type="button" @click="resetAll">Reset</button>
          </div>
        </div>

        <div class="mt-3 small text-muted">
          Tip: you can also <strong>click on the map</strong> to set start (first click) and destination (second click).
        </div>
      </div>
    </form>

    <!-- 地图 -->
    <div ref="mapRef" class="rounded-3 shadow-sm" style="height: 520px;" role="region" aria-label="Interactive map"></div>

    <!-- 路线摘要 -->
    <div v-if="routeInfo" class="alert alert-info mt-3" role="status" aria-live="polite">
      <div class="fw-semibold mb-1">Route summary</div>
      <div>Distance: {{ (routeInfo.distance/1000).toFixed(2) }} km • Duration: {{ minutes(routeInfo.duration) }} min</div>
    </div>

    <!-- 逐步指引（turn-by-turn） -->
    <section v-if="routeSteps.length" class="card mt-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold">Turn-by-turn directions</span>
        <span class="text-muted small">{{ routeSteps.length }} steps</span>
      </div>
      <ol class="list-group list-group-numbered">
        <li
          v-for="(s, i) in routeSteps"
          :key="'step-'+i"
          class="list-group-item d-flex justify-content-between align-items-start"
        >
          <div class="ms-2 me-auto">
            <div class="fw-semibold">{{ s.text }}</div>
            <div class="small text-muted">
              {{ (s.distance/1000).toFixed(2) }} km • {{ minutes(s.duration) }} min
            </div>
          </div>
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import maplibregl from 'maplibre-gl'

// --- 简易防抖 ---
function debounce (fn, ms = 300) {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) }
}

// --- 状态 ---
const mapRef = ref(null)
let map, startMarker, endMarker, routeLayerId = 'route-line'
const start = ref(null) // {lng, lat}
const end = ref(null)
const startQuery = ref(''); const endQuery = ref('')
const startResults = ref([]); const endResults = ref([])
const showStartList = ref(false); const showEndList = ref(false)
const startPickedLabel = ref(''); const endPickedLabel = ref('')
const routeInfo = ref(null)
const routeSteps = ref([]) // ← 逐步指引

// --- 地图初始化 ---
onMounted(() => {
  map = new maplibregl.Map({
    container: mapRef.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [144.9631, -37.8136], // Melbourne
    zoom: 10,
    attributionControl: true
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }))

  // 点击地图：先设 start，再设 end；两点都有则画线
  map.on('click', (e) => {
    const { lng, lat } = e.lngLat
    if (!start.value) setPoint('start', { lng, lat }, 'Dropped pin (start)')
    else if (!end.value) { setPoint('end', { lng, lat }, 'Dropped pin (destination)'); routeNow() }
    else { resetAll(); setPoint('start', { lng, lat }, 'Dropped pin (start)') }
  })

  // 浏览器定位：启动时尽量居中到用户
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12 }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }
})
onBeforeUnmount(() => { if (map) map.remove() })

// --- 选择位置/打点 ---
function setPoint(which, { lng, lat }, label = '') {
  if (which === 'start') {
    start.value = { lng, lat }; startPickedLabel.value = label; startQuery.value = label
    startMarker ? startMarker.setLngLat([lng, lat]) :
      (startMarker = new maplibregl.Marker({ color: '#1e90ff' }).setLngLat([lng, lat]).addTo(map))
  } else {
    end.value = { lng, lat }; endPickedLabel.value = label; endQuery.value = label
    endMarker ? endMarker.setLngLat([lng, lat]) :
      (endMarker = new maplibregl.Marker({ color: '#f33' }).setLngLat([lng, lat]).addTo(map))
  }
}

// --- 搜索（Nominatim） ---
const debouncedSearch = debounce(async (which) => {
  const q = which === 'start' ? startQuery.value : endQuery.value
  if (!q || q.length < 2) {
    if (which === 'start') { startResults.value = []; showStartList.value = false }
    else { endResults.value = []; showEndList.value = false }
    return
  }
  // 公共服务，演示足够；生产建议自建或用商用 API
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const data = await res.json()
  if (which === 'start') { startResults.value = data; showStartList.value = true }
  else { endResults.value = data; showEndList.value = true }
}, 350)

function pickSuggestion(which, item) {
  const lng = parseFloat(item.lon), lat = parseFloat(item.lat)
  setPoint(which, { lng, lat }, item.display_name)
  which === 'start' ? (showStartList.value = false) : (showEndList.value = false)
  map.flyTo({ center: [lng, lat], zoom: 14 })
}

// --- 使用我的位置 ---
function useMyLocation(which) {
  if (!navigator.geolocation) return alert('Geolocation not supported')
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lng = pos.coords.longitude, lat = pos.coords.latitude
      setPoint(which, { lng, lat }, 'My location')
      map.flyTo({ center: [lng, lat], zoom: 14 })
    },
    err => alert('Failed to get location: ' + err.message),
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// --- 路线规划（OSRM） + 逐步指引 ---
async function routeNow() {
  if (!start.value || !end.value) return
  const coords = `${start.value.lng},${start.value.lat};${end.value.lng},${end.value.lat}`
  // 加上 steps=true 才会返回分步
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.routes?.length) return alert('No route found')

  const route = data.routes[0]
  routeInfo.value = { distance: route.distance, duration: route.duration }

  // 逐步指引：把 OSRM 的 steps 转成人类可读文本
  const stepsRaw = route.legs.flatMap(l => l.steps || [])
  routeSteps.value = stepsRaw.map(step => ({
    text: formatStep(step),
    distance: step.distance,
    duration: step.duration
  }))

  // 画线：如果已有图层先移除
  if (map.getLayer(routeLayerId)) { map.removeLayer(routeLayerId); map.removeSource(routeLayerId) }
  map.addSource(routeLayerId, { type: 'geojson', data: { type: 'Feature', geometry: route.geometry } })
  map.addLayer({
    id: routeLayerId,
    type: 'line',
    source: routeLayerId,
    paint: { 'line-color': '#0d6efd', 'line-width': 5, 'line-opacity': 0.8 }
  })

  // 调整视野
  const bbox = geoBbox(route.geometry)
  map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 60 })
}

// --- OSRM step → 文本指令（简易格式化） ---
function formatStep(step) {
  const m = step.maneuver || {}
  const road = step.name || 'unnamed road'
  const mod = m.modifier ? m.modifier.toLowerCase() : ''
  switch ((m.type || '').toLowerCase()) {
    case 'depart':     return `Head ${mod || 'out'} on ${road}`
    case 'arrive':     return `Arrive at destination`
    case 'turn':       return `Turn ${mod || ''} onto ${road}`.trim()
    case 'continue':   return `Continue ${mod || 'straight'} on ${road}`
    case 'merge':      return `Merge ${mod || ''} onto ${road}`.trim()
    case 'fork':       return `Keep ${mod || ''} to stay on ${road}`.trim()
    case 'end of road':return `End of road, ${mod ? 'turn ' + mod : 'continue'} onto ${road}`
    case 'roundabout':
    case 'rotary':
      return `Enter roundabout, take exit ${m.exit || ''} to ${road}`.trim()
    case 'on ramp':    return `Take the ramp ${mod || ''} onto ${road}`.trim()
    case 'off ramp':   return `Take the exit ${mod || ''} toward ${road}`.trim()
    case 'new name':   return `Continue onto ${road}`
    default:           return `${capitalize(m.type || 'Continue')} ${mod ? mod + ' ' : ''}${road ? 'on ' + road : ''}`.trim()
  }
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s }

// --- 简单 bbox 计算 ---
function geoBbox(geo) {
  const coords = geo.coordinates.flat(1)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of coords) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
  return [minX, minY, maxX, maxY]
}

function resetAll() {
  start.value = end.value = null
  startQuery.value = endQuery.value = ''
  startPickedLabel.value = endPickedLabel.value = ''
  showStartList.value = showEndList.value = false
  routeInfo.value = null
  routeSteps.value = []
  if (startMarker) { startMarker.remove(); startMarker = null }
  if (endMarker) { endMarker.remove(); endMarker = null }
  if (map?.getLayer(routeLayerId)) { map.removeLayer(routeLayerId); map.removeSource(routeLayerId) }
}

function minutes(sec) { return Math.round(sec / 60) }
</script>

<style scoped>
.container { max-width: 1100px; }
.list-group.position-absolute { max-width: 100%; }
</style>
