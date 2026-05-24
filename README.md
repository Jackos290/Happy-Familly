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

La persistance locale reste disponible, mais l'application peut maintenant synchroniser les données entre téléphone et tablette avec Supabase.

## Supabase

1. Créer un projet Supabase.
2. Ouvrir `SQL Editor`.
3. Copier-coller puis exécuter le fichier `supabase/schema.sql`.
4. Dans Vercel, ajouter les variables d'environnement :

```bash
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta-cle-anon-public
```

5. Redéployer Vercel.

Sans ces variables, l'application continue de fonctionner en `localStorage`.

## Mode tablette

Le bouton `Mode tablette` demande le plein écran et active la Wake Lock API quand le navigateur la supporte. Les navigateurs imposent un clic utilisateur pour autoriser le plein écran et peuvent refuser l'anti-veille selon l'appareil ou les réglages système.
