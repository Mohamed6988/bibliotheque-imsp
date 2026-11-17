from datetime import date

from rest_framework import serializers

from .models import Domaine, Filiere, Memoire, Niveau, Personne, Statut


class DomaineMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domaine
        fields = ["id", "nom", "slug", "couleur", "icone"]


class FiliereMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filiere
        fields = ["id", "nom", "sigle"]


class MemoireListSerializer(serializers.ModelSerializer):
    auteur = serializers.CharField(source="auteur.nom")
    directeur = serializers.CharField(source="directeur.nom")
    filiere = FiliereMiniSerializer()
    domaine = DomaineMiniSerializer()
    type_document = serializers.CharField()

    class Meta:
        model = Memoire
        fields = ["id", "titre", "auteur", "directeur", "annee", "niveau", "type_document",
                  "filiere", "domaine", "nb_pages", "couleur"]


class MemoireDetailSerializer(MemoireListSerializer):
    class Meta(MemoireListSerializer.Meta):
        fields = MemoireListSerializer.Meta.fields + ["resume", "mots_cles"]


class PersonneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personne
        fields = ["id", "nom"]


# ---------- Espace bibliothécaire ----------

class MemoireGestionSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.CharField(source="auteur.nom", read_only=True)
    directeur_nom = serializers.CharField(source="directeur.nom", read_only=True)
    filiere_nom = serializers.CharField(source="filiere.nom", read_only=True)
    domaine = DomaineMiniSerializer(read_only=True)
    fichier_present = serializers.SerializerMethodField()

    class Meta:
        model = Memoire
        fields = ["id", "titre", "auteur", "auteur_nom", "directeur", "directeur_nom", "annee",
                  "niveau", "filiere", "filiere_nom", "domaine", "resume", "mots_cles", "nb_pages",
                  "fichier", "fichier_present", "statut", "depot_physique_verifie",
                  "depot_numerique_verifie", "date_verification", "cree_le", "publie_le", "couleur"]
        read_only_fields = ["statut", "nb_pages", "cree_le", "publie_le"]
        extra_kwargs = {"fichier": {"write_only": True, "required": False}}

    def get_fichier_present(self, obj):
        return bool(obj.fichier)

    def to_internal_value(self, data):
        # multipart: les mots-clés arrivent sous forme "a, b, c"
        if hasattr(data, "getlist"):
            data = data.copy()
            mc = data.get("mots_cles")
            if isinstance(mc, str):
                data.setlist("mots_cles", [m.strip() for m in mc.split(",") if m.strip()])
        return super().to_internal_value(data)

    def validate_annee(self, v):
        if not 1990 <= v <= date.today().year + 1:
            raise serializers.ValidationError("Année invalide.")
        return v

    def validate_fichier(self, f):
        if not f.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Le fichier doit être un PDF.")
        if f.size > 100 * 1024 * 1024:
            raise serializers.ValidationError("Fichier trop volumineux (100 Mo max).")
        return f

    def validate(self, attrs):
        inst = self.instance
        niveau = attrs.get("niveau", inst.niveau if inst else None)
        filiere = attrs.get("filiere", inst.filiere if inst else None)
        if niveau and filiere and niveau not in filiere.niveaux:
            raise serializers.ValidationError(
                {"filiere": f"Cette filière n'existe pas au niveau {niveau}."})
        return attrs

    def _count_pages(self, instance):
        if instance.fichier:
            try:
                from pypdf import PdfReader
                instance.fichier.open("rb")
                instance.nb_pages = len(PdfReader(instance.fichier).pages)
                instance.fichier.close()
                instance.save(update_fields=["nb_pages"])
            except Exception:
                pass

    def create(self, validated):
        obj = super().create(validated)
        self._count_pages(obj)
        return obj

    def update(self, instance, validated):
        new_file = "fichier" in validated
        obj = super().update(instance, validated)
        if new_file:
            self._count_pages(obj)
        return obj


class DomaineGestionSerializer(serializers.ModelSerializer):
    nb_filieres = serializers.IntegerField(read_only=True)

    class Meta:
        model = Domaine
        fields = ["id", "nom", "slug", "icone", "couleur", "ordre", "archive", "nb_filieres"]
        extra_kwargs = {"slug": {"required": False}}

    def validate(self, attrs):
        from django.utils.text import slugify
        if "nom" in attrs and not attrs.get("slug") and not (self.instance and self.instance.slug):
            attrs["slug"] = slugify(attrs["nom"])
        return attrs


class FiliereGestionSerializer(serializers.ModelSerializer):
    domaine_nom = serializers.CharField(source="domaine.nom", read_only=True)
    niveaux = serializers.ListField(child=serializers.ChoiceField(choices=Niveau.choices))

    class Meta:
        model = Filiere
        fields = ["id", "nom", "sigle", "domaine", "domaine_nom", "niveaux", "ordre", "archive"]
