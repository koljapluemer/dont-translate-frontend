<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { Settings, Play, Layers, Upload, FolderDown } from 'lucide-vue-next'
import ToastContainer from './toast/ToastContainer.vue'
</script>

<template>
  <div class="flex flex-col justify-between items-center w-full h-full overflow-x-hidden">
    <nav class="navbar bg-base-200">
      <div class="flex-1">
        <div class="flex gap-1 overflow-x-auto">
          <RouterLink
            to="/practice"
            class="btn btn-ghost"
          >
            <Play />
            <span class="hidden sm:inline">Practice</span>
          </RouterLink>
          <RouterLink
            to="/flashcards"
            class="btn btn-ghost"
          >
            <Layers />
            <span class="hidden sm:inline">Flashcards</span>
          </RouterLink>
          <RouterLink
            to="/upload"
            class="btn btn-ghost"
          >
            <Upload />
            <span class="hidden sm:inline">Upload</span>
          </RouterLink>
          <RouterLink
            to="/collections"
            class="btn btn-ghost"
          >
            <FolderDown />
            <span class="hidden sm:inline">Collections</span>
          </RouterLink>
        </div>
      </div>
      <div class="flex-none">
        <RouterLink
          to="/settings"
          class="btn btn-ghost"
        >
          <Settings />
          <span class="hidden sm:inline">Settings</span>
        </RouterLink>
      </div>
    </nav>
    <main class="flex-1 flex flex-col justify-center w-full max-w-4xl mx-auto px-4">
      <RouterView />
    </main>
    <ToastContainer />
  </div>
</template>


<style>
@import "tailwindcss";
@plugin "daisyui";
</style>
