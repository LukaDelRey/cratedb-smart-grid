<template>
  <svg class="mini-chart" viewBox="0 0 320 132" preserveAspectRatio="none">
    <defs>
      <linearGradient :id="areaId" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#1b9cff" stop-opacity=".34" />
        <stop offset="100%" stop-color="#1b9cff" stop-opacity="0" />
      </linearGradient>
    </defs>

    <path class="chart-grid" d="M28 18H302M28 46H302M28 74H302M28 102H302M80 14V110M138 14V110M196 14V110M254 14V110" />
    <path class="axis-line" d="M28 14V110H306" />
    <text class="axis-label y-label" x="4" y="21">100</text>
    <text class="axis-label y-label" x="10" y="76">50</text>
    <text class="axis-label y-label" x="15" y="111">0</text>
    <text class="axis-label" x="28" y="127">14:00</text>
    <text class="axis-label" x="138" y="127">20:00</text>
    <text class="axis-label" x="248" y="127">02:00</text>

    <path class="actual-area" :d="actualAreaPath" :fill="`url(#${areaId})`" />
    <polyline
      class="chart actual"
      :points="actualPoints"
    />
    <polyline
      class="chart forecast"
      :points="forecastPoints"
    />
    <g class="point-layer">
      <circle
        v-for="point in displayPoints"
        :key="point.key"
        :cx="point.x"
        :cy="point.y"
        r="2.5"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

const props = defineProps({
  seed:{
    type:Number,
    default:72
  },
  actualValues:{
    type:Array as PropType<number[]>,
    default:() => []
  }
})

const areaId = `tt-chart-area-${Math.round(Math.random() * 100000)}`

function measuredPoints(){
  const values = props.actualValues.filter(Number.isFinite).slice(-48)

  return values.map((value,index) => ({
    key:index,
    x:Number((28 + (index / Math.max(1, values.length - 1)) * 278).toFixed(1)),
    y:Number((110 - (Math.max(0,Math.min(100,value)) / 100) * 96).toFixed(1))
  }))
}

const actualPointList = computed(measuredPoints)
const forecastPointList = computed(() => [])
const displayPoints = computed(() =>
  actualPointList.value.filter((_,index) => index % 4 === 0 || index === actualPointList.value.length - 1)
)
const actualPoints = computed(() =>
  actualPointList.value.map(point => `${point.x},${point.y}`).join(' ')
)
const forecastPoints = computed(() =>
  forecastPointList.value.map(point => `${point.x},${point.y}`).join(' ')
)
const actualAreaPath = computed(() => {
  const points = actualPointList.value

  if(!points.length){
    return ''
  }

  return [
    `M${points[0].x},110`,
    ...points.map(point => `L${point.x},${point.y}`),
    `L${points[points.length - 1].x},110`,
    'Z'
  ].join(' ')
})
</script>

<style scoped>
.mini-chart{
  width:100%;
  height:132px;
}

.chart-grid{
  stroke:rgba(143,169,184,.18);
  stroke-width:1;
  fill:none;
  vector-effect:non-scaling-stroke;
}

.axis-line{
  stroke:rgba(143,169,184,.24);
  stroke-width:1;
  fill:none;
  vector-effect:non-scaling-stroke;
}

.axis-label{
  fill:#8fa9b8;
  font-size:9px;
}

.y-label{
  text-anchor:start;
}

.actual-area{
  opacity:.9;
}

.chart{
  fill:none;
  stroke-width:1.9;
  stroke-linecap:round;
  stroke-linejoin:round;
  vector-effect:non-scaling-stroke;
}

.actual{
  stroke:#38bfff;
  filter:drop-shadow(0 0 4px rgba(56,191,255,.5));
}

.forecast{
  stroke:#5bec67;
  stroke-dasharray:5 5;
  filter:drop-shadow(0 0 3px rgba(91,236,103,.38));
}

.point-layer circle{
  fill:#38bfff;
  stroke:#07111f;
  stroke-width:1;
  opacity:.82;
}
</style>
