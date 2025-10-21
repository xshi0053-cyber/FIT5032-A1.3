<template>
  <main class="container py-4">
    <h2 class="mb-3">Appointment Booking</h2>
    <div id="calendar" ref="calEl"></div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { db } from '@/firebase'       // 或 '@/firebase/init'，保持与你项目一致:contentReference[oaicite:7]{index=7}:contentReference[oaicite:8]{index=8}
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Calendar } from '@fullcalendar/core'

const calEl = ref(null)

async function hasConflict(start, end, resourceId) {
  const q = query(
    collection(db, 'bookings'),
    where('resourceId', '==', resourceId)
  )
  const snap = await getDocs(q)
  return snap.docs.some(d => {
    const x = d.data()
    return !(end <= x.start || start >= x.end)
  })
}

async function createBooking(info) {
  const payload = {
    title: info.event.title || 'Booking',
    start: info.startStr,
    end: info.endStr,
    resourceId: 'default',
    createdAt: Date.now()
  }
  if (await hasConflict(payload.start, payload.end, payload.resourceId)) {
    alert('Time slot conflicts with an existing booking.')
    info.revert()
    return
  }
  try {
    await addDoc(collection(db, 'bookings'), payload)
    window.dispatchEvent(new CustomEvent('booking:created'))
  } catch {
    const list = JSON.parse(localStorage.getItem('nfp_bookings') || '[]')
    list.push(payload)
    localStorage.setItem('nfp_bookings', JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('booking:created'))
  }
}

onMounted(async () => {
  const calendar = new Calendar(calEl.value, {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    selectable: true,
    select: async (sel) => {
      const title = prompt('Title?')
      if (title) {
        // 临时渲染，再做校验
        const temp = calendar.addEvent({ title, start: sel.start, end: sel.end })
        await createBooking({ event: temp, startStr: sel.startStr, endStr: sel.endStr })
      }
    }
  })
  calendar.render()
})
</script>
