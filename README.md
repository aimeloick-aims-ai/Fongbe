# Fongbe tonal information research

Study how acoustic and self-supervised representations encode tone, whether tone resolves lexical ambiguity, and whether explicit tonal information improves Fongbe-to-French translation.

## Team environment

Use **uv** as the default. It creates a local `.venv` and resolves dependencies into a shared `uv.lock`. Commit `pyproject.toml`, `.python-version`, and `uv.lock`; never commit `.venv`. Python 3.12 is the initial project target; your global Python installation does not need to change.

From the project root, after installing uv:

```powershell
uv sync --locked
uv run python load_dataset.py
```

The inspection script uses the pinned revision in `configs/dataset.yaml` and preserves transcription diacritics. It does not yet align speech, extract features, or validate tone labels. Dataset-builder caches are kept in `.cache/datasets`; Hub downloads may also use the Hugging Face cache.

Step 2 is implemented. Recreate the frozen source and utterance table with:

```powershell
uv run --locked python scripts/prepare_dataset.py
```

This resolves/verifies the pinned Hub revision, downloads missing shards, preserves source files and WAV bytes under `data/raw/<revision>/`, and writes `data/raw/source_manifest.json`, its CSV file inventory, and `data/interim/utterances.parquet`. Existing raw files with different bytes cause an error. An existing cached snapshot can be reused with `--snapshot PATH`; its directory name must equal the revision. For offline re-export, provide `--offline --revision COMMIT --snapshot PATH`; online access metadata and published hashes cannot be verified in offline mode.

Inspect the frozen files without another Hub download:

```powershell
uv run --locked python load_dataset.py --snapshot data/raw/47dbcd0054659842f53a4cce96b82124bad2d0e3/source
```

See [the completed dataset inspection](docs/DATASET_INSPECTION.md). Large source/audio artifacts remain ignored by Git; a small portable provenance manifest is saved in `reports/tables/source_manifest.json`.

The automated quality audit and linguistic-review preparation are also implemented:

```powershell
uv run --locked python scripts/audit_dataset.py
uv run --locked python scripts/prepare_annotation_pilot.py
uv run --locked python scripts/compare_pilot_annotations.py
```

Read [the audit report](docs/DATA_QUALITY_AUDIT.md) and [draft annotation guide](docs/ANNOTATION_GUIDE.md). Exclusions/quarantine are in `data/interim/exclusions.csv`; reviewer sheets are in `data/interim/annotation_pilot/`. Linguistic labels remain pending until qualified reviewers annotate and adjudicate the pilot. Existing reviewer sheets and listening forms are preserved on regeneration; archive them explicitly before creating a different pilot.

Optional acoustic and notebook dependencies:

```powershell
uv sync --locked --extra acoustics --extra notebooks
uv run jupyter lab
```

Add shared dependencies with `uv add PACKAGE` and include the changed lockfile in the same pull request. Install PyTorch and speech-model dependencies only after choosing the team's CPU/CUDA platform; document the versions and installation source. FFmpeg and alignment tools may also need separate system installations.

| Option | Role in this project |
| --- | --- |
| uv | Recommended: dependency locking and environment management across teammates. |
| venv alone | Creates an isolated environment, but needs a separate dependency/version workflow. uv already manages a virtual environment. |
| Docker + uv | Useful later for a fixed Linux, FFmpeg, alignment, or CUDA environment on shared compute. Adds container and GPU setup work. |

References: [uv projects](https://docs.astral.sh/uv/guides/projects/), [locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/), [Docker Windows GPU requirements](https://docs.docker.com/desktop/features/gpu/).

## Layout

```text
configs/                  Shared dataset and experiment configuration
data/
  raw/                    Original audio/transcripts; immutable, ignored by Git
  interim/                Alignments and intermediate annotation tables
  processed/              Validated syllables, features, and split manifests
  external/               FFSTC/FFSTC2 and other external resources
docs/                     Protocol, data contracts, and collaboration guide
src/fongbe_tones/
  data/                   Loading, validation, Unicode handling, speaker splits
  alignment/              Word/syllable alignment and quality checks
  acoustics/              F0, duration, intensity, and voicing features
  representations/        SSL embeddings and layer extraction
  probing/                Tone classifiers and layer probes
  lexical/                Tone-sensitive lexical contrasts
  translation/            Baseline and tone-aware translation experiments
  evaluation/             Shared metrics and error analysis
scripts/                  Command-line pipeline entry points
notebooks/                Exploration; move reusable logic into src
tests/                    Future validation of data and pipeline behavior
models/                   Local checkpoints; ignored by Git
outputs/                  Run artifacts; ignored by Git
reports/figures/           Small reviewed figures for the paper
reports/tables/            Small reviewed result tables
load_dataset.py           Existing transcription/diacritic inspection script
```

The pipeline folders are scaffolding, not implemented research stages. See [collaboration](docs/COLLABORATION.md), [data contracts](docs/DATA_CONTRACTS.md), and [research protocol](docs/RESEARCH_PROTOCOL.md).

## Public annotation app

A static, CSV-based annotation interface is published from [`annotation_app/`](annotation_app/). The public page contains a fixed batch of eight audio examples, their proposed syllable intervals, and F0 curves. The audio and analysis files are bundled with the page, so playback does not depend on Hugging Face. Each annotator's work stays in that browser until they download their personal CSV; GitHub Pages does not collect submissions centrally.

The page offers H, L, LH, or an uncertain response for tone review. Syllable playback uses the displayed start and end times directly, with no added time shift. The batch-preparation script below remains available for preparing new local batches; publishing another public batch requires replacing the app data/audio files and redeploying.

To prepare a batch with a transcription and audio path for each row, create a CSV with `utterance_id,text_original,audio_path` and run:

```powershell
uv run --locked --extra acoustics python scripts/prepare_web_annotation_batch.py --input path/to/input.csv --output-dir path/to/prepared_batch
```

The output folder contains `examples.csv`, `syllables.csv`, `f0_contours.json`, and `batch_report.json`. The proposed syllable times are suggestions that need listening and correction. Public demo audio is from a dataset whose card declares CC0-1.0; additional local audio is not published automatically.

For local use:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/annotation_app/`. GitHub Pages deployment is configured in `.github/workflows/deploy-annotation-app.yml`.


