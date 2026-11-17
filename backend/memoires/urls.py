from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("gestion/memoires", views.MemoireGestionViewSet, basename="gestion-memoires")
router.register("gestion/domaines", views.DomaineGestionViewSet, basename="gestion-domaines")
router.register("gestion/filieres", views.FiliereGestionViewSet, basename="gestion-filieres")

urlpatterns = [
    path("accueil/", views.accueil),
    path("catalogue/", views.catalogue),
    path("catalogue/facettes/", views.catalogue_facettes),
    path("memoires/<int:pk>/", views.memoire_detail),
    path("memoires/<int:pk>/similaires/", views.memoire_similaires),
    path("memoires/<int:pk>/lire/", views.memoire_lire),
    path("personnes/", views.personnes),
    path("auth/login/", views.login),
    path("auth/logout/", views.logout),
    path("auth/me/", views.me),
    path("gestion/personnes/", views.personne_creer),
    path("gestion/tableau-de-bord/", views.tableau_de_bord),
    path("gestion/journal/", views.journal),
    path("", include(router.urls)),
]
