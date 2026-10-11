# Atelier d annotation Fongbe

La page contient un lot fixe de 8 extraits audio locaux, leurs transcriptions, les syllabes proposees et les courbes F0. Elle ne depend pas de Hugging Face pour afficher ou ecouter les exemples.

Chaque navigateur enregistre le travail dans son stockage local, associe au code annotateur. Le lien **Telecharger mon CSV** produit le fichier personnel contenant les traductions, les tons et les limites corrigees. Telechargez ce CSV pour le transmettre a l equipe ; GitHub Pages ne peut pas agreger les contributions sur un serveur.

Les limites de lecture suivent exactement les temps affiches pour chaque syllabe. La lecture est ralentie a 0,75x sans ajouter de temps avant ou apres la syllabe. Les choix de ton affiches sont H, L, LH et ? incertain ? ; laissez le champ vide si vous ne souhaitez pas proposer de reponse.

Pour lancer une copie locale depuis la racine du projet :

```powershell
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000/annotation_app/`.

