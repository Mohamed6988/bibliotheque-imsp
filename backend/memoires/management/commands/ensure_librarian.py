import os

from django.core.management.base import BaseCommand

from memoires.models import Utilisateur


class Command(BaseCommand):
    help = "Crée le compte bibliothécaire depuis DJANGO_SUPERUSER_EMAIL / _PASSWORD s'il n'existe pas."

    def handle(self, *args, **opts):
        email = os.environ["DJANGO_SUPERUSER_EMAIL"]
        if not Utilisateur.objects.filter(email=email).exists():
            Utilisateur.objects.create_superuser(email, os.environ["DJANGO_SUPERUSER_PASSWORD"])
            self.stdout.write(f"Bibliothécaire créé : {email}")
