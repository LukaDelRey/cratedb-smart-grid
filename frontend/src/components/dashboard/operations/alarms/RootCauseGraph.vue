<template>
  <div class="root-flow">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :fit-view-on-init="true"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="true"
      class="root-flow-canvas"
    >
      <Background
        :gap="16"
        :size="1"
        color="rgba(64,196,255,.18)"
      />
      <Controls
        :show-interactive="false"
        position="bottom-right"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useI18n } from '../../../../i18n'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const props = defineProps({
  chain:{
    type:Array as PropType<any[]>,
    default:() => []
  }
})

const { translateText } = useI18n()

const nodes = computed(() =>
  props.chain.map((node,index) => ({
    id:`node-${index}`,
    type:'default',
    position:{
      x:index * 220,
      y:index % 2 === 0 ? 22 : 108
    },
    data:{
      label:`${translateText(node.step)}: ${translateText(node.title)} (${node.confidence}%)`
    },
    class:[
      'root-node',
      index === 0 ? 'signal-node' : '',
      index === props.chain.length - 1 ? 'action-node' : ''
    ].join(' ')
  }))
)

const edges = computed(() =>
  props.chain.slice(1).map((_,index) => ({
    id:`edge-${index}`,
    source:`node-${index}`,
    target:`node-${index + 1}`,
    animated:true,
    type:'smoothstep',
    markerEnd:MarkerType.ArrowClosed,
    style:{
      stroke:'#40c4ff',
      strokeWidth:2
    }
  }))
)
</script>

<style>
.root-flow{
  height:180px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  overflow:hidden;
  background:
    radial-gradient(circle at 20% 15%, rgba(64,196,255,.12), transparent 34%),
    rgba(255,255,255,.025);
}

.root-flow-canvas{
  width:100%;
  height:100%;
}

.vue-flow__node.root-node{
  width:150px;
  padding:9px 10px;
  color:#f5fbff;
  font-size:11px;
  line-height:1.25;
  background:#0b1625;
  border:1px solid rgba(64,196,255,.42);
  border-radius:8px;
  box-shadow:0 0 18px rgba(64,196,255,.12);
}

.vue-flow__node.signal-node{
  border-color:#ffca28;
}

.vue-flow__node.action-node{
  border-color:#00e676;
}

.vue-flow__handle{
  width:6px;
  height:6px;
  border-color:#07111f;
  background:#40c4ff;
}

.vue-flow__controls{
  background:#07111f;
  border:1px solid rgba(64,196,255,.2);
  box-shadow:none;
}

.vue-flow__controls-button{
  width:22px;
  height:22px;
  color:#e8fbff;
  background:#07111f;
  border-bottom:1px solid rgba(64,196,255,.14);
}
</style>
