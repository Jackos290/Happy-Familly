# Happy Familly

Application web familiale moderne pour tablette permanente et mobile.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- `localStorage` pour cette V1

## Lancer le projet

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Evolution prévue

La persistance est isolée dans `src/utils/localStorage.ts`, ce qui permettra de remplacer progressivement le stockage local par Supabase ou Firebase sans réécrire les composants.

## Mode tablette

Le bouton `Mode tablette` demande le plein écran et active la Wake Lock API quand le navigateur la supporte. Les navigateurs imposent un clic utilisateur pour autoriser le plein écran et peuvent refuser l'anti-veille selon l'appareil ou les réglages système.
