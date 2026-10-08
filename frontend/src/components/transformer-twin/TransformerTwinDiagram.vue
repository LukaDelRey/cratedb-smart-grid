<template>
  <section
    class="diagram-card relative-position overflow-hidden"
    :class="{ compact }"
  >
    <div
      v-if="showControls"
      class="diagram-toolbar absolute"
      style="z-index: 3; top: 10px"
    >
      <q-btn-toggle
        v-model="mode"
        dense
        text-color="blue-grey-2"
        toggle-color="cyan"
        toggle-text-color="black"
        unelevated
        :options="viewOptions"
      />
    </div>

    <div class="diagram-stage overflow-hidden">
      <div
        class="scan-grid absolute-full"
        style="
          opacity: 0.5;
          background:
            linear-gradient(90deg, rgba(64, 196, 255, 0.09) 1px, transparent 1px),
            linear-gradient(0deg, rgba(64, 196, 255, 0.075) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: radial-gradient(circle at 50% 48%, black, transparent 77%);
        "
      />

      <div
        class="grid-floor absolute"
        style="
          left: -12%;
          right: -12%;
          bottom: -28%;
          height: 57%;
          opacity: 0.56;
          transform: perspective(720px) rotateX(62deg);
          transform-origin: center bottom;
          background:
            linear-gradient(90deg, rgba(48, 173, 255, 0.2) 1px, transparent 1px),
            linear-gradient(0deg, rgba(48, 173, 255, 0.17) 1px, transparent 1px);
          background-size: 38px 38px;
          box-shadow: 0 -18px 70px rgba(24, 135, 255, 0.14);
          mask-image: linear-gradient(180deg, transparent 0%, black 22%, transparent 88%);
        "
      />

      <div
        class="blueprint-glow absolute"
        style="
          left: 11%;
          top: 15%;
          width: 76%;
          height: 61%;
          border-radius: 50%;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(68, 196, 255, 0.34),
            rgba(39, 128, 255, 0.11) 42%,
            transparent 72%
          );
          filter: blur(18px);
          opacity: 0.78;
        "
      />

      <img
        alt="Power transformer"
        class="transformer-image absolute"
        src="../../assets/transformer-twin/power-transformer.png"
        style="
          z-index: 2;
          object-fit: contain;
          opacity: 0.84;
          filter: grayscale(0.82) sepia(0.3) hue-rotate(157deg) saturate(3.5) brightness(0.92)
            contrast(1.34) drop-shadow(0 0 18px rgba(61, 184, 255, 0.78))
            drop-shadow(0 0 44px rgba(32, 142, 255, 0.38));
          mix-blend-mode: screen;
        "
      />

      <div
        class="transformer-wireframe absolute"
        style="
          z-index: 3;
          left: 8%;
          top: 16%;
          width: 82%;
          height: 58%;
          opacity: 0.28;
          background:
            repeating-linear-gradient(
              90deg,
              transparent 0 28px,
              rgba(113, 211, 255, 0.52) 29px 30px
            ),
            repeating-linear-gradient(0deg, transparent 0 24px, rgba(113, 211, 255, 0.2) 25px 26px);
          filter: drop-shadow(0 0 12px rgba(64, 196, 255, 0.45));
          mask-image: url('../../assets/transformer-twin/power-transformer.png');
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
        "
      />

      <div
        class="energy-rib rib-a absolute"
        style="left: 36%; width: 2px"
      />

      <div
        class="energy-rib rib-b absolute"
        style="left: 50%; width: 2px"
      />

      <div
        class="energy-rib rib-c absolute"
        style="left: 66%; width: 2px"
      />

      <div
        v-for="callout in callouts"
        class="callout absolute items-center row no-wrap"
        :class="callout.side"
        :key="callout.label"
        :style="{ left: callout.x + '%', top: callout.y + '%' }"
      >
        <span
          class="node"
          style="width: 9px; height: 9px"
        />

        <i
          class="line block"
          style="height: 1px"
        />

        <div
          class="callout-box"
          style="
            border: 1px solid rgba(97, 185, 255, 0.38);
            border-radius: 5px;
            background: linear-gradient(180deg, rgba(9, 24, 40, 0.92), rgba(5, 13, 24, 0.9));
            box-shadow:
              0 12px 30px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.05),
              0 0 18px rgba(64, 196, 255, 0.08);
            backdrop-filter: blur(10px);
          "
        >
          <small
            class="block"
            style="font-size: 10px; line-height: 1.15"
          >
            {{ callout.label }}
          </small>

          <strong
            class="block q-mt-xs text-weight-medium text-h6"
            style="line-height: 1.08"
          >
            {{ callout.value }}
            <em
              v-if="callout.unit"
              class="text-body2"
            >
              {{ callout.unit }}
            </em>
          </strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Keep component selector isolation for the shared stylesheet.
defineOptions({ __scopeId: 'data-v-ui-05e485f2' });

import { ref } from 'vue';
import type { PropType } from 'vue';

defineProps({
  callouts: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  compact: {
    type: Boolean,
    default: false,
  },
  showControls: {
    type: Boolean,
    default: true,
  },
});

const mode = ref('3d');

const viewOptions = [
  { label: '3D VIEW', value: '3d' },
  { label: 'X-RAY VIEW', value: 'xray' },
  { label: 'EXPLODED VIEW', value: 'exploded' },
];
</script>
