You see here a hollowed-out, older flashcard project.
Let's use it to do something else:

We want to practice language flashcards without translating to our native language.
For this, we need to adapt our data a little:

- [flashcards](src/db/Flashcard.ts) need to change a bit
    - each flashcard must have an image field (e.g. photo of an apple)
    - each flashcard has a dict with iso-3 language codes as keys and either string or image data as value, showing either text like "der Apfel" or a scanned image of an apple
- we get rid of tags and blockedBy
- a flashcard can have many [progress objects](src/db/LearningProgress.ts), two per language codes are possible: one for image to word, and one from word to image


## Pages we need

### Upload Page

- new page required; build [here](src/pages/flashcard-upload)
- should allow the user to upload .zip which internally must be structured like [this here in public/](public/data):
    - one folder per flashcard
    - must contain one valid image (format png, jpg, jpeg, webp)
    - arbitrary many files named after language codes in this folder, either also images or .txt files
- we have this legacy, semi appropriate [component](src/pages/flashcard-upload/JsonlUploadButton.vue) that may be adaptable to our use case.
- explain in what format the flashcards have to be

### Flashcard List

- adapt [this](src/pages/flashcard-list)
- should allow displaying flashcards in a modal, as well as deleting them
- no editing or "going to" the flashcard, that makes no sense
- remove tag filtering and other obsolete stuff


### Settings

- allows the user to set which language they want to learn, based on a dropdown with [this data](/home/brokkoli/GITHUB/dont-translate/glosses4learning-language-reference/glosses4learning-language-reference/languages.json). Filter according to which language codes we actually have in our local DB. Persist the user selection in *local storage*.

### Practice

- [already exists](src/pages/practice), and does well introducing new cards and showing existing cards according to [fsrs](doc/FSRS_README.md). It just has to be adapted to our paradigm.
- user is just practicing one language at a time, so ignore any progress objects not relating to that language
- keep the logic of "sometimes prefer new/unseen cards"
- any given flashcard per language is actually two cards: from image to word, and from word to image. Word-to-image may not be shown unless image-to-word for this flashcard+language combination is seen before, but currently not due to fsrs. Adapt [the store](src/entities/flashcard/flashcardStore.ts) or the practice page as appropriate.
- if practice page is loaded and we have no flashcards, seed the store with the flashcard data existing in [the public data](public/data)


## General

**REMOVE ALL OBSOLETE FEATURES. NOT COMMENTING OUT, NOT LEAVING FOR LEGACY. CLEAN REMOVE**.
Stick to `agents.md` and `doc/how-to-design.md` always!!!

- adapt the app header, and routes 
- run lint:fix and build, and fix issues cleanly (no disabling of lint!!)
- adapt metadata, such as the README, package.json and pwa stuff