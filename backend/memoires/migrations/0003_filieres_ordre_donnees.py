from django.db import migrations

# nom actuel -> (nouveau nom, sigle, ordre)
CHANGES = {
    "Mathématiques fondamentales et appliquées (MFA)": (None, None, 1),
    "Probabilités et statistique": (None, None, 2),
    "Didactique des sciences et technologies": (None, None, 3),
    "Physique théorique": (None, None, 4),
    "Recherche opérationnelle": (None, None, 5),
    "Science des données": ("Data science", "Data science", 6),
}
LICENCES = {"Mathématiques": 11, "Physique": 12, "Informatique": 13}


def apply(apps, schema_editor):
    Filiere = apps.get_model("memoires", "Filiere")
    for nom, (nouveau, sigle, ordre) in CHANGES.items():
        for f in Filiere.objects.filter(nom=nom):
            if nouveau:
                f.nom, f.sigle = nouveau, sigle
            f.ordre = ordre
            f.save()
    for nom, ordre in LICENCES.items():
        Filiere.objects.filter(nom=nom, niveaux=["Licence"]).update(ordre=ordre)


class Migration(migrations.Migration):
    dependencies = [("memoires", "0002_filiere_ordre")]
    operations = [migrations.RunPython(apply, migrations.RunPython.noop)]
