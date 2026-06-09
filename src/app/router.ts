import { createRouter, createWebHistory } from 'vue-router'
import PagePractice from '@/pages/practice/PagePractice.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/practice'
    },
    {
      path: '/practice',
      name: 'practice',
      component: PagePractice
    }
  ]
})

export default router
