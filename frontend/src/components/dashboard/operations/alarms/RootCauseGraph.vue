<template>
  <div
    class="root-flow overflow-hidden"
    style="height: 180px"
  >
    <VueFlow
      class="root-flow-canvas full-height full-width"
      :edges="edges"
      :elements-selectable="true"
      :fit-view-on-init="true"
      :nodes="nodes"
      :nodes-connectable="false"
      :nodes-draggable="false"
    >
      <Background
        color="rgba(64,196,255,.18)"
        :gap="16"
        :size="1"
      />

      <Controls
        position="bottom-right"
        :show-interactive="false"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { VueFlow, MarkerType } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { useI18n } from '../../../../i18n';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';

const props = defineProps({
  chain: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
});

const { translateText } = useI18n();

const nodes = computed(() =>
  props.chain.map((node, index) => ({
    id: `node-${index}`,
    type: 'default',
    position: {
      x: index * 220,
      y: index % 2 === 0 ? 22 : 108,
    },
    data: {
      label: `${translateText(node.step)}: ${translateText(node.title)} (${node.confidence}%)`,
    },
    class: [
      'root-node',
      index === 0 ? 'signal-node' : '',
      index === props.chain.length - 1 ? 'action-node' : '',
    ].join(' '),
  })),
);

const edges = computed(() =>
  props.chain.slice(1).map((_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    animated: true,
    type: 'smoothstep',
    markerEnd: MarkerType.ArrowClosed,
    style: {
      stroke: '#40c4ff',
      strokeWidth: 2,
    },
  })),
);
</script>
