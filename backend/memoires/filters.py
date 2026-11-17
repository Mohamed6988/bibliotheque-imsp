from django.db.models import Count, Q

from .models import Domaine, Filiere, Memoire, Niveau, Statut


def apply_filters(qs, p, skip=()):
    """Filtres combinables ; `skip` exclut un groupe (pour les compteurs de facettes)."""
    if "domaine" not in skip and p.getlist("domaine"):
        qs = qs.filter(filiere__domaine__slug__in=p.getlist("domaine"))
    if "niveau" not in skip and p.getlist("niveau"):
        qs = qs.filter(niveau__in=p.getlist("niveau"))
    if "filiere" not in skip and p.getlist("filiere"):
        ids = [int(x) for x in p.getlist("filiere") if x.isdigit()]
        qs = qs.filter(filiere_id__in=ids)
    if p.get("annee_min", "").isdigit():
        qs = qs.filter(annee__gte=int(p["annee_min"]))
    if p.get("annee_max", "").isdigit():
        qs = qs.filter(annee__lte=int(p["annee_max"]))
    if p.get("auteur"):
        qs = qs.filter(auteur__nom__icontains=p["auteur"])
    if p.get("directeur"):
        qs = qs.filter(directeur__nom__icontains=p["directeur"])
    if p.get("q"):
        q = p["q"]
        qs = qs.filter(Q(titre__icontains=q) | Q(auteur__nom__icontains=q) | Q(directeur__nom__icontains=q)
                       | Q(resume__icontains=q) | Q(filiere__nom__icontains=q))
    return qs


ORDERINGS = {
    "recent": ["-annee", "-publie_le", "-id"],
    "titre": ["titre"],
    "annee": ["annee", "titre"],
}


def facettes(base, p):
    domaines = {r["filiere__domaine__slug"]: r["n"] for r in
                apply_filters(base, p, skip=("domaine",)).values("filiere__domaine__slug").annotate(n=Count("id"))}
    niveaux = {r["niveau"]: r["n"] for r in
               apply_filters(base, p, skip=("niveau",)).values("niveau").annotate(n=Count("id"))}
    filieres = {r["filiere_id"]: r["n"] for r in
                apply_filters(base, p, skip=("filiere",)).values("filiere_id").annotate(n=Count("id"))}
    return {
        "domaines": [{"slug": d.slug, "nom": d.nom, "icone": d.icone, "couleur": d.couleur,
                      "count": domaines.get(d.slug, 0)} for d in Domaine.objects.filter(archive=False)],
        "niveaux": [{"nom": n, "count": niveaux.get(n, 0)} for n in Niveau.values],
        "filieres": [{"id": f.id, "nom": f.nom, "sigle": f.sigle, "domaine": f.domaine.slug,
                      "niveaux": f.niveaux, "count": filieres.get(f.id, 0)}
                     for f in Filiere.objects.filter(archive=False, domaine__archive=False).select_related("domaine")],
    }


def publies():
    return Memoire.objects.filter(statut=Statut.PUBLIE).select_related(
        "auteur", "directeur", "filiere", "filiere__domaine")
