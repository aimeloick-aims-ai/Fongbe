# Atelier d’annotation Fongbe

Application web statique : aucun compte, serveur, API ou base de données n’est nécessaire. Elle lit un lot d’exemples CSV, garde les brouillons de chaque annotateur dans son propre navigateur et exporte les réponses en CSV.

## Démarrer sur l’ordinateur

À la racine du projet :

```powershell
python -m http.server 8000
```

Ouvrir ensuite `http://localhost:8000/annotation_app/`. Un petit serveur local est nécessaire pour lire les CSV ; ouvrir directement `index.html` comme fichier peut bloquer leur chargement.

## Flux d’équipe

1. Chaque annotateur ouvre le même site et saisit un code stable (par exemple `annotateur_A`).
2. Il traduit chaque phrase et chaque mot séparément, puis annote facultativement les syllabes, leurs tons et leurs limites.
3. Le navigateur sauvegarde son travail localement. Il télécharge son CSV à la fin.
4. Le responsable récupère les CSV indépendants et les fusionne après examen. Le site statique ne partage pas automatiquement les brouillons entre les visiteurs.

Pour écouter un extrait, sélectionnez son fichier audio local avec le bouton sous le lecteur. L’audio sélectionné ne quitte pas votre ordinateur et il faut le recharger après avoir changé d’extrait ou actualisé la page. Pour reprendre un travail, garder le même navigateur et le même code, ou importer le CSV précédemment téléchargé. Ne mettez pas le CSV d’un annotateur à la place de celui d’un autre.

## Ajouter des exemples

Dans le menu « Charger un CSV d’exemples », importer un fichier UTF-8 ayant ces colonnes :

```csv
utterance_id,text_original,audio_url,duration_s,source_split,source_url
exemple_009,"Transcription Fongbe","audio/exemple_009.wav",2.4,train,"https://…"
```

Plusieurs lignes ayant le même `utterance_id` peuvent définir plusieurs syllabes avec `syllable_text,start_char,end_char,start_s,end_s`. Les exemples ajoutés par import sont chargés dans le navigateur courant ; pour les rendre disponibles à toute l’équipe, le responsable ajoute leurs lignes au fichier `data/examples.csv` et, si nécessaire, `data/syllables.csv`, puis publie le changement.

Les traductions se font à deux niveaux : une ligne `phrase` pour la traduction naturelle de toute la phrase, puis une ligne `mot` par mot avec son sens français. Les lignes `syllabe` conservent les frontières, le ton lexical annoté et le contour entendu. Une syllabe peut rester `UNKNOWN` si l’écoute ne permet pas de décider.

## Mise en ligne

Publier le dépôt comme dépôt GitHub public, puis activer GitHub Pages avec la source **GitHub Actions**. Le workflow `../.github/workflows/deploy-annotation-app.yml` publie uniquement ce dossier `annotation_app/`. Les enregistrements restent absents de la publication tant que leur diffusion publique n’a pas été approuvée. Pour une écoute collective sur le site, fournir ultérieurement des URL audio accessibles avec les droits nécessaires.

Les premières pistes proviennent de `Professor/fongbe-speech-zenodo`, révision `47dbcd0054659842f53a4cce96b82124bad2d0e3`. La fiche source déclare CC0-1.0. Cette déclaration du dépositaire est attribuée à la source et n’est pas une vérification juridique indépendante. Le manifeste du site conserve le lien vers la fiche de données.
