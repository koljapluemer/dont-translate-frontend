<script setup lang="ts">
import { ref } from 'vue'
import { createFlashcard } from '@/entities/flashcard/flashcardStore'
import { showToast } from '@/app/toast/toastStore'
import ZipUploadButton from './ZipUploadButton.vue'
import { parseFlashcardsFromJsonl } from './zipImportHelpers'

const uploading = ref(false)
const progress = ref(0)
const total = ref(0)
const collectionName = ref('')

const handleZipUpload = async (file: File) => {
  if (!collectionName.value.trim()) {
    showToast('Please enter a collection name', 'error')
    return
  }

  uploading.value = true
  progress.value = 0
  total.value = 0

  try {
    const parsed = await parseFlashcardsFromJsonl(file)
    total.value = parsed.length

    if (parsed.length === 0) {
      showToast('No valid flashcards found in ZIP', 'error')
      return
    }

    for (const item of parsed) {
      await createFlashcard(
        item.image,
        item.language,
        item.expressions,
        collectionName.value.trim(),
        item.credits
      )
      progress.value++
    }

    showToast(`Imported ${parsed.length} flashcards`, 'success')
  } catch (err) {
    console.error('Upload error:', err)
    const message = err instanceof Error ? err.message : 'Failed to import flashcards'
    showToast(message, 'error')
  } finally {
    uploading.value = false
    progress.value = 0
    total.value = 0
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">
      Upload Flashcards
    </h1>

    <div class="form-control w-full max-w-xs mb-4">
      <label class="label">
        <span class="label-text">Collection Name</span>
      </label>
      <input
        v-model="collectionName"
        type="text"
        placeholder="e.g., Arabic Basics"
        class="input input-bordered w-full"
      >
    </div>

    <div class="flex gap-2 mb-6">
      <ZipUploadButton
        :loading="uploading"
        :disabled="!collectionName.trim()"
        @file="handleZipUpload"
      />
    </div>

    <div
      v-if="uploading && total > 0"
      class="mb-6"
    >
      <progress
        class="progress progress-primary w-full"
        :value="progress"
        :max="total"
      />
      <p class="text-sm mt-1">
        {{ progress }} / {{ total }} flashcards imported
      </p>
    </div>

    <div class="card shadow">
      <div class="card-body">
        <h2 class="card-title">
          ZIP Format (JSONL)
        </h2>
        <pre class="bg-base-200 p-4 rounded text-sm overflow-x-auto">flashcards.zip/
  flashcards.jsonl
  1f.jpg
  1b.jpg
  2f.jpg</pre>

        <h3 class="font-semibold mt-4">
          flashcards.jsonl
        </h3>
        <pre class="bg-base-200 p-4 rounded text-sm overflow-x-auto">{"language": "eng", "image": "2f.jpg", "expressions": ["She sees", "She is seeing"]}
{"language": "deu", "image": "2f.jpg", "expressions": ["Sie sieht"]}
{"language": "deu", "image": "1f.jpg", "expressions": ["Ich sehe"], "credits": "by me"}</pre>

        <ul class="list-disc list-inside mt-4 text-sm flex flex-col gap-1">
          <li>Each line = one flashcard (JSON)</li>
          <li>
            <code class="bg-base-200 px-1 rounded">image</code> = filename of the main image
          </li>
          <li>
            <code class="bg-base-200 px-1 rounded">expressions</code> = array of text strings or image filenames
          </li>
          <li>
            <code class="bg-base-200 px-1 rounded">language</code> = 3-letter ISO code (deu, eng, apc, etc.)
          </li>
          <li>
            <code class="bg-base-200 px-1 rounded">credits</code> = optional attribution
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
