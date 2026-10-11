# Atelier d’annotation Fongbe

Application statique pour écouter des extraits Fongbe, annoter les traductions, les syllabes, les tons et leurs temps. Les huit exemples sont accompagnés de leur audio et de la courbe F0 calculée avec Praat. Les fichiers audio de ce lot proviennent de `Professor/fongbe-speech-zenodo`, révision `47dbcd0054659842f53a4cce96b82124bad2d0e3` ; sa fiche déclare la licence CC0-1.0. La provenance est indiquée dans l’application.

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

## Ajouter des exemples

Importer un CSV UTF-8 qui contient au minimum `utterance_id`, `text_original` et `audio_url`. Les syllabes peuvent être fournies sur plusieurs lignes avec les colonnes `syllable_text`, `start_char`, `end_char`, `start_s` et `end_s`. Pour mettre de nouveaux exemples à disposition de tous, ajouter leurs lignes dans `data/examples.csv` et `data/syllables.csv`, placer leurs WAV dans `audio/`, puis publier le changement.

## Reproduire les fichiers du lot

À la racine du projet :

```powershell
uv run --locked python scripts/build_annotation_app.py
```

Le script reprend les limites validées présentes dans le modèle d’alignement, copie les huit WAV correspondants et exporte les courbes F0 issues de `raw_f0_all_praat.parquet`.
