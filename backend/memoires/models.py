from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone


class UtilisateurManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("L'email est obligatoire")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class Utilisateur(AbstractUser):
    """Compte bibliothécaire (connexion par email)."""
    username = None
    email = models.EmailField("email", unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UtilisateurManager()


class Niveau(models.TextChoices):
    LICENCE = "Licence", "Licence"
    MASTER = "Master", "Master"
    DOCTORAT = "Doctorat", "Doctorat"


class Domaine(models.Model):
    nom = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(unique=True)
    icone = models.CharField(max_length=40, blank=True)
    couleur = models.CharField(max_length=9, default="#0B3A6F")
    ordre = models.PositiveSmallIntegerField(default=0)
    archive = models.BooleanField(default=False)

    class Meta:
        ordering = ["ordre", "nom"]

    def __str__(self):
        return self.nom


class Filiere(models.Model):
    nom = models.CharField(max_length=200)
    sigle = models.CharField(max_length=40, blank=True)
    domaine = models.ForeignKey(Domaine, on_delete=models.PROTECT, related_name="filieres")
    niveaux = ArrayField(models.CharField(max_length=10, choices=Niveau.choices), default=list)
    ordre = models.PositiveSmallIntegerField(default=100, help_text="Ordre d'affichage dans les filtres")
    archive = models.BooleanField(default=False)

    class Meta:
        ordering = ["ordre", "nom"]
        unique_together = [("nom", "domaine")]

    @property
    def libelle_court(self):
        return self.sigle or self.nom

    def __str__(self):
        return f"{self.nom} ({self.domaine})"


class Personne(models.Model):
    """Auteur ou directeur de mémoire."""
    nom = models.CharField(max_length=160, unique=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Statut(models.TextChoices):
    BROUILLON = "brouillon", "Brouillon"
    VERIFIE = "verifie", "Vérifié"
    PUBLIE = "publie", "Publié"
    ARCHIVE = "archive", "Archivé"


def pdf_path(instance, filename):
    return f"memoires/{instance.pk or 'new'}/{filename}"


class Memoire(models.Model):
    titre = models.CharField(max_length=500)
    auteur = models.ForeignKey(Personne, on_delete=models.PROTECT, related_name="memoires_ecrits")
    directeur = models.ForeignKey(Personne, on_delete=models.PROTECT, related_name="memoires_diriges")
    annee = models.PositiveSmallIntegerField()
    niveau = models.CharField(max_length=10, choices=Niveau.choices)
    filiere = models.ForeignKey(Filiere, on_delete=models.PROTECT, related_name="memoires")
    resume = models.TextField(blank=True)
    mots_cles = ArrayField(models.CharField(max_length=60), default=list, blank=True)
    nb_pages = models.PositiveIntegerField(default=0)
    fichier = models.FileField(upload_to=pdf_path, blank=True)
    couleur = models.CharField(max_length=9, default="#0B3A6F")
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.BROUILLON)
    depot_physique_verifie = models.BooleanField(default=False)
    depot_numerique_verifie = models.BooleanField(default=False)
    date_verification = models.DateField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    publie_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-annee", "-cree_le"]
        indexes = [models.Index(fields=["statut", "annee"])]

    @property
    def domaine(self):
        return self.filiere.domaine

    @property
    def type_document(self):
        return "Thèse" if self.niveau == Niveau.DOCTORAT else "Mémoire"

    def __str__(self):
        return self.titre


class Consultation(models.Model):
    memoire = models.ForeignKey(Memoire, on_delete=models.CASCADE, related_name="consultations")
    date = models.DateTimeField(default=timezone.now, db_index=True)


class Activite(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80)
    memoire = models.ForeignKey(Memoire, null=True, blank=True, on_delete=models.SET_NULL)
    detail = models.CharField(max_length=300, blank=True)
    date = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-date"]
