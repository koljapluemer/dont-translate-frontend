<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Eye, Trash2 } from 'lucide-vue-next'
import { loadFlashcards, deleteFlashcard } from '@/entities/flashcard/flashcardStore'
import type { FlashCard } from '@/db/Flashcard'

interface LanguageInfo {
  displayName: string
  symbols: string[]
}

const items = ref<FlashCard[]>([])
const allLanguages = ref<Record<string, LanguageInfo>>({})
const viewModalCard = ref<FlashCard | null>(null)
const showViewModal = ref(false)
const selected = ref<Set<string>>(new Set())

// Track object URLs for cleanup
const objectUrls = ref<Map<string, string>>(new Map())

const allSelected = computed(() => {
  return items.value.length > 0 && selected.value.size === items.value.length
})

const someSelected = computed(() => {
  return selected.value.size > 0 && selected.value.size < items.value.length
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(items.value.map(i => i.id))
  }
}

const toggleSelect = (id: string) => {
  const newSet = new Set(selected.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  selected.value = newSet
}

const getOrCreateUrl = (key: string, blob: Blob): string => {
  const existing = objectUrls.value.get(key)
  if (existing) return existing

  const url = URL.createObjectURL(blob)
  objectUrls.value.set(key, url)
  return url
}

const getImageUrl = (card: FlashCard): string => {
  return getOrCreateUrl(card.id, card.image)
}

const getExpressionUrl = (card: FlashCard, idx: number, blob: Blob): string => {
  return getOrCreateUrl(`${card.id}:expr:${idx}`, blob)
}

const getLangSymbol = (code: string | undefined): string => {
  if (!code) return '?'
  const info = allLanguages.value[code]
  return info?.symbols?.[0] || code.toUpperCase()
}

const getFirstExpression = (card: FlashCard): string | Blob | undefined => {
  return card.expressions[0]
}

const isTextValue = (value: string | Blob | undefined): value is string => {
  return typeof value === 'string'
}

const handleView = (card: FlashCard) => {
  viewModalCard.value = card
  showViewModal.value = true
}

const handleDelete = async (id: string) => {
  if (!confirm('Delete this flashcard?')) return
  await deleteFlashcard(id)
  selected.value.delete(id)
  items.value = await loadFlashcards()
}

const handleDeleteSelected = async () => {
  if (selected.value.size === 0) return
  if (!confirm(`Delete ${selected.value.size} flashcard(s)?`)) return

  for (const id of selected.value) {
    await deleteFlashcard(id)
  }
  selected.value = new Set()
  items.value = await loadFlashcards()
}

const closeViewModal = () => {
  showViewModal.value = false
}

onMounted(async () => {
  items.value = await loadFlashcards()

  try {
    const response = await fetch('/languages.json')
    allLanguages.value = await response.json()
  } catch {
    console.warn('Could not load languages.json')
  }
})

onBeforeUnmount(() => {
  objectUrls.value.forEach(url => URL.revokeObjectURL(url))
  objectUrls.value.clear()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">
      Flashcards
    </h1>

    <div class="flex gap-2 mb-4">
      <router-link
        to="/upload"
        class="btn btn-primary"
      >
        Upload New
      </router-link>
      <button
        v-if="selected.size > 0"
        class="btn btn-error"
        @click="handleDeleteSelected"
      >
        <Trash2 />
        Delete {{ selected.size }}
      </button>
    </div>

    <div
      v-if="items.length === 0"
      class="text-center py-8 text-base-content/60"
    >
      No flashcards yet. Upload some to get started.
    </div>

    <table
      v-else
      class="table w-full"
    >
      <thead>
        <tr>
          <th class="w-12">
            <input
              type="checkbox"
              class="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected"
              @change="toggleSelectAll"
            >
          </th>
          <th class="w-20">
            Image
          </th>
          <th>Language</th>
          <th>Expression</th>
          <th>Collection</th>
          <th class="w-20">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="item.id"
        >
          <td>
            <input
              type="checkbox"
              class="checkbox"
              :checked="selected.has(item.id)"
              @change="toggleSelect(item.id)"
            >
          </td>
          <td>
            <img
              :src="getImageUrl(item)"
              class="w-16 h-16 object-cover rounded"
              alt="Flashcard image"
            >
          </td>
          <td>
            <span class="text-base-content/60">{{ getLangSymbol(item.language) }}</span>
          </td>
          <td>
            <span
              v-if="isTextValue(getFirstExpression(item))"
              class="truncate"
            >
              {{ getFirstExpression(item) }}
            </span>
            <img
              v-else-if="getFirstExpression(item)"
              :src="getExpressionUrl(item, 0, getFirstExpression(item) as Blob)"
              class="h-6 rounded"
              alt="Expression"
            >
          </td>
          <td>
            <span class="text-sm">{{ item.collection }}</span>
          </td>
          <td>
            <div class="flex gap-1">
              <button
                class="btn btn-sm btn-ghost"
                @click="handleView(item)"
              >
                <Eye />
              </button>
              <button
                class="btn btn-sm btn-ghost"
                @click="handleDelete(item.id)"
              >
                <Trash2 />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <dialog
      :open="showViewModal"
      class="modal"
    >
      <div class="modal-box">
        <div
          v-if="viewModalCard"
          class="flex flex-col gap-4"
        >
          <img
            :src="getImageUrl(viewModalCard)"
            class="w-full max-h-64 object-contain rounded"
            alt="Flashcard image"
          >

          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-base-content/60">
              <span class="font-semibold">Language:</span>
              <span>{{ getLangSymbol(viewModalCard.language) }}</span>
            </div>

            <div class="flex items-center gap-2 text-base-content/60">
              <span class="font-semibold">Collection:</span>
              <span>{{ viewModalCard.collection }}</span>
            </div>

            <div
              v-if="viewModalCard.credits"
              class="flex items-center gap-2 text-base-content/60"
            >
              <span class="font-semibold">Credits:</span>
              <span>{{ viewModalCard.credits }}</span>
            </div>

            <div class="mt-2">
              <span class="font-semibold text-base-content/60">Expressions:</span>
              <div class="flex flex-col gap-2 mt-2">
                <div
                  v-for="(expr, idx) in viewModalCard.expressions"
                  :key="idx"
                  class="flex items-center gap-2"
                >
                  <span class="text-base-content/40 w-6">{{ idx + 1 }}.</span>
                  <span
                    v-if="isTextValue(expr)"
                    class="text-lg"
                  >
                    {{ expr }}
                  </span>
                  <img
                    v-else
                    :src="getExpressionUrl(viewModalCard, idx, expr)"
                    class="h-12 rounded"
                    alt="Expression"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-action">
          <button
            class="btn"
            @click="closeViewModal"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>
