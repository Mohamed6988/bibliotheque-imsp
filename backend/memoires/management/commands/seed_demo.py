import random
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from memoires.models import Domaine, Filiere, Memoire, Personne, Statut

DOMAINES = [
    ("Mathématiques", "mathematiques", "BarChart3", "#0B3A6F"),
    ("Informatique", "informatique", "Database", "#1E9E6A"),
    ("Physique", "physique", "Atom", "#7A4E9C"),
    ("Autres domaines", "autres-domaines", "Sparkles", "#B47713"),
]
M, L, D = "Master", "Licence", "Doctorat"
FILIERES = [  # (nom, sigle, domaine, niveaux, ordre)
    ("Mathématiques fondamentales et appliquées (MFA)", "MFA", "mathematiques", [M, D], 1),
    ("Probabilités et statistique", "Prob. & stat.", "mathematiques", [M, D], 2),
    ("Didactique des sciences et technologies", "Didactique", "autres-domaines", [M, D], 3),
    ("Physique théorique", "Physique théorique", "physique", [M, D], 4),
    ("Recherche opérationnelle", "Recherche op.", "autres-domaines", [M, D], 5),
    ("Data science", "Data science", "informatique", [M, D], 6),
    ("Mathématiques", "Mathématiques", "mathematiques", [L], 11),
    ("Physique", "Physique", "physique", [L], 12),
    ("Informatique", "Informatique", "informatique", [L], 13),
]
AUTEURS = ["Aïcha Adéoti", "Kévin Dossou", "Mireille Tchibozo", "Landry Hountondji", "Grâce Soglo",
           "Romaric Zinsou", "Sènami Ahouandjinou", "Arnaud Gnonlonfoun", "Nadia Houédanou",
           "Fiacre Akpovi", "Prudence Agbodjan", "Rodrigue Sagbo", "Judith Tossou", "Carine Fassinou",
           "Christian Akotègnon", "Estelle Gbèdo", "Thierry Ahlonsou", "Sylvie Dansou"]
DIRECTEURS = ["Pr. G. Houngnon", "Dr S. Kpadonou", "Pr. A. Kounouhéwa", "Dr E. Agossou", "Pr. P. Gbaguidi",
              "Dr F. Hounkonnou", "Dr J. Adjakpa", "Pr. B. Djèdji", "Pr. M. Mama"]
COULEURS = ["#0B3A6F", "#7A4E12", "#145F56", "#5B3A80", "#205C78", "#836516", "#843B62", "#364A77"]

# (titre, filière sigle/nom, niveau, mots-clés)
SUJETS = [
    ("Modélisation mathématique de la propagation du paludisme au Bénin", "MFA", M, ["épidémiologie", "EDO", "simulation"]),
    ("Analyse numérique des équations de Navier–Stokes en milieu poreux", "MFA", M, ["EDP", "éléments finis"]),
    ("Méthodes variationnelles pour les problèmes elliptiques non linéaires", "MFA", D, ["calcul des variations"]),
    ("Existence et unicité de solutions pour une classe d'EDP paraboliques", "MFA", D, ["EDP", "analyse"]),
    ("Inférence bayésienne appliquée aux séries pluviométriques du Bénin", "Prob. & stat.", M, ["bayésien", "climat"]),
    ("Processus stochastiques et file d'attente dans les centres de santé", "Prob. & stat.", M, ["files d'attente", "Markov"]),
    ("Théorèmes limites pour des martingales dépendantes", "Prob. & stat.", D, ["martingales"]),
    ("Initiation aux suites et séries de fonctions", "Mathématiques", L, ["analyse", "séries"]),
    ("Géométrie du plan : applications pédagogiques", "Mathématiques", L, ["géométrie"]),
    ("Algèbre linéaire et applications aux réseaux électriques", "Mathématiques", L, ["algèbre linéaire"]),
    ("Apprentissage profond pour la détection précoce des maladies du manioc", "Data science", M, ["deep learning", "agriculture"]),
    ("Classification automatique des langues nationales béninoises", "Data science", M, ["TAL", "langues"]),
    ("Prévision de la demande d'électricité par réseaux récurrents", "Data science", M, ["LSTM", "énergie"]),
    ("Apprentissage fédéré pour les données de santé en Afrique de l'Ouest", "Data science", D, ["apprentissage fédéré"]),
    ("Conception d'une application web de gestion scolaire", "Informatique", L, ["web", "base de données"]),
    ("Réseaux locaux : déploiement et sécurisation", "Informatique", L, ["réseaux"]),
    ("Étude des propriétés électroniques des matériaux pérovskites", "Physique théorique", M, ["DFT", "matériaux"]),
    ("Variabilité climatique et rayonnement solaire en Afrique de l'Ouest", "Physique théorique", M, ["climat", "solaire"]),
    ("Caractérisation des aérosols atmosphériques dans le golfe de Guinée", "Physique théorique", D, ["aérosols"]),
    ("Théorie quantique des champs en espace-temps courbe", "Physique théorique", D, ["TQC"]),
    ("Optique géométrique et instruments simples", "Physique", L, ["optique"]),
    ("Mesure de l'irradiation solaire à Abomey-Calavi", "Physique", L, ["solaire", "mesure"]),
    ("Optimisation robuste des réseaux de transport urbain à Cotonou", "Recherche op.", M, ["optimisation", "transport"]),
    ("Ordonnancement de tournées de collecte des déchets", "Recherche op.", M, ["graphes", "heuristiques"]),
    ("Programmation stochastique pour la gestion des stocks de médicaments", "Recherche op.", D, ["stochastique"]),
    ("Enseignement des fonctions numériques au secondaire : obstacles didactiques", "Didactique", M, ["didactique", "secondaire"]),
    ("Intégration des simulations numériques dans l'enseignement de la physique", "Didactique", M, ["TIC", "physique"]),
]

RESUME = ("Ce travail s'inscrit dans le cadre des recherches menées à l'Institut de Mathématiques et de "
          "Sciences Physiques. Après un état de l'art, nous présentons la méthodologie retenue, les résultats "
          "obtenus et une discussion de leurs limites. Des perspectives de recherche sont proposées en conclusion.")


def pdf(titre, auteur, pages=12):
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(w / 2, h - 150, "Institut de Mathématiques et de Sciences Physiques")
    c.setFont("Helvetica-Bold", 16)
    y = h - 260
    for chunk in [titre[i:i + 55] for i in range(0, len(titre), 55)]:
        c.drawCentredString(w / 2, y, chunk)
        y -= 24
    c.setFont("Helvetica", 12)
    c.drawCentredString(w / 2, y - 30, f"Présenté par {auteur}")
    c.showPage()
    for i in range(2, pages + 1):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(70, h - 90, f"Chapitre {i - 1}")
        c.setFont("Helvetica", 11)
        for j in range(30):
            c.drawString(70, h - 130 - j * 20, "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.")
        c.drawCentredString(w / 2, 40, str(i))
        c.showPage()
    c.save()
    return buf.getvalue()


class Command(BaseCommand):
    help = "Charge la classification et des mémoires d'exemple."

    def handle(self, *args, **opts):
        random.seed(7)
        doms = {}
        for i, (nom, slug, icone, couleur) in enumerate(DOMAINES):
            doms[slug], _ = Domaine.objects.update_or_create(
                slug=slug, defaults={"nom": nom, "icone": icone, "couleur": couleur, "ordre": i})
        fils = {}
        for nom, sigle, dslug, niveaux, ordre in FILIERES:
            fils[(sigle, niveaux[0])], _ = Filiere.objects.update_or_create(
                nom=nom, domaine=doms[dslug], defaults={"sigle": sigle, "niveaux": niveaux, "ordre": ordre})
        if Memoire.objects.exists():
            self.stdout.write("Mémoires déjà présents : rien à faire.")
            return
        for k, (titre, sigle, niveau, mots) in enumerate(SUJETS):
            fil = next(f for (s, _), f in fils.items() if s == sigle)
            aut, _ = Personne.objects.get_or_create(nom=AUTEURS[k % len(AUTEURS)])
            dire, _ = Personne.objects.get_or_create(nom=random.choice(DIRECTEURS))
            annee = {L: random.randint(2019, 2025), M: random.randint(2018, 2026), D: random.randint(2015, 2023)}[niveau]
            m = Memoire(titre=titre, auteur=aut, directeur=dire, annee=annee, niveau=niveau, filiere=fil,
                        resume=RESUME, mots_cles=mots, couleur=COULEURS[k % len(COULEURS)],
                        statut=Statut.PUBLIE, depot_physique_verifie=True, depot_numerique_verifie=True,
                        date_verification=timezone.now().date(), publie_le=timezone.now())
            m.save()
            nb = random.randint(10, 18)
            m.fichier.save(f"memoire-{m.pk}.pdf", ContentFile(pdf(titre, aut.nom, nb)))
            m.nb_pages = nb
            m.save(update_fields=["nb_pages"])
        # un brouillon pour le tableau de bord
        self.stdout.write(f"{Memoire.objects.count()} mémoires créés.")
