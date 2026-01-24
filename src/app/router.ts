import { createRouter, createWebHistory } from 'vue-router'
import PageFlashcardList from '@/pages/flashcard-list/PageFlashcardList.vue'
import PageFlashcardUpload from '@/pages/flashcard-upload/PageFlashcardUpload.vue'
import PagePractice from '@/pages/practice/PagePractice.vue'
import PageSettings from '@/pages/settings/PageSettings.vue'
import { pushNavigationHistory } from './navigation/navigationStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/practice'
    },
    {
      path: '/flashcards',
      name: 'flashcard-list',
      component: PageFlashcardList
    },
    {
      path: '/upload',
      name: 'flashcard-upload',
      component: PageFlashcardUpload
    },
    {
      path: '/practice',
      name: 'practice',
      component: PagePractice
    },
    {
      path: '/settings',
      name: 'settings',
      component: PageSettings
    }
  ]
})

router.afterEach((to) => {
  pushNavigationHistory(to.fullPath)
})

export default router
