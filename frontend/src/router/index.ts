import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'

const routes = [
  {
    path: '/',
    component:DashboardPage
  },
  {
    path: '/regions/:id',
    component:() => import('../pages/RegionTwin.vue')
  },
  {
    path: '/substations/:id',
    component:() => import('../pages/SubstationTwin.vue')
  },
  {
    path: '/transformers/:id',
    component:() => import('../pages/TransformerTwin.vue')
  },
  {
    path: '/alarms',
    component:() => import('../pages/AlarmCenterPage.vue')
  },
  {
    path: '/settings',
    component:() => import('../pages/SettingsPage.vue')
  },
  {
    path: '/forecasting',
    component:() => import('../pages/AIForecastingPage.vue')
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
