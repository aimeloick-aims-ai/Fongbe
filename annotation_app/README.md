# Atelier d’annotation Fongbe

Application statique pour écouter des extraits Fongbe, annoter les traductions, les syllabes, les tons et leurs temps. Le lot de démonstration contient huit exemples ; le nombre d’extraits importés n’est pas limité par l’application. Les fichiers audio de démonstration proviennent de `Professor/fongbe-speech-zenodo`, révision `47dbcd0054659842f53a4cce96b82124bad2d0e3` ; sa fiche déclare la licence CC0-1.0. La provenance est indiquée dans l’application.

## Démarrer sur l’ordinateur

À la racine du projet :

```powershell
python -m http.server 8000
```

Ouvrir ensuite `http://localhost:8000/annotation_app/`. Un serveur local est nécessaire pour charger les fichiers CSV et JSON.

## Annoter

1. Choisir un code annotateur pour retrouver son brouillon dans le même navigateur.
2. Écouter la phrase entière ou cliquer sur une syllabe. La lecture de la syllabe commence 0,15 seconde avant sa limite et s’arrête à sa fin, à vitesse 0,75×.
3. Examiner la courbe F0 en Hz et ses repères temporels. Les zones colorées reflètent les limites modifiables dans le tableau ; cliquer sur une zone lit la syllabe.
4. Saisir une traduction française de la phrase et, si utile, le sens de chaque mot. Annoter le ton lexical et le contour entendu séparément.
5. Exporter le CSV. Les brouillons restent dans le navigateur de chaque annotateur ; le site ne les rassemble pas automatiquement.

Les pistes F0 viennent des mesures Praat sauvegardées dans le projet, méthode autocorrélation 50–800 Hz à pas de 10 ms. Les frames non voisées restent sans valeur F0. La courbe est une aide visuelle, pas une annotation de vérité terrain.

## Préparer et charger un lot audio de toute taille

Le script traite toutes les lignes du CSV d’entrée. Il propose des syllabes à partir de la transcription, calcule la piste F0 et suggère des limites temporelles de faible confiance. Ces limites sont des propositions automatiques à vérifier en écoutant.

Créer un CSV UTF-8 avec une ligne par extrait :

```csv
utterance_id,text_original,audio_path,source_split,speaker_id
extrait_009,"Transcription Fongbe","audios/extrait_009.wav",local,locuteur_1
```

Depuis la racine du projet, lancer :

```powershell
uv run --locked --extra acoustics python scripts/prepare_web_annotation_batch.py --input chemin/vers/mon_lot.csv --output-dir chemin/vers/lot_prepare
```

Cette commande se lance depuis la racine du projet de recherche local, où se trouve le script. Le dépôt GitHub Pages contient l’application ; une fois le lot préparé, les fichiers produits se chargent sur la page.

Sur le site, charger `lot_prepare/examples.csv`, sélectionner tous les audios du lot (leurs noms, sans extension, doivent correspondre à `utterance_id`), puis charger `lot_prepare/f0_contours.json`. Les enregistrements sélectionnés dans le navigateur ne sont pas envoyés au site. Le fichier `batch_report.json` donne le nombre d’extraits, de syllabes proposées et les échecs éventuels.

La segmentation des unités écrites utilise les noyaux vocaliques de la transcription comme proposition ; elle ne transcrit pas automatiquement un audio brut. Il faut donc fournir le texte Fongbe dans le CSV. Les contours F0 ne remplacent pas l’écoute ni la vérification des tons.

## Ajouter des exemples

Importer un CSV UTF-8 qui contient au minimum `utterance_id` et `text_original`. Les syllabes peuvent être fournies sur plusieurs lignes avec les colonnes `syllable_text`, `start_char`, `end_char`, `start_s` et `end_s`. Le choix « Charger plusieurs audios » accepte plusieurs fichiers à la fois et associe un fichier dont le nom correspond à l’identifiant. Pour mettre de nouveaux exemples et audios à disposition de tous, ajouter leurs fichiers au dépôt puis publier le changement.

## Reproduire les fichiers du lot

À la racine du projet :

```powershell
uv run --locked python scripts/build_annotation_app.py
```

Le script reprend les exemples du lot de démonstration, copie leurs WAV et exporte les courbes F0 issues de `raw_f0_all_praat.parquet`. Pour préparer un autre lot, utiliser `scripts/prepare_web_annotation_batch.py` ci-dessus.
