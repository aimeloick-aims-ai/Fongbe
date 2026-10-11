# Fongbe Annotation App

A static CSV-based tool for collaborative Fongbe tone and French translation annotation.

- Starts with eight utterances and forty syllable proposals.
- Add larger batches by importing CSV.
- Annotate a sentence translation, word-by-word French glosses, syllable boundaries, lexical tones, and heard contours.
- Saves each annotator's draft in their browser and exports independent CSV files.
- Audio remains local to each annotator's computer; this repository contains no recordings.

To run locally, use `python -m http.server 8000` and open `http://localhost:8000/annotation_app/`.

The GitHub Pages workflow publishes the app from `annotation_app/`. Enable Pages with **GitHub Actions** in the repository settings.
