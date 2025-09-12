<template>
  <div class="rating" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="i in max"
      :key="i"
      type="button"
      class="star"
      :class="{ filled: i <= internal }"
      role="radio"
      :aria-checked="i === internal"
      :disabled="readonly"
      @click="set(i)"
      @keydown.enter.prevent="set(i)"
      @keydown.space.prevent="set(i)"
      :title="`${i} / ${max}`"
    >
      ★
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },          
  max: { type: Number, default: 5 },           
  readonly: { type: Boolean, default: false },  
  ariaLabel: { type: String, default: 'Rating' }
})

const emit = defineEmits(['rate'])

const internal = ref(props.value || 0)
watch(() => props.value, v => { internal.value = v || 0 })

function set(n) {
  if (props.readonly) return
  internal.value = n
  emit('rate', n) 
}
</script>

<style scoped>
.rating { display: inline-flex; gap: .25rem; }
.star {
  appearance: none;
  border: none;
  background: none;
  padding: 0;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.star.filled { color: #ffc107; }   
.star:disabled { cursor: not-allowed; opacity: .6; }
</style>
