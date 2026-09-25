<template>
  <section class="diagram-card" :class="{ compact }">
    <div v-if="showControls" class="diagram-toolbar">
      <q-btn-toggle
        v-model="mode"
        dense
        unelevated
        toggle-color="cyan"
        toggle-text-color="black"
        text-color="blue-grey-2"
        :options="viewOptions"
      />
    </div>

    <div class="diagram-stage">
      <div class="scan-grid" />
      <div class="grid-floor" />
      <div class="blueprint-glow" />
      <img
        class="transformer-image"
        src="../../assets/transformer-twin/power-transformer.png"
        alt="Power transformer"
      >
      <div class="transformer-wireframe" />
      <div class="energy-rib rib-a" />
      <div class="energy-rib rib-b" />
      <div class="energy-rib rib-c" />

      <div
        v-for="callout in callouts"
        :key="callout.label"
        class="callout"
        :class="callout.side"
        :style="{ left:callout.x + '%', top:callout.y + '%' }"
      >
        <span class="node" />
        <i class="line" />
        <div class="callout-box">
          <small>{{ callout.label }}</small>
          <strong>
            {{ callout.value }}
            <em v-if="callout.unit">{{ callout.unit }}</em>
          </strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  callouts:{
    type:Array,
    default:() => []
  },
  compact:{
    type:Boolean,
    default:false
  },
  showControls:{
    type:Boolean,
    default:true
  }
})

const mode = ref('3d')

const viewOptions = [
  { label:'3D VIEW', value:'3d' },
  { label:'X-RAY VIEW', value:'xray' },
  { label:'EXPLODED VIEW', value:'exploded' }
]
</script>

<style scoped>
.diagram-card{
  position:relative;
  min-height:566px;
  overflow:hidden;
  border:1px solid rgba(72,151,205,.22);
  border-radius:5px;
  background:
    radial-gradient(circle at 48% 30%, rgba(48,173,255,.22), transparent 34%),
    radial-gradient(circle at 50% 62%, rgba(57,255,170,.07), transparent 38%),
    linear-gradient(180deg,rgba(6,17,31,.64),rgba(3,10,18,.95));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04), 0 18px 45px rgba(0,0,0,.24);
}

.diagram-card.compact{
  min-height:300px;
}

.diagram-card.compact .transformer-image{
  left:8%;
  top:8%;
  width:84%;
  height:78%;
}

.diagram-card.compact .callout-box{
  min-width:92px;
  padding:7px 9px;
}

.diagram-card.compact .callout-box strong{
  font-size:16px;
}

.diagram-card.compact .callout.right{
  transform:translateX(-118px);
}

.diagram-card.compact .callout.left{
  transform:translateX(24px);
}

.diagram-card.compact .line{
  width:30px;
}

.diagram-toolbar{
  position:absolute;
  z-index:3;
  top:10px;
  right:10px;
}

.diagram-stage{
  position:absolute;
  inset:0;
  overflow:hidden;
}

.scan-grid{
  position:absolute;
  inset:0;
  opacity:.5;
  background:
    linear-gradient(90deg, rgba(64,196,255,.09) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.075) 1px, transparent 1px);
  background-size:22px 22px;
  mask-image:radial-gradient(circle at 50% 48%, black, transparent 77%);
}

.grid-floor{
  position:absolute;
  left:-12%;
  right:-12%;
  bottom:-28%;
  height:57%;
  opacity:.56;
  transform:perspective(720px) rotateX(62deg);
  transform-origin:center bottom;
  background:
    linear-gradient(90deg, rgba(48,173,255,.2) 1px, transparent 1px),
    linear-gradient(0deg, rgba(48,173,255,.17) 1px, transparent 1px);
  background-size:38px 38px;
  box-shadow:0 -18px 70px rgba(24,135,255,.14);
  mask-image:linear-gradient(180deg,transparent 0%,black 22%,transparent 88%);
}

.blueprint-glow{
  position:absolute;
  left:11%;
  top:15%;
  width:76%;
  height:61%;
  border-radius:50%;
  background:
    radial-gradient(circle at 50% 50%, rgba(68,196,255,.34), rgba(39,128,255,.11) 42%, transparent 72%);
  filter:blur(18px);
  opacity:.78;
}

.transformer-image{
  position:absolute;
  z-index:2;
  left:3.5%;
  top:8%;
  width:91%;
  height:78%;
  object-fit:contain;
  opacity:.84;
  filter:
    grayscale(.82)
    sepia(.3)
    hue-rotate(157deg)
    saturate(3.5)
    brightness(.92)
    contrast(1.34)
    drop-shadow(0 0 18px rgba(61,184,255,.78))
    drop-shadow(0 0 44px rgba(32,142,255,.38));
  mix-blend-mode:screen;
}

.transformer-wireframe{
  position:absolute;
  z-index:3;
  left:8%;
  top:16%;
  width:82%;
  height:58%;
  opacity:.28;
  background:
    repeating-linear-gradient(90deg, transparent 0 28px, rgba(113,211,255,.52) 29px 30px),
    repeating-linear-gradient(0deg, transparent 0 24px, rgba(113,211,255,.2) 25px 26px);
  filter:drop-shadow(0 0 12px rgba(64,196,255,.45));
  mask-image:url('../../assets/transformer-twin/power-transformer.png');
  mask-size:contain;
  mask-repeat:no-repeat;
  mask-position:center;
}

.energy-rib{
  position:absolute;
  z-index:4;
  top:31%;
  height:42%;
  width:2px;
  border-radius:999px;
  background:linear-gradient(180deg,transparent,#40c4ff 18%,#76ff9b 54%,#40c4ff 82%,transparent);
  box-shadow:0 0 14px rgba(64,196,255,.78);
  opacity:.78;
}

.rib-a{ left:36%; }
.rib-b{ left:50%; height:48%; top:27%; opacity:.86; }
.rib-c{ left:66%; }

.diagram-stage::after{
  content:'';
  position:absolute;
  z-index:5;
  inset:0;
  pointer-events:none;
  background:
    linear-gradient(90deg, transparent, rgba(64,196,255,.12), transparent),
    linear-gradient(180deg, rgba(255,255,255,.03), transparent 18%, transparent 72%, rgba(0,0,0,.22)),
    radial-gradient(circle at 50% 52%, transparent 0 42%, rgba(2,7,14,.34) 78%);
}

.callout{
  position:absolute;
  z-index:4;
  display:flex;
  align-items:center;
  gap:0;
}

.callout.right{
  flex-direction:row;
}

.callout.left{
  flex-direction:row-reverse;
}

.node{
  width:9px;
  height:9px;
  border-radius:50%;
  background:#6cff9d;
  border:1px solid rgba(221,255,235,.72);
  box-shadow:0 0 0 6px rgba(108,255,157,.08), 0 0 18px rgba(108,255,157,.86);
}

.line{
  width:62px;
  height:1px;
  display:block;
  background:linear-gradient(90deg,rgba(108,255,157,.94),rgba(72,184,255,.48));
}

.callout.left .line{
  background:linear-gradient(90deg,rgba(67,185,255,.4),rgba(108,255,157,.9));
}

.callout-box{
  min-width:104px;
  padding:9px 12px 10px;
  border:1px solid rgba(97,185,255,.38);
  border-radius:5px;
  background:linear-gradient(180deg,rgba(9,24,40,.92),rgba(5,13,24,.9));
  box-shadow:0 12px 30px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05), 0 0 18px rgba(64,196,255,.08);
  backdrop-filter:blur(10px);
}

.callout-box small,
.callout-box strong,
.callout-box em{
  display:block;
}

.callout-box small{
  color:#d5e8f4;
  font-size:10px;
  line-height:1.15;
}

.callout-box strong{
  margin-top:2px;
  color:#f5fbff;
  font-size:19px;
  font-weight:500;
  line-height:1.08;
}

.callout-box em{
  display:inline;
  color:#b5cddc;
  font-size:13px;
  font-style:normal;
}

@media (max-width: 1480px){
  .diagram-card:not(.compact) .line{
    width:40px;
  }

  .diagram-card:not(.compact) .callout-box{
    min-width:92px;
    padding:8px 10px;
  }

  .diagram-card:not(.compact) .callout-box strong{
    font-size:17px;
  }

  .diagram-card:not(.compact) .callout-box em{
    font-size:12px;
  }
}

@media (max-width: 760px){
  .diagram-card{
    min-height:480px;
  }

  .diagram-toolbar{
    left:50%;
    right:auto;
    transform:translateX(-50%);
  }

  .callout{
    transform:scale(.78);
  }

  .callout.right{
    transform:translateX(-86px) scale(.78);
    transform-origin:left center;
  }

  .callout.left{
    transform:translateX(18px) scale(.78);
    transform-origin:right center;
  }

  .callout .line{
    width:18px;
  }

  .callout-box{
    min-width:72px;
    max-width:86px;
    padding:7px;
  }

  .callout-box small{
    display:none;
  }

  .callout-box strong{
    font-size:13px;
  }

  .callout-box em{
    font-size:11px;
  }
}
</style>
