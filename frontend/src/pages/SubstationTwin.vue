<template>
  <q-layout view="lHh Lpr lFf">
    <Sidebar />

    <q-page-container>
      <q-page class="page-shell">
        <TwinHeader
          title="Substation Digital Twin"
          :asset-id="station?.station_id || route.params.id"
          :health="health"
          :risk="risk"
          icon="hub"
        />

        <div class="twin-grid">
          <q-card flat bordered class="scada-card hero-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.scadaPanel') }}</div>
              <div class="section-title">{{ station?.station_name }}</div>
              <div class="scada-meter-grid">
                <div>
                  <span>{{ t('dashboard.voltage') }}</span>
                  <strong>{{ station?.electrical?.voltage_kv || 0 }} kV</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.current') }}</span>
                  <strong>{{ station?.electrical?.current_a || 0 }} A</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.frequency') }}</span>
                  <strong>{{ station?.electrical?.frequency_hz || 0 }} Hz</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.power') }}</span>
                  <strong>{{ station?.electrical?.active_power_kw || 0 }} kW</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.blackoutRisk') }}</div>
              <div class="text-h2 text-weight-bold text-negative">
                {{ risk }}%
              </div>
              <q-btn
                color="cyan"
                text-color="black"
                icon="account_tree"
                :label="t('dashboard.runN1')"
                class="q-mt-md"
                @click="store.runContingency(station?.station_id || route.params.id)"
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.n1Result') }}</div>
              <template v-if="store.contingency">
                <div class="text-h5 text-weight-bold">{{ store.contingency.risk }}</div>
                <div class="text-blue-grey-3 q-mt-sm">
                  {{ store.contingency.affectedCustomers }} {{ t('dashboard.customersLower') }},
                  {{ store.contingency.overloadedAssets }} {{ t('dashboard.overloadedAssetsLower') }}
                </div>
              </template>
              <div v-else class="text-blue-grey-3">
                {{ t('dashboard.selectRunN1ToSimulateAssetLoss') }}
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card wide-panel">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.transformers') }}</div>
              <q-table
                flat
                dense
                dark
                :rows="transformers"
                :columns="columns"
                row-key="id"
                hide-pagination
                :pagination="{ rowsPerPage: 6 }"
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.topology') }}</div>
              <div class="topology-mini">
                <div class="topology-bus" />
                <div
                  v-for="item in 4"
                  class="topology-feeder"
                  :key="item"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="scada-card">
            <q-card-section>
              <div class="section-kicker">{{ t('dashboard.maintenance') }}</div>
              <div class="maintenance-list">
                <div>
                  <span>{{ t('dashboard.openWorkOrders') }}</span>
                  <strong>{{ maintenance.open }}</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.nextInspection') }}</span>
                  <strong>{{ maintenance.next }}</strong>
                </div>
                <div>
                  <span>{{ t('dashboard.priority') }}</span>
                  <strong>{{ maintenance.priority }}</strong>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSensorStore } from '../stores/sensorStore'
import Sidebar from '../components/dashboard/layout/Sidebar.vue'
import TwinHeader from './TwinHeader.vue'
import { useI18n } from '../i18n'

const route = useRoute()
const store = useSensorStore()
const { t } = useI18n()

onMounted(() => {
  if(!store.stations.length){
    store.start()
  }
})

const station = computed(() =>
  store.getSubstationById(route.params.id)
)

const health = computed(() =>
  station.value ? store.getStationHealth(station.value) : 0
)

const risk = computed(() =>
  station.value ? store.getStationRisk(station.value) : 0
)

const transformers = computed(() =>
  store.transformers.filter(transformer => transformer.substation === station.value?.station_id)
)

const columns = computed(() => [
  { name:'id', label:t('dashboard.transformer'), field:'id', align:'left' },
  { name:'loadPct', label:t('dashboard.loadPercent'), field:'loadPct', align:'right' },
  { name:'healthScore', label:t('dashboard.health'), field:'healthScore', align:'right' },
  { name:'failureProbability', label:t('dashboard.failurePercent'), field:'failureProbability', align:'right' }
])

const maintenance = computed(() => ({
  open:risk.value > 70 ? 5 : risk.value > 40 ? 3 : 1,
  next:risk.value > 70 ? t('dashboard.twentyFourHLower') : risk.value > 40 ? t('dashboard.sevenDays') : t('dashboard.thirtyDays'),
  priority:risk.value > 70 ? t('dashboard.critical') : risk.value > 40 ? t('dashboard.high') : t('dashboard.normal')
}))
</script>

<style>
.scada-meter-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}

.scada-meter-grid div{
  padding:12px;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:rgba(255,255,255,.025);
}

.scada-meter-grid span{
  display:block;
  color:#8fa9b8;
  font-size:11px;
}

.scada-meter-grid strong{
  display:block;
  margin-top:4px;
}

.topology-mini{
  height:180px;
  position:relative;
  border:1px solid rgba(255,255,255,.07);
  border-radius:8px;
  background:
    linear-gradient(90deg, rgba(64,196,255,.07) 1px, transparent 1px),
    linear-gradient(0deg, rgba(64,196,255,.07) 1px, transparent 1px);
  background-size:24px 24px;
}

.topology-bus{
  position:absolute;
  left:12%;
  right:12%;
  top:44%;
  height:4px;
  border-radius:8px;
  background:#40c4ff;
  box-shadow:0 0 18px rgba(64,196,255,.5);
}

.topology-feeder{
  position:absolute;
  top:44%;
  width:3px;
  height:72px;
  border-radius:8px;
  background:#ffca28;
}

.topology-feeder:nth-child(2){ left:22%; transform:rotate(-12deg); }

.topology-feeder:nth-child(3){ left:40%; transform:rotate(8deg); }

.topology-feeder:nth-child(4){ left:58%; transform:rotate(-6deg); }

.topology-feeder:nth-child(5){ left:76%; transform:rotate(12deg); }

@media (max-width: 760px){
.scada-meter-grid{
    grid-template-columns:1fr;
  }
}
</style>
