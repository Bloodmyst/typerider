# TypeRider — Tape ou coule !

Jeu de dactylographie en **pixel art coloré** : des mots tombent du ciel, tapez-les
avant qu'ils ne touchent le sol. Chaque lettre juste déclenche un tir de votre
véhicule, qui dégomme la lettre. Une faute ? Le mot continue de tomber et on le
reprend au début.

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
et change le moment de la journée (jour → coucher de soleil → nuit étoilée → aube).
Le soleil (ou la lune) **traverse le ciel** pendant la vague.

### Un décor par niveau

À chaque niveau, en même temps que le véhicule évolue, le décor change
(puis le cycle recommence après le volcan) :

| Décor | Détails |
|---|---|
| Montagnes | sommets enneigés, forêts de sapins, prairies fleuries |
| Forêt profonde | lisière dense, grands arbres, rayons de soleil à travers la canopée |
| Canyon | plateaux rocheux striés, dunes, saguaros fleuris |
| Bord de mer | mer scintillante, voiliers, palmiers, mouettes, coquillages |
| Ville néon | gratte-ciel aux fenêtres allumées, enseignes néon, lampadaires, route |
| Volcan | cratères fumants, coulées de lave, arbres morts, braises, fissures rougeoyantes |

### Météo dynamique

Chaque vague tire une météo adaptée au décor, annoncée au début de la vague :
pluie (avec éclaboussures au sol), orage (éclairs et tonnerre), neige (qui tient
au sol), brume, tempête de sable, pluie de cendres. Un **arc-en-ciel** apparaît
quand la pluie s'arrête.

Une **manche = 4 vagues** (un cycle jour/nuit complet). Finir une manche fait
gagner **un niveau** et des **crédits** (150 + 100 × niveau + bonus de combo),
puis ouvre la **boutique**.

## Véhicules

On commence chaque partie **à pied**, et le véhicule évolue à chaque niveau
(toutes les 2 vagues en modes Poussin et Enfant, à chaque manche sinon),
avec une petite scène d'évolution. Le décor défile plus vite avec les véhicules rapides.

| Niveau | Véhicule | Arme |
|---|---|---|
| 1 | À pied | lance-pierre |
| 2 | Trottinette | pistolet à eau |
| 3 | Vélo | lance-balles |
| 4 | Voiture | canon à confettis |
| 5 | Moto | blaster laser |
| 6 | Buggy | double blaster |
| 7 | Jeep 4×4 | mini-roquettes |
| 8 | Blindé | canon plasma |
| 9 | Char futuriste | canon lourd |

Le **garage** (touche **G**) garde la collection des véhicules déjà atteints.

## Power-ups

Lâchés aléatoirement quand on termine un mot (on démarre avec 1 de chaque) :

| Bonus | Touche | Effet |
|---|---|---|
| ⏪ Machine à remonter le temps | 1 (ou &) | les mots **non validés** remontent de 3 secondes |
| 🪃 Boomerang du futur | 2 (ou é) | révèle le **prochain mot** de la vague (inutilisable en fin de vague/manche, non consommé dans ce cas) |
| ❤ Vie supplémentaire | — | +1 vie immédiate (max 5), plus rare |

## Boutique

Accessible entre les manches et depuis l'écran titre (touche **B**), avec un
aperçu animé du véhicule. Les crédits, achats et équipements sont **sauvegardés localement**.

| Onglet | Contenu |
|---|---|
| Couleurs | bleu classique, or royal, néon rose, vert camo, rouge lave (appliquées à tous les véhicules) |
| Accessoires (un à la fois) | drapeau, antenne radar, lunettes de soleil, chapeau haut-de-forme, couronne |
| Effets (bibliothèque) | à combiner librement, chacun s'active ou se désactive : balles arc-en-ciel, traînée de comète, explosions étoilées, confettis de victoire, aura dorée, traînée néon, étincelles, traces arc-en-ciel |
| Garage | les 9 véhicules, verrouillés tant qu'ils n'ont pas été atteints |

Navigation : ←/→ pour changer d'onglet, ↑/↓ pour choisir, Entrée pour
acheter / équiper / activer, Échap pour sortir.

## Mots spéciaux

À partir de la vague 2, certains mots ont un cadre et une icône (un peu plus fréquents en modes enfants) :

| Mot | Effet quand on le termine |
|---|---|
| ⭐ Doré | bonus de crédits (5 par lettre) |
| ❄ Gelé | tous les mots tombent 5 fois moins vite pendant 4 secondes |
| 💣 Bombe | fait exploser les mots voisins, qui rapportent des points |

## Clavier à l'écran

Un clavier en bas à gauche **allume la prochaine touche à taper** et indique
le doigt à utiliser (une couleur par doigt, repères sur F et J). Chaque frappe
éclaire la touche en vert (juste) ou en rouge (erreur).
Affiché par défaut en modes Poussin et Enfant ; **F4** l'affiche ou le masque,
**F3** passe d'AZERTY à QWERTY.

## Statistiques de frappe

- **MPM** (mots par minute, fenêtre glissante de 10 s) et **précision** affichés en jeu.
- En fin de partie : MPM moyen, MPM max, précision, meilleur combo, niveau atteint.

## Touches

| Touche | Action |
|---|---|
| A–Z | taper les mots (toutes les lettres, P et M compris) |
| 1 / 2 | power-ups (remonte-temps / boomerang) |
| B / G | boutique / garage (depuis l'écran titre) |
| Entrée | commencer / rejouer |
| Échap | pause / reprendre |
| F2 | couper le son |
| F3 | clavier AZERTY / QWERTY |
| F4 | afficher / masquer le clavier à l'écran |

## Fichiers

- `index.html` — page du jeu
- `style.css` — plein écran, rendu pixelisé
- `vehicles.js` — les 9 véhicules en pixel art procédural (roues, jambes, armes, accessoires, contour automatique)
- `game.js` — moteur du jeu (décor en parallax, effets, audio synthé rétro, boutique, logique de jeu)
