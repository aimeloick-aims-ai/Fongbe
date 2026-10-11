# Atelier d annotation Fongbe

Application statique GitHub Pages. Au demarrage, elle charge les extraits audio et transcriptions par lots de 100 depuis le jeu public `Professor/fongbe-speech-zenodo` sur Hugging Face. Les extraits suivants sont charges au fur et a mesure de la navigation. Les fichiers audio sont lus depuis Hugging Face ; les visiteurs n ont pas a selectionner ni televerser les audios.

## Contributions individuelles

Chaque navigateur enregistre automatiquement le travail dans son stockage local, associe au code annotateur. Le lien **Telecharger mon CSV** suit les modifications et produit un fichier CSV personnel avec les phrases, mots, traductions, syllabes et valeurs saisies. Chaque annotateur remet son fichier a l equipe a la fin. Une page GitHub statique ne peut pas fusionner les CSV ni enregistrer les contributions sur le serveur ; il faut un backend si l equipe veut une feuille centrale mise a jour en temps reel.

Les liens audio du visualiseur Hugging Face sont temporaires. En cas d expiration, la page demande un nouveau lien. Le CSV garde la provenance et le numero de ligne, pas le lien audio temporaire. Les audio remote sont dependants d Internet. Les courbes F0 locales ne couvrent que le lot de demonstration; les nouveaux extraits du corpus n ont pas encore de courbes ni de limites syllabiques pre-remplies.

Pour lancer une copie locale, depuis la racine du projet :

```powershell
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000/annotation_app/`.

