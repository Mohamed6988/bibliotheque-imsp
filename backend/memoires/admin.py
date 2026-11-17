from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from . import models

admin.site.register([models.Domaine, models.Filiere, models.Personne, models.Memoire, models.Activite])


@admin.register(models.Utilisateur)
class UtilisateurAdmin(UserAdmin):
    """Comptes bibliothécaires : `is_staff` donne accès à l'espace bibliothécaire."""
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "is_staff", "is_active", "last_login")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité", {"fields": ("first_name", "last_name")}),
        ("Accès", {
            "fields": ("is_active", "is_staff", "is_superuser"),
            "description": "« Statut équipe » = peut se connecter à l'espace bibliothécaire.",
        }),
        ("Permissions avancées", {"classes": ("collapse",), "fields": ("groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "first_name", "last_name", "password1", "password2", "is_staff")}),
    )
