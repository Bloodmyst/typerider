# TypeRider — Tape ou coule !

Jeu de dactylographie en **pixel art coloré** : des mots tombent du ciel, tapez-les
avant qu'ils ne touchent le sol. Chaque lettre juste déclenche un tir de la tourelle
qui dégomme la lettre. Une faute ? Le mot continue de tomber et on le reprend au début.

## Lancer le jeu (PC & Mac)

Le jeu est 100 % HTML5, sans dépendance ni installation :

- **Le plus simple** : double-cliquez sur `index.html` (s'ouvre dans le navigateur).
- **Ou via un petit serveur local** (recommandé pour la sauvegarde du meilleur score) :

  ```
  python -m http.server 8123
  ```

  puis ouvrez <http://localhost:8123>.

## Règles

- Les **mots tombent du ciel** ; tapez la première lettre d'un mot pour le cibler
  (liseré jaune), puis enchaînez ses lettres.
- **Chaque lettre validée** → un tir détruit la lettre.
- **Une erreur** → le mot continue de tomber et **on recommence au début du mot**,
  le combo est perdu.
- Un mot qui **touche le sol** coûte une vie (3 vies). Partie terminée à 0 vie.

## Score & combos

- 10 points par lettre, bonus de fin de mot proportionnel à sa longueur.
- **Combo** : chaque mot terminé sans faute augmente le combo.
  Le **multiplicateur** grimpe avec le combo : ×2 (3 mots), ×3 (6), ×4 (10),
  ×5 (15), ×6 (25), ×8 (40). Une faute ou un mot au sol remet le combo à zéro.
- Le meilleur score est sauvegardé localement.

## Vagues

Chaque vague apporte **plus de mots, plus rapides**, des mots plus longs…
et change l'ambiance du décor (jour → coucher de soleil → nuit étoilée → aube),
avec un parallax de montagnes enneigées, forêts de sapins et prairies fleuries
qui défile de gauche à droite.

## Touches

| Touche | Action |
|---|---|
| A–Z | taper les mots (toutes les lettres, P et M compris) |
| Entrée | commencer / rejouer |
| Échap | pause / reprendre |
| F2 | couper le son |

## Fichiers

- `index.html` — page du jeu
- `style.css` — plein écran, rendu pixelisé
- `game.js` — moteur complet (rendu pixel art procédural, parallax, audio synthé rétro, logique de jeu)
