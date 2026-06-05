import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'

const routes = [
  {
    path: '/',
    component: DashboardPage
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})