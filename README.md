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

## Difficultés

Choix sur l'écran titre avec les **flèches ← →** (mémorisé, meilleur score séparé par mode) :

| Mode | Public | Particularités |
|---|---|---|
| 🐣 Poussin | 5-7 ans | mots de 3-4 lettres du quotidien (chat, lune, papa…), chute très lente, peu de mots, 5 vies, bonus fréquents |
| 🧒 Enfant | 8-11 ans | mots simples, chute lente, 4 vies, bonus plus fréquents |
| ⭐ Normal | tous | le jeu classique, 3 vies |
| 🔥 Expert | dactylos aguerris | chute rapide, vagues denses |

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

## Vagues, manches et niveaux

Chaque vague apporte **plus de mots, plus rapides**, des mots plus longs…
et change l'ambiance du décor (jour → coucher de soleil → nuit étoilée → aube),
avec un parallax de montagnes enneigées, forêts de sapins et prairies fleuries.

Une **manche = 4 vagues** (un cycle jour/nuit complet). Finir une manche fait
gagner **un niveau** et des **crédits** (150 + 100 × niveau + bonus de combo),
puis ouvre la **boutique**.

## Power-ups

Lâchés aléatoirement quand on termine un mot (on démarre avec 1 de chaque) :

| Bonus | Touche | Effet |
|---|---|---|
| ⏪ Machine à remonter le temps | 1 (ou &) | les mots **non validés** remontent de 3 secondes |
| 🪃 Boomerang du futur | 2 (ou é) | révèle le **prochain mot** de la vague (inutilisable en fin de vague/manche, non consommé dans ce cas) |
| ❤ Vie supplémentaire | — | +1 vie immédiate (max 5), plus rare |

## Boutique

Accessible entre les manches et depuis l'écran titre (touche **B**).
Les crédits, achats et équipements sont **sauvegardés localement**.

- **Skins de tourelle** : bleu classique, or royal, néon rose, vert camo, rouge lave
- **Effets visuels** (actifs dès l'achat) : balles arc-en-ciel, explosions étoilées, traînée de comète
- **Accessoires** (un à la fois) : drapeau, antenne radar, chapeau haut-de-forme

Navigation : flèches ↑/↓, Entrée pour acheter/équiper, Échap pour sortir.

## Statistiques de frappe

- **MPM** (mots par minute, fenêtre glissante de 10 s) et **précision** affichés en jeu.
- En fin de partie : MPM moyen, MPM max, précision, meilleur combo, niveau atteint.

## Touches

| Touche | Action |
|---|---|
| A–Z | taper les mots (toutes les lettres, P et M compris) |
| 1 / 2 | power-ups (remonte-temps / boomerang) |
| B | boutique (depuis l'écran titre) |
| Entrée | commencer / rejouer |
| Échap | pause / reprendre |
| F2 | couper le son |

## Fichiers

- `index.html` — page du jeu
- `style.css` — plein écran, rendu pixelisé
- `game.js` — moteur complet (rendu pixel art procédural, parallax, audio synthé rétro, logique de jeu)
