<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Download, Loader2 } from 'lucide-vue-next'
import { fetchCollectionMetadata, fetchCollectionLanguages, importCollection } from './collectionImportHelpers'
import { showToast } from '@/app/toast/toastStore'

interface LanguageInfo {
  displayName: string
  symbols: string[]
}

interface CollectionInfo {
  id: string
  name: string
  languages: string[]
  flashcardCount?: number
}

const collections = ref<CollectionInfo[]>([])
const allLanguages = ref<Record<string, LanguageInfo>>({})
const loading = ref(true)
const importingKey = ref<string | null>(null)
const importProgress = ref({ current: 0, total: 0 })

const getImportKey = (collectionId: string, lang?: string): string => {
  return lang ? `${collectionId}:${lang}` : collectionId
}

const getLangSymbol = (code: string): string => {
  const info = allLanguages.value[code]
  return info?.symbols?.[0] || code.toUpperCase()
}

const handleImport = async (collection: CollectionInfo, lang?: string) => {
  importingKey.value = getImportKey(collection.id, lang)
  importProgress.value = { current: 0, total: 0 }

  const langLabel = lang ? allLanguages.value[lang]?.displayName || lang : 'all languages'

  try {
    const count = await importCollection(
      collection.id,
      collection.name,
      lang,
      (current, total) => {
        importProgress.value = { current, total }
      }
    )
    showToast(`Imported ${count} flashcards (${langLabel}) from "${collection.name}"`, 'success')
  } catch (err) {
    console.error('Import failed:', err)
    showToast(`Failed to import "${collection.name}"`, 'error')
  } finally {
    importingKey.value = null
  }
}

onMounted(async () => {
  try {
    const [metadata, languages] = await Promise.all([
      fetchCollectionMetadata(),
      fetch('/dont-translate-data/available_languages.json').then(r => r.json())
    ])

    allLanguages.value = languages

    const collectionInfos: CollectionInfo[] = []
    for (const [id, name] of Object.entries(metadata)) {
      const langs = await fetchCollectionLanguages(id)
      collectionInfos.push({
        id,
        name,
        languages: langs
      })
    }

    collections.value = collectionInfos
  } catch (err) {
    console.error('Failed to load collections:', err)
    showToast('Failed to load collections', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">
      Collections
    </h1>

    <div
      v-if="loading"
      class="flex justify-center py-8"
    >
      <Loader2 class="animate-spin" />
    </div>

    <div
      v-else-if="collections.length === 0"
      class="text-center py-8 text-base-content/60"
    >
      No collections available.
    </div>

    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div
        v-for="collection in collections"
        :key="collection.id"
        class="card bg-base-200"
      >
        <div class="card-body">
          <h2 class="card-title">
            {{ collection.name }}
          </h2>

          <div class="flex flex-wrap gap-1">
            <span
              v-for="lang in collection.languages"
              :key="lang"
              class="badge badge-outline"
              :title="allLanguages[lang]?.displayName || lang"
            >
              {{ getLangSymbol(lang) }}
            </span>
          </div>

          <div class="card-actions flex-wrap justify-end mt-2 gap-2">
            <button
              v-for="lang in collection.languages"
              :key="lang"
              class="btn btn-outline btn-sm"
              :disabled="importingKey !== null"
              @click="handleImport(collection, lang)"
            >
              <template v-if="importingKey === getImportKey(collection.id, lang)">
                <Loader2 class="animate-spin w-4 h-4" />
                {{ importProgress.current }}/{{ importProgress.total }}
              </template>
              <template v-else>
                <Download class="w-4 h-4" />
                {{ getLangSymbol(lang) }}
              </template>
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="importingKey !== null"
              @click="handleImport(collection)"
            >
              <template v-if="importingKey === getImportKey(collection.id)">
                <Loader2 class="animate-spin w-4 h-4" />
                {{ importProgress.current }}/{{ importProgress.total }}
              </template>
              <template v-else>
                <Download class="w-4 h-4" />
                All
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
