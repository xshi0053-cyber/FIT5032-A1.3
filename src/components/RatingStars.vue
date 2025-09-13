<template>
  <div
    class="rating"
    :class="{ readonly: props.readonly }"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="i in max"
      :key="i"
      type="button"
      class="star"
      :class="{ filled: i <= internal }"
      role="radio"
      :title="`${i} / ${max}`"
      :aria-checked="i === internal"
      :disabled="readonly"
      @click="set(i)"
      @keydown.enter.prevent="set(i)"
      @keydown.space.prevent="set(i)"
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
watch(() => props.value, v => (internal.value = v || 0))

function set(n) {
  if (props.readonly) return
  internal.value = n
  emit('rate', n)
}
</script>

<style scoped>
.rating {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
}


.star {
  appearance: none;
  border: 0;
  background: none;
  padding: 0;
  font-size: 1.25rem;          
  line-height: 1;
  color: #adb5bd;              
  cursor: pointer;
  transition: transform .12s ease, color .12s ease, text-shadow .12s ease;
  text-shadow: 0 0 1px rgba(0,0,0,.2); 
}


.star.filled {
  color: #ffc107;              
  text-shadow: 0 0 2px rgba(0,0,0,.25);
}


.rating:not(.readonly) .star:hover,
.rating:not(.readonly) .star:focus-visible {
  color: #fd7e14;              
  transform: scale(1.15);
  outline: none;
}


.star:focus-visible {
  box-shadow: 0 0 0 3px rgba(13,110,253,.35);
  border-radius: 3px;
}


.star:disabled {
  cursor: not-allowed;
  color: #ced4da;
  opacity: 1;                  
}
</style>
