<template>
  <svg
    class="mini-chart full-width"
    preserveAspectRatio="none"
    style="height: 132px"
    viewBox="0 0 320 132"
  >
    <defs>
      <linearGradient
        x1="0"
        x2="0"
        y1="0"
        y2="1"
        :id="areaId"
      >
        <stop
          offset="0%"
          stop-color="#1b9cff"
          stop-opacity=".34"
        />

        <stop
          offset="100%"
          stop-color="#1b9cff"
          stop-opacity="0"
        />
      </linearGradient>
    </defs>

    <path
      class="chart-grid"
      d="M28 18H302M28 46H302M28 74H302M28 102H302M80 14V110M138 14V110M196 14V110M254 14V110"
    />

    <path
      class="axis-line"
      d="M28 14V110H306"
      style="
        stroke: rgba(143, 169, 184, 0.24);
        stroke-width: 1;
        fill: none;
        vector-effect: non-scaling-stroke;
      "
    />

    <text
      class="axis-label y-label"
      style="font-size: 9px"
      x="4"
      y="21"
    >
      100
    </text>

    <text
      class="axis-label y-label"
      style="font-size: 9px"
      x="10"
      y="76"
    >
      50
    </text>

    <text
      class="axis-label y-label"
      style="font-size: 9px"
      x="15"
      y="111"
    >
      0
    </text>

    <text
      class="axis-label"
      style="font-size: 9px"
      x="28"
      y="127"
    >
      14:00
    </text>

    <text
      class="axis-label"
      style="font-size: 9px"
      x="138"
      y="127"
    >
      20:00
    </text>

    <text
      class="axis-label"
      style="font-size: 9px"
      x="248"
      y="127"
    >
      02:00
    </text>

    <path
      class="actual-area"
      style="opacity: 0.9"
      :d="actualAreaPath"
      :fill="`url(#${areaId})`"
    />

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
        r="2.5"
        :cx="point.x"
        :cy="point.y"
        :key="point.key"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-11cc1b38' });

import { computed } from 'vue';
import type { PropType } from 'vue';

const props = defineProps({
  seed: {
    type: Number,
    default: 72,
  },
  actualValues: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
});

const areaId = `tt-chart-area-${Math.round(Math.random() * 100000)}`;

function measuredPoints() {
  const values = props.actualValues.filter(Number.isFinite).slice(-48);

  return values.map((value, index) => ({
    key: index,
    x: Number((28 + (index / Math.max(1, values.length - 1)) * 278).toFixed(1)),
    y: Number((110 - (Math.max(0, Math.min(100, value)) / 100) * 96).toFixed(1)),
  }));
}

const actualPointList = computed(measuredPoints);

const forecastPointList = computed(() => []);

const displayPoints = computed(() =>
  actualPointList.value.filter(
    (_, index) => index % 4 === 0 || index === actualPointList.value.length - 1,
  ),
);

const actualPoints = computed(() =>
  actualPointList.value.map((point) => `${point.x},${point.y}`).join(' '),
);

const forecastPoints = computed(() =>
  forecastPointList.value.map((point) => `${point.x},${point.y}`).join(' '),
);

const actualAreaPath = computed(() => {
  const points = actualPointList.value;

  if (!points.length) {
    return '';
  }

  return [
    `M${points[0].x},110`,
    ...points.map((point) => `L${point.x},${point.y}`),
    `L${points[points.length - 1].x},110`,
    'Z',
  ].join(' ');
});
</script>
