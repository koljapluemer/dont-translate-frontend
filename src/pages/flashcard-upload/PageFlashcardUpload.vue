<script setup lang="ts">
import { ref } from 'vue'
import { createFlashcard } from '@/entities/flashcard/flashcardStore'
import { showToast } from '@/app/toast/toastStore'
import ZipUploadButton from './ZipUploadButton.vue'
import { parseFlashcardsFromZip } from './zipImportHelpers'

const uploading = ref(false)
const progress = ref(0)
const total = ref(0)

const handleZipUpload = async (file: File) => {
  uploading.value = true
  progress.value = 0
  total.value = 0

  try {
    const parsed = await parseFlashcardsFromZip(file)
    total.value = parsed.length

    if (parsed.length === 0) {
      showToast('No valid flashcards found in ZIP', 'error')
      return
    }

    for (const item of parsed) {
      await createFlashcard(item.image, item.languages)
      progress.value++
    }

    showToast(`Imported ${parsed.length} flashcards`, 'success')
  } catch (err) {
    console.error('Upload error:', err)
    showToast('Failed to import flashcards', 'error')
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

    <div class="mb-6">
      <ZipUploadButton
        :loading="uploading"
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

    <div class="card bg-base-200 p-4">
      <h2 class="font-bold mb-2">
        ZIP Format Instructions
      </h2>
      <p class="mb-2">
        Create a ZIP file with this structure:
      </p>
      <pre class="bg-base-300 p-3 rounded text-sm overflow-x-auto">
flashcards.zip/
  apple/
    image.webp     (main image)
    deu.txt        (German word)
    eng.txt        (English word)
  banana/
    image.webp
    deu.txt
    spa.txt        (Spanish word)
  ...</pre>
      <ul class="list-disc list-inside mt-3 text-sm space-y-1">
        <li>Each folder = one flashcard</li>
        <li>
          <code class="bg-base-300 px-1 rounded">image.webp</code> (or .jpg/.png) = main image
        </li>
        <li>
          <code class="bg-base-300 px-1 rounded">[lang].txt</code> = word in that language (ISO 639-3 code)
        </li>
        <li>Language codes: deu (German), eng (English), spa (Spanish), etc.</li>
      </ul>
    </div>
  </div>
</template>
