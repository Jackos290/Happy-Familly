# Bien sûr Ludo

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
