# Atelier d annotation Fongbe

La page contient un lot fixe de 8 extraits audio locaux, leurs transcriptions, les syllabes proposees et les courbes F0. Les chemins audio sont construits a partir du dossier reel de la page; aucune requete a Hugging Face n est necessaire pour ecouter les exemples.

Chaque navigateur enregistre le travail dans son stockage local, associe au code annotateur. Le lien **Telecharger mon CSV** produit le fichier personnel avec les traductions, les tons et les limites corrigees. GitHub Pages ne collecte pas les contributions sur un serveur.

La litterature distingue les tons lexicaux de base H/L et les realisations phonetiques contextuelles. Lefebvre et Brousseau decrivent notamment LH, HL et M comme realisations phonetiques en Fongbe, avec des variations selon les parlers : [A Grammar of Fongbe (2002)](https://doi.org/10.1515/9783110880182), section 2.3. Le formulaire garde donc les choix H, L, M, LH, HL, incertain et autre; ? autre ? ouvre un champ pour preciser la valeur observee. Ces choix aident a decrire l audio, sans transformer automatiquement une realisation entendue en ton lexical.

Les limites de lecture suivent exactement les temps affiches pour chaque syllabe. La lecture est ralentie a 0,75x sans ajouter de temps avant ou apres la syllabe.

Pour lancer une copie locale depuis la racine du projet :

```powershell
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000/annotation_app/`.

