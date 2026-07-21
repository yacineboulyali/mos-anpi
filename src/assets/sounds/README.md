# Effets sonores

Déposez ici vos fichiers audio (`.mp3`, `.wav` ou `.ogg`). Le nom du fichier (sans extension) doit correspondre à l'une des clés utilisées par `src/lib/sounds.js` :

| Fichier attendu      | Déclenché quand...                                      |
|-----------------------|-----------------------------------------------------------|
| `click.mp3`           | L'utilisateur sélectionne une réponse ou navigue (précédent/suivant, points de question) |
| `correct.mp3`         | La réponse révélée est correcte                           |
| `incorrect.mp3`       | La réponse révélée est incorrecte                         |
| `submit.mp3`          | L'épreuve est soumise                                     |
| `success.mp3`         | La page de résultats s'affiche avec un score réussi        |
| `fail.mp3`            | La page de résultats s'affiche avec un score en échec      |

Tant qu'un fichier n'est pas présent, le son correspondant est simplement ignoré (aucune erreur, aucun blocage de l'application).
