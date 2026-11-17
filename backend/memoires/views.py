from datetime import timedelta

from django.contrib.auth import authenticate
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import FileResponse, Http404, QueryDict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .filters import ORDERINGS, apply_filters, facettes, publies
from .models import (Activite, Consultation, Domaine, Filiere, Memoire, Personne, Statut)
from .serializers import (DomaineGestionSerializer, FiliereGestionSerializer, MemoireDetailSerializer,
                          MemoireGestionSerializer, MemoireListSerializer, PersonneSerializer)


class Staff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def log(request, action, memoire=None, detail=""):
    Activite.objects.create(utilisateur=request.user, action=action, memoire=memoire, detail=detail)


# ---------- Public ----------

@api_view(["GET"])
def catalogue(request):
    p = request.query_params
    qs = apply_filters(publies(), p).order_by(*ORDERINGS.get(p.get("tri"), ORDERINGS["recent"]))
    pager = PageNumberPagination()
    pager.page_size = min(int(p.get("taille", 9)) if p.get("taille", "9").isdigit() else 9, 50)
    page = pager.paginate_queryset(qs, request)
    return pager.get_paginated_response(MemoireListSerializer(page, many=True).data)


@api_view(["GET"])
def catalogue_facettes(request):
    return Response(facettes(publies(), request.query_params))


@api_view(["GET"])
def memoire_detail(request, pk):
    m = get_object_or_404(publies(), pk=pk)
    return Response(MemoireDetailSerializer(m).data)


@api_view(["GET"])
def memoire_similaires(request, pk):
    m = get_object_or_404(publies(), pk=pk)
    qs = publies().exclude(pk=pk).filter(Q(filiere=m.filiere) | Q(filiere__domaine=m.filiere.domaine))
    qs = qs.order_by("-annee")[:4]
    return Response(MemoireListSerializer(qs, many=True).data)


@api_view(["GET"])
def memoire_lire(request, pk):
    """Flux PDF en lecture seule (inline, sans mise en cache)."""
    qs = Memoire.objects.all() if (request.user.is_authenticated and request.user.is_staff) else publies()
    m = get_object_or_404(qs, pk=pk)
    if not m.fichier:
        raise Http404
    if m.statut == Statut.PUBLIE:
        Consultation.objects.create(memoire=m)
    resp = FileResponse(m.fichier.open("rb"), content_type="application/pdf")
    resp["Content-Disposition"] = "inline"
    resp["Cache-Control"] = "no-store"
    resp["X-Content-Type-Options"] = "nosniff"
    return resp


@api_view(["GET"])
def accueil(request):
    base = publies()
    return Response({
        "stats": {
            "memoires": base.count(),
            "domaines": Domaine.objects.filter(archive=False).count(),
            "auteurs": base.values("auteur").distinct().count(),
            "annees": base.values("annee").distinct().count(),
        },
        "domaines": facettes(base, QueryDict())["domaines"],
        "recents": MemoireListSerializer(base.order_by("-publie_le", "-annee")[:6], many=True).data,
    })


@api_view(["GET"])
def personnes(request):
    q = request.query_params.get("q", "")
    qs = Personne.objects.filter(nom__icontains=q)
    role = request.query_params.get("role")
    if role == "auteur":
        qs = qs.filter(memoires_ecrits__statut=Statut.PUBLIE).distinct() if not request.user.is_staff else qs
    elif role == "directeur":
        qs = qs.filter(memoires_diriges__statut=Statut.PUBLIE).distinct() if not request.user.is_staff else qs
    return Response(PersonneSerializer(qs[:8], many=True).data)


# ---------- Auth ----------

@api_view(["POST"])
def login(request):
    user = authenticate(request, username=request.data.get("email", ""), password=request.data.get("password", ""))
    if not user or not user.is_staff:
        return Response({"detail": "Email ou mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    request.user = user
    log(request, "Connexion")
    return Response({"token": token.key, "email": user.email})


@api_view(["POST"])
@permission_classes([Staff])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([Staff])
def me(request):
    return Response({"email": request.user.email})


# ---------- Gestion ----------

class MemoireGestionViewSet(viewsets.ModelViewSet):
    permission_classes = [Staff]
    serializer_class = MemoireGestionSerializer

    def get_queryset(self):
        p = self.request.query_params
        qs = Memoire.objects.select_related("auteur", "directeur", "filiere", "filiere__domaine")
        qs = apply_filters(qs, p)
        if p.get("statut"):
            qs = qs.filter(statut__in=p.getlist("statut"))
        return qs.order_by("-cree_le")

    @staticmethod
    def _sync_verifie(m):
        """Brouillon <-> Vérifié selon les deux contrôles de dépôt."""
        both = m.depot_physique_verifie and m.depot_numerique_verifie
        if m.statut == Statut.BROUILLON and both:
            m.statut = Statut.VERIFIE
            m.save(update_fields=["statut"])
        elif m.statut == Statut.VERIFIE and not both:
            m.statut = Statut.BROUILLON
            m.save(update_fields=["statut"])

    def perform_create(self, serializer):
        m = serializer.save()
        self._sync_verifie(m)
        log(self.request, "Création", m)

    def perform_update(self, serializer):
        m = serializer.save()
        self._sync_verifie(m)
        log(self.request, "Modification", m)

    def _set_statut(self, m, statut, label):
        if statut == Statut.PUBLIE:
            if not (m.depot_physique_verifie and m.depot_numerique_verifie):
                return "Les dépôts physique et numérique doivent être vérifiés."
            if not m.fichier:
                return "Un fichier PDF est requis."
            m.publie_le = timezone.now()
        m.statut = statut
        m.save()
        log(self.request, label, m)

    @action(detail=True, methods=["post"])
    def publier(self, request, pk=None):
        m = self.get_object()
        err = self._set_statut(m, Statut.PUBLIE, "Publication")
        if err:
            return Response({"detail": err}, status=400)
        return Response(self.get_serializer(m).data)

    @action(detail=True, methods=["post"])
    def archiver(self, request, pk=None):
        m = self.get_object()
        self._set_statut(m, Statut.ARCHIVE, "Archivage")
        return Response(self.get_serializer(m).data)

    @action(detail=True, methods=["post"])
    def restaurer(self, request, pk=None):
        m = self.get_object()
        self._set_statut(m, Statut.BROUILLON, "Restauration")
        return Response(self.get_serializer(m).data)

    @action(detail=False, methods=["post"])
    def lot(self, request):
        ids, act = request.data.get("ids", []), request.data.get("action")
        mapping = {"archiver": (Statut.ARCHIVE, "Archivage"), "restaurer": (Statut.BROUILLON, "Restauration"),
                   "publier": (Statut.PUBLIE, "Publication")}
        if act not in mapping:
            return Response({"detail": "Action inconnue."}, status=400)
        erreurs = []
        for m in Memoire.objects.filter(id__in=ids):
            err = self._set_statut(m, *mapping[act])
            if err:
                erreurs.append({"id": m.id, "detail": err})
        return Response({"erreurs": erreurs})


class DomaineGestionViewSet(viewsets.ModelViewSet):
    permission_classes = [Staff]
    serializer_class = DomaineGestionSerializer
    pagination_class = None

    def get_queryset(self):
        return Domaine.objects.annotate(nb_filieres=Count("filieres", filter=Q(filieres__archive=False)))

    def perform_destroy(self, instance):
        instance.archive = True  # jamais de suppression : archivage
        instance.save()


class FiliereGestionViewSet(viewsets.ModelViewSet):
    permission_classes = [Staff]
    serializer_class = FiliereGestionSerializer
    queryset = Filiere.objects.select_related("domaine")
    pagination_class = None

    def perform_destroy(self, instance):
        instance.archive = True
        instance.save()


@api_view(["POST"])
@permission_classes([Staff])
def personne_creer(request):
    nom = (request.data.get("nom") or "").strip()
    if not nom:
        return Response({"nom": "Le nom est obligatoire."}, status=400)
    p, _ = Personne.objects.get_or_create(nom=nom)
    return Response(PersonneSerializer(p).data, status=201)


@api_view(["GET"])
@permission_classes([Staff])
def tableau_de_bord(request):
    now = timezone.now()
    debut = now - timedelta(days=29)
    par_jour = {r["j"]: r["n"] for r in Consultation.objects.filter(date__gte=debut)
                .annotate(j=TruncDate("date")).values("j").annotate(n=Count("id"))}
    serie = [{"date": (debut + timedelta(days=i)).date().isoformat(),
              "n": par_jour.get((debut + timedelta(days=i)).date(), 0)} for i in range(30)]
    par_domaine = list(Memoire.objects.filter(statut=Statut.PUBLIE).values("filiere__domaine__nom")
                       .annotate(n=Count("id")).order_by("-n"))
    return Response({
        "kpis": {
            "publies": Memoire.objects.filter(statut=Statut.PUBLIE).count(),
            "en_attente": Memoire.objects.filter(statut__in=[Statut.BROUILLON, Statut.VERIFIE]).count(),
            "archives": Memoire.objects.filter(statut=Statut.ARCHIVE).count(),
            "consultations_mois": Consultation.objects.filter(date__gte=now.replace(day=1, hour=0, minute=0)).count(),
        },
        "consultations": serie,
        "par_domaine": [{"domaine": r["filiere__domaine__nom"], "n": r["n"]} for r in par_domaine],
        "activites": [{"id": a.id, "action": a.action, "memoire": a.memoire.titre if a.memoire else a.detail,
                       "utilisateur": a.utilisateur.email if a.utilisateur else "", "date": a.date}
                      for a in Activite.objects.select_related("memoire", "utilisateur")[:8]],
    })


@api_view(["GET"])
@permission_classes([Staff])
def journal(request):
    pager = PageNumberPagination()
    pager.page_size = 20
    page = pager.paginate_queryset(Activite.objects.select_related("memoire", "utilisateur"), request)
    return pager.get_paginated_response([
        {"id": a.id, "action": a.action, "memoire": a.memoire.titre if a.memoire else a.detail,
         "utilisateur": a.utilisateur.email if a.utilisateur else "", "date": a.date} for a in page])
