---
name: Azito Energie — Les défis du stand
description: Deux jeux de 30 secondes sur borne tactile, dans une ambiance de salle de contrôle aux couleurs de la charte Azito.
colors:
  indigo: "#313280"
  ink: "#1b1c55"
  mist: "#c9ccef"
  white: "#ffffff"
  red: "#c20e1a"
  blue: "#4d85d0"
  gray-2: "#d9d9d9"
  gray-5: "#b1b1b0"
  gray-8: "#868686"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.4rem, 0.9rem + 4.4vw, 6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(1.6rem, 0.8rem + 2.1vw, 3.3rem)"
    fontWeight: 700
    lineHeight: 1
  clock:
    fontFamily: "Barlow Condensed, Barlow, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(2.2rem, 1rem + 3.4vw, 5rem)"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.1rem, 0.68rem + 0.96vw, 1.85rem)"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1rem, 0.66rem + 0.74vw, 1.55rem)"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  gap: "clamp(12px, 1.6vw, 32px)"
  gutter: "clamp(16px, 3.4vw, 72px)"
  tap: "clamp(60px, 4.6vw, 88px)"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "0 1.7em"
    height: "{spacing.tap}"
  button-primary-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.indigo}"
  button-on-dark:
    backgroundColor: "{colors.white}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.none}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
  pick:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
  option:
    backgroundColor: "{colors.white}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
  timer-low:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
---

# Design System: Azito Energie — Les défis du stand

## Overview

**Creative North Star: "La salle de contrôle"**

L'interface se lit comme le synoptique d'une centrale : fond indigo sombre, chiffres condensés très grands, une seule consigne par écran. Elle tourne sur une borne tactile en paysage (1920 × 1080), dans un hall de salon, face à un visiteur debout qui a trente secondes. Tout ce qui ne sert pas à jouer est retiré.

La photo aérienne de la centrale reste présente derrière un voile indigo sur les écrans d'attente (accueil, choix, résultat). Les zones de jeu, elles, sont nettes : la turbine vit sur un « écran » clair, le puzzle sur un plateau blanc.

**Key Characteristics:**
- Sombre par défaut, clair uniquement là où l'on regarde un objet (turbine, schémas, plateau).
- Aucun arrondi : angles droits partout, et l'inclinaison à 18° de l'éclair du logo pour les boutons.
- Le temps est toujours visible : chrono à rebours géant, en haut à droite, sur les deux jeux.
- Aucun défilement sur la borne ; le défilement ne revient que sous 1100 px de large.

## Colors

La palette est celle de la charte Azito Energie, plus deux dérivés de l'indigo obtenus en ne changeant que la luminosité.

### Primary
- **Indigo Azito** (`indigo`) : surface du jeu de puzzle, texte sur fond blanc, pastilles A/B/C.
- **Encre de salle** (`ink`) : fond général, barres et en-tête. C'est l'indigo assombri.

### Secondary
- **Rouge Azito** (`red`) : l'action principale de chaque écran, le filet du classement, l'alerte des 10 dernières secondes, le mauvais choix.

### Tertiary
- **Bleu Azito** (`blue`) : contour du bon schéma et survol des vignettes. Jamais en texte.

### Neutral
- **Blanc** (`white`) : texte principal, plateau du puzzle, fond des schémas, anneau du chrono.
- **Brume** (`mist`) : texte secondaire sur fond sombre. C'est l'indigo éclairci, pas un gris.
- **Gris 2 / 5 / 8** : matières des modèles 3D et dégradé de l'écran de la turbine. Pas de texte.

### Named Rules
**The Tinted Secondary Rule.** Sur fond indigo, le texte secondaire est en Brume, jamais en gris : 7:1 sur indigo, 4,68:1 au pire sur la photo voilée.
**The Red Is An Action Rule.** Le rouge ne porte jamais de texte posé sur l'indigo (contraste insuffisant) ; il est toujours un aplat avec du blanc dessus.

## Typography

**Display Font:** Barlow Condensed (repli Barlow, Arial Narrow)
**Body Font:** Barlow (repli Helvetica Neue, Arial)

**Character:** une grotesque de signalétique industrielle. La condensée, en capitales, donne les titres et les chiffres ; la normale porte les consignes. Les deux sont chargées depuis Google Fonts.

### Hierarchy
- **Display** (700, `clamp(2.4rem, 0.9rem + 4.4vw, 6rem)`, 1) : titre d'écran, en capitales.
- **Headline** (700, `clamp(1.6rem, 0.8rem + 2.1vw, 3.3rem)`, 1) : nom des jeux, consigne en jeu, verdict, compteur de pièces.
- **Clock** (700, `clamp(2.2rem, 1rem + 3.4vw, 5rem)`, chiffres tabulaires) : secondes restantes.
- **Body** (400, `clamp(1.1rem, 0.68rem + 0.96vw, 1.85rem)`, 1,4) : consignes ; 46 à 60 caractères par ligne.
- **Label** (600, `clamp(1rem, 0.66rem + 0.74vw, 1.55rem)`) : boutons secondaires, mentions « Ton choix » / « Le bon schéma ».

### Named Rules
**The No Eyebrow Rule.** Pas de petite étiquette au-dessus d'un titre. Le titre dit tout ; la seconde moitié du titre passe en graisse 500 et en Brume quand il faut une nuance.
**The Kiosk Scale Rule.** L'échelle continue de grandir jusqu'à 1920 px : texte courant ≈ 29 px et boutons de 88 px sur la borne.

## Layout

Chaque page tient dans `100dvh` : un en-tête, puis une zone qui prend le reste. L'accueil est une grille de trois colonnes inégales (1,3 / 1 / 0,82) : Turbine Match, Build Azito, classement. Les deux entrées de jeu ne se ressemblent pas : l'une montre la turbine 3D sur écran clair, l'autre la photo aérienne.

Les écarts viennent de deux valeurs fluides : `gap` entre éléments, `gutter` pour les marges d'écran.

Adaptations :
- **≤ 1100 px de large ou ≤ 620 px de haut** : l'accueil défile, deux colonnes puis classement dessous.
- **≤ 860 px** : vignettes de choix sur deux colonnes, astuce de la barre de consigne masquée.
- **≤ 640 px** : accueil sur une colonne, titre du jeu masqué dans l'en-tête.
- **≤ 560 px en portrait** : schémas A/B/C empilés, vignettes sur une colonne.
- **≤ 480 px de haut en paysage** : en-tête et chrono réduits pour rendre la hauteur à la turbine.

## Elevation & Depth

Le système est plat. La profondeur vient de trois plans superposés : photo voilée, panneaux encre à 88 % d'opacité bordés d'un filet blanc à 22 %, et surfaces claires de jeu. Une seule ombre existe : celle de l'alerte d'inactivité, qui doit flotter au-dessus de tout (`0 12px 40px rgb(0 0 0 / 0.35)`), et celle d'une pièce de puzzle soulevée.

## Shapes

Angles droits partout (rayon 0). La seule forme propre au système est l'oblique à 18° reprise de l'éclair du logo : boutons inclinés (`skewX(-18deg)`, texte redressé) et pastilles A/B/C coupées en biais. Les bordures font 2 à 4 px, blanches ou en filet translucide.

## Components

### Buttons
- **Shape:** parallélogramme incliné à 18°, sans arrondi ; hauteur `tap` (60 à 88 px).
- **Primary:** aplat Rouge Azito, texte blanc 600. Un seul par écran.
- **Hover / Focus:** au survol, fond blanc et texte indigo ; à l'appui, échelle 0,96 ; anneau de focus blanc de 4 px décalé de 4 px.
- **Secondary / Ghost:** `button-on-dark` (blanc plein) pour la deuxième action, `button-ghost` (contour blanc) pour les sorties.

### Cards / Containers
- **Entrée de jeu (accueil) :** panneau encre, filet translucide de 2 px, média en haut, nom du jeu, consigne et bouton « Jouer » en bas. Toute la carte est un lien.
- **Vignette de choix (`pick`) :** image 16:9 sous bordure blanche de 3 px, libellé en capitales condensées dessous.
- **Schéma (`option`) :** fond blanc, rapport 2:1, pastille de lettre en haut à gauche. Après la réponse : contour bleu et mention « Le bon schéma », contour rouge et mention « Ton choix », les autres à 50 % d'opacité.

### Inputs / Fields
- **Style:** contour blanc de 2 px, fond transparent, texte blanc 600, hauteur `tap`.
- **Focus:** anneau blanc commun.

### Navigation
- En-tête encre : logo blanc à gauche (zone d'exclusion de la charte respectée, zone tactile ≥ 48 px), nom du jeu au centre, chrono et plein écran à droite.

### Chrono
Anneau qui se vide + secondes en chiffres tabulaires. Sous 10 secondes, tout le bloc passe sur aplat rouge.

### Barre de verdict
Elle remplace la consigne entre la turbine et les schémas : le résultat s'affiche sans rien masquer, avec Rejouer, Voir la différence, Autre turbine, Accueil.

## Do's and Don'ts

### Do:
- **Do** garder le plateau du puzzle entièrement blanc : pas d'image fantôme, seuls les contours pointillés guident.
- **Do** laisser les schémas visibles quand le verdict tombe.
- **Do** écrire les consignes à la deuxième personne, en une phrase.
- **Do** vérifier chaque écran à 1920 × 1080 d'abord, sans défilement.

### Don't:
- **Don't** poser de texte rouge ou bleu sur l'indigo.
- **Don't** utiliser de gris pour du texte sur fond sombre.
- **Don't** ajouter d'arrondi, de dégradé décoratif ou d'emoji en guise d'icône.
- **Don't** montrer le niveau de difficulté comme un choix du visiteur : c'est un réglage d'animateur (`?serie=1|2|3`).
