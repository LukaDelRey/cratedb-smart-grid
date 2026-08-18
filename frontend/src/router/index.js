import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import RegionTwin from '../pages/RegionTwin.vue'
import SubstationTwin from '../pages/SubstationTwin.vue'
import TransformerTwin from '../pages/TransformerTwin.vue'

const routes = [
  {
    path: '/',
    component: DashboardPage
  },
  {
    path: '/regions/:id',
    component: RegionTwin
  },
  {
    path: '/substations/:id',
    component: SubstationTwin
  },
  {
    path: '/transformers/:id',
    component: TransformerTwin
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
