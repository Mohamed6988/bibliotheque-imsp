# MSP – Bibliothèque numérique de l'IMSP

Plateforme de consultation des mémoires et thèses de l'IMSP-UAC.
Lecture seule pour le public (pas de téléchargement) ; seul le bibliothécaire ajoute et publie.

**Stack** : Django 5 + DRF · PostgreSQL 16 · React 19 + Vite + Tailwind · Docker Compose

## Démarrage

```bash
cp .env.example .env        # puis changer les mots de passe
docker compose up --build
docker compose exec backend python manage.py seed_demo   # données d'exemple (optionnel)
```

- Site public : http://localhost:5173
- API : http://localhost:8000/api/ · Admin Django : http://localhost:8000/admin/
- Espace bibliothécaire : bouton « Espace bibliothécaire » ; compte créé au démarrage depuis
  `DJANGO_SUPERUSER_EMAIL` / `DJANGO_SUPERUSER_PASSWORD` (`.env`).

## Architecture

| Dossier | Contenu |
|---|---|
| `backend/memoires/models.py` | Domaine → Filière (niveaux applicables) · Mémoire (statut Brouillon/Vérifié/Publié/Archivé) · Personne · Consultation · Activité |
| `backend/memoires/filters.py` | Filtres combinables + compteurs de facettes (la liste des filières s'adapte au domaine/niveau) |
| `backend/memoires/views.py` | API publique (`/api/catalogue/`, `/api/memoires/<id>/…`) et gestion (`/api/gestion/…`, jeton requis) |
| `frontend/src/App.tsx` | UI issue de la maquette Figma ; `api.ts` = client API |

## Règles métier

- Seuls les mémoires **Publié** sont visibles publiquement.
- Publication impossible sans PDF et sans les deux contrôles « dépôt physique / numérique vérifié ».
- Une filière n'accepte que ses niveaux (ex. Licence : Mathématiques, Physique, Informatique).
- Pas de suppression : domaines, filières et mémoires sont **archivés**.

## Limites connues

- **Lecture seule = dissuasion, pas une garantie.** Le PDF est rendu en canvas (pdf.js) sans bouton de
  téléchargement/impression, avec filigrane, mais un lecteur déterminé peut récupérer le flux réseau.
- Pas de 2FA ni de « mot de passe oublié » (présents sur la maquette, non implémentés).
- Pages « À propos » / « Contact » non réalisées.
- Compose actuel = environnement de **développement** (rechargement à chaud, `DEBUG`). Pour la production :
  `DJANGO_DEBUG=0`, vrai `DJANGO_SECRET_KEY`, build statique du frontend servi par un reverse proxy HTTPS.
