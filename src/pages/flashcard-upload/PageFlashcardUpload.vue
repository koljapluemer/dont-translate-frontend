<script setup lang="ts">
import { ref } from 'vue'
import JSZip from 'jszip'
import { Download } from 'lucide-vue-next'
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

const downloadExample = async () => {
  const zip = new JSZip()

  const examples = [
    { folder: 'banana', files: ['image.webp', 'deu.txt', 'srb.txt'] },
    { folder: 'car', files: ['image.webp', 'deu.png'] }
  ]

  for (const example of examples) {
    const folder = zip.folder(example.folder)
    if (!folder) continue

    for (const filename of example.files) {
      try {
        const response = await fetch(`/data/${example.folder}/${filename}`)
        if (response.ok) {
          const blob = await response.blob()
          folder.file(filename, blob)
        }
      } catch {
        // Skip failed files
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'flashcards-example.zip'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">
      Upload Flashcards
    </h1>

    <div class="flex gap-2 mb-6">
      <ZipUploadButton
        :loading="uploading"
        @file="handleZipUpload"
      />
      <button
        class="btn btn-outline"
        @click="downloadExample"
      >
        <Download />
        Download Example
      </button>
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
          ZIP Format
        </h2>
        <pre class="bg-base-200 p-4 rounded text-sm overflow-x-auto">flashcards.zip/
  banana/
    image.webp
    deu.txt
    srb.txt
  car/
    image.webp
    deu.png</pre>
        <ul class="list-disc list-inside mt-2 text-sm flex flex-col gap-1">
          <li>Each folder = one flashcard</li>
          <li>
            <code class="bg-base-200 px-1 rounded">image.*</code> = main image (webp/jpg/png)
          </li>
          <li>
            <code class="bg-base-200 px-1 rounded">[lang].txt</code> or <code class="bg-base-200 px-1 rounded">[lang].png</code> = translation
          </li>
          <li>Language codes: deu, eng, spa, ita, arb, etc.</li>
        </ul>
      </div>
    </div>
  </div>
</template>
