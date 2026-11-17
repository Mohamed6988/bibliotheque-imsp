import { useEffect, useRef, useState } from "react";
import logoImsp from "./assets/logo-imsp.jpeg";
import batimentImsp from "./assets/imsp-batiment.png";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Archive,
  ArchiveRestore,
  Atom,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BookOpenText,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Database,
  Eye,
  EyeOff,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  FolderArchive,
  GraduationCap,
  Home,
  Library,
  List,
  LockKeyhole,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  Minus,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  ApiError,
  YEAR_MAX,
  YEAR_MIN,
  api,
  defaultFilters,
  filtersToParams,
  getToken,
  initiales,
  query,
  setToken,
  upload,
  useApi,
  useDebounced,
  type DomaineMini,
  type Facettes,
  type Filters,
  type Memoire,
  type Page,
  type Personne,
} from "./api";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type View = "home" | "catalogue" | "detail" | "reader" | "login" | "dashboard" | "about" | "contact";
type AdminTab = "overview" | "theses" | "add" | "classification" | "archives" | "activity";
type GoArg = { id?: number; filters?: Partial<Filters>; from?: View };
type Go = (v: View, arg?: GoArg) => void;

const ICONS: Record<string, any> = { BarChart3, Database, Atom, Sparkles };
const iconFor = (name: string) => ICONS[name] || Sparkles;
const NIVEAUX = ["Licence", "Master", "Doctorat"];
const STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  verifie: "Vérifié",
  publie: "Publié",
  archive: "Archivé",
};
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const nombre = (n: number) => n.toLocaleString("fr-FR");

type Gestion = {
  id: number;
  titre: string;
  auteur: number;
  auteur_nom: string;
  directeur: number;
  directeur_nom: string;
  annee: number;
  niveau: string;
  filiere: number;
  filiere_nom: string;
  domaine: DomaineMini;
  resume: string;
  mots_cles: string[];
  nb_pages: number;
  fichier_present: boolean;
  statut: string;
  depot_physique_verifie: boolean;
  depot_numerique_verifie: boolean;
  date_verification: string | null;
  cree_le: string;
  publie_le: string | null;
};
type GDomaine = { id: number; nom: string; slug: string; icone: string; couleur: string; archive: boolean; nb_filieres: number };
type GFiliere = { id: number; nom: string; sigle: string; domaine: number; domaine_nom: string; niveaux: string[]; archive: boolean };

function useClassification() {
  const d = useApi<GDomaine[]>("/gestion/domaines/");
  const f = useApi<GFiliere[]>("/gestion/filieres/");
  return {
    domaines: d.data || [],
    filieres: f.data || [],
    loading: d.loading || f.loading,
    reload: () => {
      d.reload();
      f.reload();
    },
  };
}

function Toast({ msg, onClose, error }: { msg: string; onClose: () => void; error?: boolean }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  return (
    <div className="toast" role="status" style={error ? { borderLeftColor: "#D64545" } : undefined}>
      {error ? <X /> : <CheckCircle2 />}
      <div>
        <strong>{error ? "Action impossible" : "Terminé"}</strong>
        <span>{msg}</span>
      </div>
      <button onClick={onClose}>
        <X />
      </button>
    </div>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo" aria-label="IMSP Bibliothèque numérique">
      <img className="logo-mark" src={logoImsp} alt="Logo de l’IMSP" width={compact ? 38 : 46} height={compact ? 38 : 46} />
      {!compact && (
        <div>
          <strong>IMSP</strong>
          <span>Bibliothèque numérique</span>
        </div>
      )}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  icon: Icon,
  onClick,
  disabled,
  type = "button",
  className = "",
}: any) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {Icon && <Icon size={17} />} {children}
    </button>
  );
}

function Header({ go, active = "home" }: { go: Go; active?: View }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  return (
    <header className={`site-header ${dark ? "header-dark" : ""}`}>
      <div className="container nav-wrap">
        <button className="reset-button" onClick={() => go("home")}>
          <Logo />
        </button>
        <nav className={open ? "nav-open" : ""}>
          <button
            className={active === "home" ? "active" : ""}
            onClick={() => {
              go("home");
              setOpen(false);
            }}
          >
            Accueil
          </button>
          <button
            className={active === "catalogue" ? "active" : ""}
            onClick={() => {
              go("catalogue");
              setOpen(false);
            }}
          >
            Catalogue
          </button>
          <button
            className={active === "about" ? "active" : ""}
            onClick={() => {
              go("about");
              setOpen(false);
            }}
          >
            À propos
          </button>
          <button
            className={active === "contact" ? "active" : ""}
            onClick={() => {
              go("contact");
              setOpen(false);
            }}
          >
            Contact
          </button>
          <a href="https://imsp-uac.org" target="_blank">
            Retour au site IMSP <ArrowRight size={14} />
          </a>
        </nav>
        <div className="nav-actions">
          <button
            className="icon-btn theme-button"
            aria-label="Changer de thème"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button variant="secondary" icon={LockKeyhole} onClick={() => go("login")}>
            Espace bibliothécaire
          </Button>
          <button className="icon-btn menu-button" aria-label="Menu" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchBox({
  onSearch,
  initial = "",
}: {
  onSearch: (q: string) => void;
  initial?: string;
}) {
  const [query, setQuery] = useState(initial);
  return (
    <form
      className="main-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query);
      }}
    >
      <Search size={22} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par titre, auteur, mot-clé…"
        aria-label="Rechercher"
      />
      <Button type="submit" icon={Search}>
        Rechercher
      </Button>
    </form>
  );
}

function Footer({ go }: { go?: Go }) {
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>La mémoire scientifique de l’IMSP, accessible à tous.</p>
        </div>
        <div>
          <h4>Institut</h4>
          <p>
            Dangbo, Porto-Novo
            <br />
            République du Bénin
          </p>
        </div>
        <div>
          <h4>Nous contacter</h4>
          <p>
            bibliotheque@imsp-uac.org
            <br />
            +229 01 97 00 00 00
          </p>
        </div>
        <div>
          <h4>Liens utiles</h4>
          <button onClick={() => go?.("about")}>À propos</button>
          <button onClick={() => go?.("contact")}>Contact</button>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 IMSP-UAC. Tous droits réservés.</span>
        <span>Conçu pour la recherche et le savoir.</span>
      </div>
    </footer>
  );
}

function ThesisCover({ thesis, large = false }: { thesis: Memoire; large?: boolean }) {
  return (
    <div className={`thesis-cover ${large ? "cover-large" : ""}`} style={{ "--cover": thesis.couleur } as any}>
      <div className="cover-institute">
        <span>UNIVERSITÉ D’ABOMEY-CALAVI</span>
        <strong>IMSP</strong>
      </div>
      <div className="cover-rule" />
      <h4>{thesis.titre}</h4>
      <p>{thesis.niveau === "Doctorat" ? "THÈSE DE DOCTORAT" : `${thesis.niveau.toUpperCase()} · MÉMOIRE`}</p>
      <div className="cover-seal">
        <GraduationCap size={large ? 32 : 24} />
      </div>
      <small>
        {thesis.auteur}
        <br />
        {thesis.annee}
      </small>
    </div>
  );
}

function ThesisCard({ thesis, go }: { thesis: Memoire; go: Go }) {
  const open = () => go("detail", { id: thesis.id });
  return (
    <article
      className="thesis-card"
      onClick={open}
      tabIndex={0}
      role="link"
      onKeyDown={(e) => e.key === "Enter" && open()}
    >
      <ThesisCover thesis={thesis} />
      <div className="thesis-card-body">
        <div className="card-classification">
          <span className="domain-tag">
            <i style={{ background: thesis.domaine.couleur }} />
            {thesis.domaine.nom}
          </span>
          <span className="level-badge">{thesis.niveau}</span>
          <span className="track-badge">{thesis.filiere.sigle || thesis.filiere.nom}</span>
        </div>
        <h3>{thesis.titre}</h3>
        <div className="meta-row">
          <UserRound size={15} />
          <span>{thesis.auteur}</span>
        </div>
        <div className="meta-row">
          <GraduationCap size={15} />
          <span>Dir. {thesis.directeur}</span>
        </div>
        <div className="card-bottom">
          <span>
            <CalendarDays size={15} /> {thesis.annee} · {thesis.type_document}
          </span>
          <Button variant="ghost">
            Voir le détail <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function CardsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="thesis-grid catalogue-grid" aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="thesis-card skeleton" key={i} style={{ minHeight: 360 }} />
      ))}
    </div>
  );
}

type Accueil = {
  stats: { memoires: number; domaines: number; auteurs: number; annees: number };
  domaines: Facettes["domaines"];
  recents: Memoire[];
};

function HomePage({ go }: { go: Go }) {
  const { data } = useApi<Accueil>("/accueil/");
  const domaines = data?.domaines || [];
  const total = data?.stats.memoires ?? 0;
  const byDomain = (slug: string) => go("catalogue", { filters: { domaines: [slug] } });
  return (
    <>
      <Header go={go} active="home" />
      <main>
        <section className="hero">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="container hero-content">
            <div className="eyebrow">
              <Library size={16} /> Bibliothèque officielle de l’IMSP-UAC
            </div>
            <h1>
              Explorez les mémoires
              <br />
              de <em>l’IMSP</em>
            </h1>
            <p>
              Recherchez et consultez en ligne les travaux soutenus à l’Institut, sans vous
              déplacer.
            </p>
            <SearchBox onSearch={(q) => go("catalogue", { filters: { q } })} />
            <div className="quick-search domain-quick-search">
              {domaines.map((d) => {
                const Icon = iconFor(d.icone);
                return (
                  <button key={d.slug} onClick={() => byDomain(d.slug)}>
                    <Icon size={15} />
                    <span>{d.nom}</span>
                    <small>{d.count}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <section className="container stats-grid">
          {[
            [data ? nombre(data.stats.memoires) : "—", "Mémoires disponibles", FileText],
            [data ? nombre(data.stats.domaines) : "—", "Domaines", BookOpen],
            [data ? nombre(data.stats.auteurs) : "—", "Auteurs", UsersRound],
            [data ? nombre(data.stats.annees) : "—", "Années couvertes", CalendarDays],
          ].map(([value, label, Icon]: any) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon">
                <Icon size={22} />
              </div>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </section>
        <section className="section container">
          <div className="section-head">
            <div>
              <span className="kicker">Nouvelles publications</span>
              <h2>Derniers mémoires publiés</h2>
            </div>
            <button onClick={() => go("catalogue")}>
              Voir tout le catalogue <ArrowRight size={17} />
            </button>
          </div>
          {data ? (
            <div className="thesis-grid">
              {data.recents.map((t) => (
                <ThesisCard thesis={t} go={go} key={t.id} />
              ))}
            </div>
          ) : (
            <CardsSkeleton />
          )}
        </section>
        <section className="section specialty-section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="kicker">Disciplines</span>
                <h2>Parcourir par domaine</h2>
              </div>
            </div>
            <div className="specialty-grid">
              {domaines.map((d) => {
                const Icon = iconFor(d.icone);
                return (
                  <button className="specialty-tile" key={d.slug} onClick={() => byDomain(d.slug)}>
                    <div>
                      <Icon size={24} />
                    </div>
                    <strong>{d.nom}</strong>
                    <span>{d.count} documents</span>
                    <ArrowRight size={18} />
                  </button>
                );
              })}
            </div>
            <div className="catalogue-cta">
              <div>
                <span>{total ? `${nombre(total)} travaux scientifiques` : "Travaux scientifiques"}</span>
                <h2>Toute la recherche de l’IMSP, à portée de clic.</h2>
              </div>
              <Button icon={BookOpen} onClick={() => go("catalogue")}>
                Accéder au catalogue complet
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer go={go} />
    </>
  );
}

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
        <ChevronLeft />
      </button>
      {pageList(page, total).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`}>…</span>
        ) : (
          <button key={p} className={p === page ? "active" : ""} onClick={() => onPage(p)}>
            {p}
          </button>
        ),
      )}
      <button disabled={page >= total} onClick={() => onPage(page + 1)} aria-label="Page suivante">
        <ChevronRight />
      </button>
    </div>
  );
}

function CataloguePage({ go, initial }: { go: Go; initial?: Partial<Filters> }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [f, setF] = useState<Filters>({ ...defaultFilters, ...initial });
  const patch = (p: Partial<Filters>) => setF((cur) => ({ ...cur, page: 1, ...p }));
  const { data, loading } = useApi<Page<Memoire>>(`/catalogue/${query(filtersToParams(f) as any)}`);
  const fac = useApi<Facettes>(`/catalogue/facettes/${query(filtersToParams(f, false) as any)}`).data;
  const filieres = fac?.filieres || [];
  const compatible = (fil: Facettes["filieres"][0], domaines: string[], niveaux: string[]) =>
    (!domaines.length || domaines.includes(fil.domaine)) &&
    (niveaux.length ? fil.niveaux.some((n) => niveaux.includes(n)) : fil.niveaux.some((n) => n !== "Licence"));
  const prune = (domaines: string[], niveaux: string[]) =>
    f.filieres.filter((id) => {
      const fil = filieres.find((x) => x.id === id);
      return !fil || compatible(fil, domaines, niveaux);
    });
  const toggle = <T,>(v: T, list: T[]) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const toggleDomaine = (slug: string) => {
    const domaines = toggle(slug, f.domaines);
    patch({ domaines, filieres: prune(domaines, f.niveaux) });
  };
  const toggleNiveau = (n: string) => {
    const niveaux = toggle(n, f.niveaux);
    patch({ niveaux, filieres: prune(f.domaines, niveaux) });
  };
  const resetFilters = () => setF({ ...defaultFilters, tri: f.tri });
  const total = data?.count ?? 0;
  const nbPages = Math.ceil(total / 9);

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(f.q ? [{ key: "q", label: `« ${f.q} »`, remove: () => patch({ q: "" }) }] : []),
    ...f.domaines.map((s) => ({
      key: `d${s}`,
      label: fac?.domaines.find((d) => d.slug === s)?.nom || s,
      remove: () => toggleDomaine(s),
    })),
    ...f.niveaux.map((n) => ({ key: `n${n}`, label: n, remove: () => toggleNiveau(n) })),
    ...f.filieres.map((id) => ({
      key: `f${id}`,
      label: filieres.find((x) => x.id === id)?.sigle || filieres.find((x) => x.id === id)?.nom || `Filière ${id}`,
      remove: () => patch({ filieres: f.filieres.filter((x) => x !== id) }),
    })),
    ...(f.anneeMin !== YEAR_MIN || f.anneeMax !== YEAR_MAX
      ? [
          {
            key: "y",
            label: f.anneeMin === f.anneeMax ? `${f.anneeMin}` : `${f.anneeMin}–${f.anneeMax}`,
            remove: () => patch({ anneeMin: YEAR_MIN, anneeMax: YEAR_MAX }),
          },
        ]
      : []),
    ...(f.auteur ? [{ key: "a", label: `Auteur : ${f.auteur}`, remove: () => patch({ auteur: "" }) }] : []),
    ...(f.directeur
      ? [{ key: "dir", label: `Dir. : ${f.directeur}`, remove: () => patch({ directeur: "" }) }]
      : []),
  ];

  const filiereItems = filieres.filter((x) => compatible(x, f.domaines, f.niveaux));
  const niveauxLabel = f.niveaux.map((n) => n.toLowerCase()).join(" / ");

  return (
    <>
      <Header go={go} active="catalogue" />
      <main className="catalogue-page">
        <div className="page-banner">
          <div className="container">
            <span className="breadcrumb">
              <button onClick={() => go("home")}>Accueil</button>
              <ChevronRight size={14} /> Catalogue
            </span>
            <h1>Catalogue des mémoires</h1>
            <p>Explorez la collection scientifique de l’Institut.</p>
            <SearchBox key={f.q} initial={f.q} onSearch={(q) => patch({ q })} />
          </div>
        </div>
        <div className="container catalogue-layout">
          <aside className={filterOpen ? "filters open" : "filters"}>
            <div className="filter-title">
              <div>
                <SlidersHorizontal size={18} />
                <strong>Filtres</strong>
              </div>
              <button onClick={() => setFilterOpen(false)} aria-label="Fermer les filtres">
                <X size={20} />
              </button>
            </div>
            <div className="mobile-sheet-handle" />
            <FilterGroup title="Domaine disciplinaire" defaultOpen>
              {(fac?.domaines || []).map((d) => {
                const checked = f.domaines.includes(d.slug);
                const disabled = d.count === 0 && !checked;
                return (
                  <label
                    className={`check-row domain-check ${disabled ? "disabled" : ""}`}
                    key={d.slug}
                    title={disabled ? (niveauxLabel ? `Pas de ${niveauxLabel} dans ce domaine` : "Aucun résultat") : ""}
                  >
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleDomaine(d.slug)} />
                    <span>
                      <i style={{ background: d.couleur }} />
                      {d.nom}
                    </span>
                    <small>{d.count}</small>
                  </label>
                );
              })}
            </FilterGroup>
            <FilterGroup title="Niveau d’études" defaultOpen>
              <div className="level-segments">
                {NIVEAUX.map((n) => (
                  <button
                    className={f.niveaux.includes(n) ? "active" : ""}
                    key={n}
                    title={`${fac?.niveaux.find((x) => x.nom === n)?.count ?? 0} résultats`}
                    onClick={() => toggleNiveau(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Filière / Option" defaultOpen>
              <div className="track-groups">
                <div className="track-group">
                  {filiereItems.map((t) => {
                    const checked = f.filieres.includes(t.id);
                    const disabled = t.count === 0 && !checked;
                    return (
                      <label className={`check-row ${disabled ? "disabled" : ""}`} key={t.id}>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={checked}
                          onChange={() => patch({ filieres: toggle(t.id, f.filieres) })}
                        />
                        <span>{t.nom}</span>
                        <small>{t.count}</small>
                      </label>
                    );
                  })}
                  {!filiereItems.length && <small>Aucune filière pour cette sélection.</small>}
                </div>
              </div>
            </FilterGroup>
            <FilterGroup title="Année de soutenance" defaultOpen>
              <div className="dual-range">
                <div className="range-track" />
                <input
                  type="range"
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  value={f.anneeMin}
                  aria-label="Année minimale"
                  onChange={(e) => patch({ anneeMin: Math.min(Number(e.target.value), f.anneeMax) })}
                />
                <input
                  type="range"
                  min={YEAR_MIN}
                  max={YEAR_MAX}
                  value={f.anneeMax}
                  aria-label="Année maximale"
                  onChange={(e) => patch({ anneeMax: Math.max(Number(e.target.value), f.anneeMin) })}
                />
              </div>
              <div className="year-inputs">
                <label>
                  <span>De</span>
                  <input
                    type="number"
                    min={YEAR_MIN}
                    max={YEAR_MAX}
                    value={f.anneeMin}
                    onChange={(e) =>
                      patch({ anneeMin: Math.min(Math.max(Number(e.target.value) || YEAR_MIN, YEAR_MIN), f.anneeMax) })
                    }
                  />
                </label>
                <i>—</i>
                <label>
                  <span>À</span>
                  <input
                    type="number"
                    min={YEAR_MIN}
                    max={YEAR_MAX}
                    value={f.anneeMax}
                    onChange={(e) =>
                      patch({ anneeMax: Math.max(Math.min(Number(e.target.value) || YEAR_MAX, YEAR_MAX), f.anneeMin) })
                    }
                  />
                </label>
              </div>
            </FilterGroup>
            <FilterGroup title="Auteur">
              <Autocomplete placeholder="Rechercher un auteur" role="auteur" value={f.auteur} onPick={(auteur) => patch({ auteur })} />
            </FilterGroup>
            <FilterGroup title="Directeur de mémoire">
              <Autocomplete
                placeholder="Rechercher un directeur"
                role="directeur"
                value={f.directeur}
                onPick={(directeur) => patch({ directeur })}
              />
            </FilterGroup>
            <Button variant="ghost" icon={Trash2} onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
            <div className="mobile-filter-footer">
              <button onClick={resetFilters}>Réinitialiser</button>
              <Button onClick={() => setFilterOpen(false)}>Voir les {total} résultats</Button>
            </div>
          </aside>
          {filterOpen && <div className="drawer-overlay" onClick={() => setFilterOpen(false)} />}
          <section className="catalogue-results">
            <div className="results-toolbar">
              <div>
                <strong>
                  {total} résultat{total > 1 ? "s" : ""}
                </strong>
                <span>dans la bibliothèque numérique</span>
              </div>
              <div>
                <Button variant="secondary" icon={Filter} className="mobile-filter" onClick={() => setFilterOpen(true)}>
                  Filtres
                  {!!chips.length && <i className="filter-badge">{chips.length}</i>}
                </Button>
                <label>
                  Trier par{" "}
                  <select value={f.tri} onChange={(e) => setF({ ...f, tri: e.target.value, page: 1 })}>
                    <option value="recent">Plus récents</option>
                    <option value="titre">Titre A–Z</option>
                    <option value="annee">Année</option>
                  </select>
                </label>
              </div>
            </div>
            {!!chips.length && (
              <div className="active-filters">
                {chips.map((c) => (
                  <button key={c.key} onClick={c.remove} aria-label={`Retirer le filtre ${c.label}`}>
                    {c.label}
                    <X size={14} />
                  </button>
                ))}
                <button className="clear" onClick={resetFilters}>
                  Tout effacer
                </button>
              </div>
            )}
            {!data && loading ? (
              <CardsSkeleton />
            ) : data && data.results.length ? (
              <div className="thesis-grid catalogue-grid" style={{ opacity: loading ? 0.6 : 1 }}>
                {data.results.map((t) => (
                  <ThesisCard thesis={t} go={go} key={t.id} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div>
                  <Search size={28} />
                </div>
                <h2>Aucun mémoire ne correspond à vos critères</h2>
                <p>Modifiez votre sélection ou réinitialisez les filtres pour voir tous les travaux.</p>
                <Button onClick={resetFilters}>Réinitialiser les filtres</Button>
              </div>
            )}
            <Pagination
              page={f.page}
              total={nbPages}
              onPage={(page) => {
                setF({ ...f, page });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </section>
        </div>
      </main>
      <Footer go={go} />
    </>
  );
}

function FilterGroup({ title, children, defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`filter-group ${open ? "expanded" : ""}`}>
      <button className="filter-heading" onClick={() => setOpen(!open)} aria-expanded={open}>
        {title}
        <ChevronDown size={17} />
      </button>
      <div className="filter-content">{children}</div>
    </div>
  );
}

function Autocomplete({
  placeholder,
  role,
  value,
  onPick,
}: {
  placeholder: string;
  role: "auteur" | "directeur";
  value: string;
  onPick: (nom: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const dq = useDebounced(text, 200);
  const { data } = useApi<Personne[]>(open ? `/personnes/${query({ q: dq, role })}` : null);
  return (
    <div className="autocomplete" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <label className="mini-search">
        <Search size={16} />
        <input
          placeholder={placeholder}
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (!e.target.value) onPick("");
          }}
        />
      </label>
      {open && (
        <div className="autocomplete-menu">
          <small>Suggestions</small>
          {(data || []).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick(p.nom);
                setText(p.nom);
                setOpen(false);
              }}
            >
              <i>{initiales(p.nom)}</i>
              <span>{p.nom}</span>
              <small>{role === "auteur" ? "Auteur" : "Directeur"}</small>
            </button>
          ))}
          {data && !data.length && <small>Aucun résultat</small>}
        </div>
      )}
    </div>
  );
}

function MiniSearch({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mini-search">
      <Search size={16} />
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function DetailPage({ go, id }: { go: Go; id: number }) {
  const { data: t, error } = useApi<Memoire>(`/memoires/${id}/`);
  const sim = useApi<Memoire[]>(`/memoires/${id}/similaires/`).data || [];
  const [expanded, setExpanded] = useState(false);
  if (error)
    return (
      <>
        <Header go={go} active="catalogue" />
        <main className="detail-page">
          <div className="container empty-state">
            <h2>Ce mémoire est introuvable</h2>
            <p>Il n’est peut-être plus disponible dans le catalogue.</p>
            <Button onClick={() => go("catalogue")}>Retour au catalogue</Button>
          </div>
        </main>
        <Footer go={go} />
      </>
    );
  if (!t)
    return (
      <>
        <Header go={go} active="catalogue" />
        <main className="detail-page">
          <div className="container" style={{ minHeight: 400 }} aria-busy="true" />
        </main>
      </>
    );
  const byDomaine = () => go("catalogue", { filters: { domaines: [t.domaine.slug] } });
  const byFiliere = () => go("catalogue", { filters: { domaines: [t.domaine.slug], filieres: [t.filiere.id] } });
  const doc = t.type_document.toLowerCase();
  return (
    <>
      <Header go={go} active="catalogue" />
      <main className="detail-page">
        <div className="container">
          <div className="detail-breadcrumb">
            <button onClick={() => go("home")}>Accueil</button>
            <ChevronRight />
            <button onClick={() => go("catalogue")}>Catalogue</button>
            <ChevronRight />
            <span>{t.titre.length > 40 ? `${t.titre.slice(0, 40)}…` : t.titre}</span>
          </div>
          <div className="detail-hero">
            <div className="detail-cover-wrap">
              <ThesisCover thesis={t} large />
              <span>
                <FileText size={15} /> {t.nb_pages} pages
              </span>
            </div>
            <div className="detail-content">
              <div className="detail-classification">
                <button onClick={byDomaine}>{t.domaine.nom}</button>
                <ChevronRight size={14} />
                <button onClick={byFiliere}>{t.filiere.sigle || t.filiere.nom}</button>
              </div>
              <h1>{t.titre}</h1>
              <p className="detail-author">
                Par <strong>{t.auteur}</strong>
              </p>
              <div className="detail-meta">
                <div>
                  <Library />
                  <span>
                    Domaine<strong>{t.domaine.nom}</strong>
                  </span>
                </div>
                <div>
                  <BookOpen />
                  <span>
                    Filière<strong>{t.filiere.nom}</strong>
                  </span>
                </div>
                <div>
                  <GraduationCap />
                  <span>
                    Niveau<strong>{t.niveau}</strong>
                  </span>
                </div>
                <div>
                  <CalendarDays />
                  <span>
                    Année de soutenance<strong>{t.annee}</strong>
                  </span>
                </div>
                <div>
                  <UserRound />
                  <span>
                    Auteur<strong>{t.auteur}</strong>
                  </span>
                </div>
                <div>
                  <CircleUserRound />
                  <span>
                    Directeur<strong>{t.directeur}</strong>
                  </span>
                </div>
              </div>
              <div className="reader-action">
                <Button icon={BookOpen} onClick={() => go("reader", { id: t.id, from: "detail" })}>
                  Consulter le {doc}
                </Button>
                <p>
                  <LockKeyhole size={14} /> Consultation en ligne uniquement. Le téléchargement n’est pas autorisé.
                </p>
              </div>
            </div>
          </div>
          <div className="detail-sections">
            <section>
              <h2>Résumé</h2>
              <div className={expanded ? "abstract expanded" : "abstract"}>
                <p>{t.resume || "Aucun résumé disponible."}</p>
              </div>
              <button className="read-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Réduire" : "Lire la suite"} <ChevronDown size={16} />
              </button>
            </section>
            <section>
              <h2>Mots-clés</h2>
              <div className="keywords">
                {(t.mots_cles || []).map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
            </section>
          </div>
          {!!sim.length && (
            <section className="section similar">
              <div className="section-head">
                <h2>Mémoires similaires</h2>
                <button onClick={byFiliere}>
                  Voir plus <ArrowRight />
                </button>
              </div>
              <div className="thesis-grid">
                {sim.slice(0, 3).map((t2) => (
                  <ThesisCard thesis={t2} go={go} key={t2.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer go={go} />
    </>
  );
}

function PdfPage({ doc, n, width, ratio }: { doc: PDFDocumentProxy; n: number; width: number; ratio: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "900px" });
    if (holder.current) io.observe(holder.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    let task: any;
    let dead = false;
    (async () => {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      if (!c || dead) return;
      c.width = vp.width;
      c.height = vp.height;
      c.style.width = `${width}px`;
      c.style.height = `${vp.height / dpr}px`;
      task = page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => {
      dead = true;
      task?.cancel();
    };
  }, [seen, doc, n, width]);
  return (
    <div ref={holder} className="pdf-sheet" data-page={n} style={{ width, height: width * ratio }}>
      <canvas ref={canvas} />
      <div className="watermark">IMSP – Bibliothèque numérique</div>
    </div>
  );
}

function ReaderPage({ go, id, from }: { go: Go; id: number; from?: View }) {
  const meta = useApi<Memoire>(`/memoires/${id}/`).data;
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(90);
  const [panel, setPanel] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(800);

  useEffect(() => {
    let dead = false;
    let task: ReturnType<typeof pdfjs.getDocument> | null = null;
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`/api/memoires/${id}/lire/`, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        if (!res.ok) throw new Error("Document indisponible.");
        task = pdfjs.getDocument({ data: await res.arrayBuffer() });
        const d = await task.promise;
        const p1 = await d.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
        if (dead) return;
        setRatio(vp.height / vp.width);
        setDoc(d);
      } catch (e: any) {
        if (!dead) setErr(e.message || "Impossible de charger le document.");
      }
    })();
    return () => {
      dead = true;
      task?.destroy();
    };
  }, [id]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Dissuasion : pas d'impression / d'enregistrement / de menu contextuel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["p", "s"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const n = doc?.numPages ?? meta?.nb_pages ?? 0;
  const width = Math.max(240, Math.min((720 * zoom) / 100, stageW - (stageW < 700 ? 24 : 70)));
  const sheet = (p: number) => stage.current?.querySelector<HTMLElement>(`[data-page="${p}"]`);
  const goto = (p: number) => {
    const target = Math.min(Math.max(1, p), n || 1);
    setPage(target);
    const el = sheet(target);
    if (el && stage.current) stage.current.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = stage.current;
    if (!el) return;
    let cur = 1;
    el.querySelectorAll<HTMLElement>(".pdf-sheet").forEach((s) => {
      if (s.offsetTop - el.scrollTop <= el.clientHeight * 0.4) cur = Number(s.dataset.page);
    });
    setPage(cur);
  };
  const titre = meta?.titre || `Document n° ${id}`;
  const back = () => go(from === "dashboard" ? "dashboard" : "detail", { id });

  return (
    <main className="reader" onContextMenu={(e) => e.preventDefault()}>
      <div className="reader-bar">
        <button className="icon-btn" onClick={back} aria-label="Retour">
          <ArrowLeft />
        </button>
        <Logo compact />
        <div className="reader-title">
          <strong>{titre}</strong>
          <span>{meta ? `${meta.auteur} · ${meta.annee}` : ""}</span>
        </div>
        <div className="page-control">
          <button onClick={() => goto(page - 1)} aria-label="Page précédente">
            <ChevronLeft />
          </button>
          <span>
            {page} / {n || "–"}
          </span>
          <button onClick={() => goto(page + 1)} aria-label="Page suivante">
            <ChevronRight />
          </button>
        </div>
        <div className="reader-tools">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom arrière">
            <Minus />
          </button>
          <span>{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))} aria-label="Zoom avant">
            <Plus />
          </button>
          <button title="Ajuster à la largeur" onClick={() => setZoom(Math.round(((stageW - 70) / 720) * 100))}>
            <PanelLeftClose />
          </button>
          <button
            title="Plein écran"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}
          >
            <Maximize2 />
          </button>
          <button title="Pages" onClick={() => setPanel(!panel)}>
            <List />
          </button>
        </div>
      </div>
      <div className="reader-body">
        <aside className={panel ? "thumb-panel" : "thumb-panel closed"}>
          <div>
            <strong>Pages</strong>
            <button onClick={() => setPanel(false)} aria-label="Fermer le panneau">
              <PanelLeftClose />
            </button>
          </div>
          {Array.from({ length: n }, (_, i) => i + 1).map((p) => (
            <button key={p} className={page === p ? "thumb active" : "thumb"} onClick={() => goto(p)}>
              <span>
                <i>IMSP</i>
                <b>{p === 1 ? "Couverture" : `Page ${p}`}</b>
              </span>
              <small>{p}</small>
            </button>
          ))}
        </aside>
        <div className="pdf-stage" ref={stage} onScroll={onScroll}>
          {n > 0 && <div className="floating-page">{page} / {n}</div>}
          {err && <p style={{ color: "#fff" }}>{err}</p>}
          {!doc && !err && <p style={{ color: "#cfd6de" }}>Chargement du document…</p>}
          {doc && (
            <div className="pdf-col">
              {Array.from({ length: doc.numPages }, (_, i) => (
                <PdfPage key={i + 1} doc={doc} n={i + 1} width={width} ratio={ratio} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function LoginPage({ go }: { go: Go }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>("/auth/login/", { method: "POST", body: { email, password } });
      setToken(r.token);
      go("dashboard");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Serveur injoignable. Réessayez plus tard.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-page">
      <button className="login-back" onClick={() => go("home")}>
        <ArrowLeft /> Retour à la bibliothèque
      </button>
      <section className="login-visual">
        <img src={batimentImsp} alt="Bâtiment de l’IMSP" />
        <div className="login-overlay">
          <Logo />
          <p>Institut de Mathématiques et de Sciences Physiques</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-login-logo">
            <Logo />
          </div>
          <span className="kicker">Accès sécurisé</span>
          <h1>Espace bibliothécaire</h1>
          <p>Connectez-vous pour gérer le catalogue des mémoires.</p>
          {error && (
            <div className="error-banner" role="alert">
              <X size={18} />
              <div>
                <strong>Connexion impossible</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
          <label className="form-field">
            <span>Adresse e-mail</span>
            <div>
              <Mail />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@imsp-uac.org"
              />
            </div>
          </label>
          <label className="form-field">
            <span>Mot de passe</span>
            <div>
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Afficher le mot de passe">
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          <Button className="full" type="submit" disabled={busy}>
            {busy ? "Connexion…" : "Se connecter"} <ArrowRight />
          </Button>
          <div className="security-note">
            <ShieldCheck />
            <span>Connexion sécurisée et réservée au personnel autorisé.</span>
          </div>
        </form>
      </section>
    </main>
  );
}

function AdminShell({ go }: { go: Go }) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState<Gestion | null>(null);
  const me = useApi<{ email: string }>("/auth/me/").data;
  const counts = useApi<Page<Gestion>>(`/gestion/memoires/${query({ statut: ["brouillon", "verifie"] })}`).data;
  const email = me?.email || "";
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const logout = async () => {
    try {
      await api("/auth/logout/", { method: "POST" });
    } catch {
      /* session déjà expirée */
    }
    setToken(null);
    go("home");
  };
  const open = (t: AdminTab) => {
    if (t !== "add") setEditing(null);
    setTab(t);
    setMenu(false);
  };
  const titles: Record<AdminTab, string> = {
    overview: "Tableau de bord",
    theses: "Gestion des mémoires",
    add: editing ? "Modifier un mémoire" : "Ajouter un mémoire",
    classification: "Classification",
    archives: "Archives",
    activity: "Journal d’activité",
  };
  return (
    <main className="admin">
      <aside className={menu ? "admin-sidebar open" : "admin-sidebar"}>
        <div className="admin-brand">
          <Logo />
          <button onClick={() => setMenu(false)} aria-label="Fermer le menu">
            <X />
          </button>
        </div>
        <nav>
          <AdminNav icon={Home} label="Tableau de bord" active={tab === "overview"} onClick={() => open("overview")} />
          <AdminNav
            icon={FileText}
            label="Mémoires"
            badge={counts?.count ? String(counts.count) : undefined}
            active={tab === "theses"}
            onClick={() => open("theses")}
          />
          <AdminNav icon={FilePlus2} label="Ajouter un mémoire" active={tab === "add"} onClick={() => open("add")} />
          <AdminNav icon={SlidersHorizontal} label="Classification" active={tab === "classification"} onClick={() => open("classification")} />
          <AdminNav icon={FolderArchive} label="Archives" active={tab === "archives"} onClick={() => open("archives")} />
          <AdminNav icon={Clock3} label="Journal d’activité" active={tab === "activity"} onClick={() => open("activity")} />
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut /> Déconnexion
        </button>
      </aside>
      {menu && <div className="drawer-overlay" onClick={() => setMenu(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="icon-btn admin-menu" onClick={() => setMenu(true)} aria-label="Ouvrir le menu">
            <Menu />
          </button>
          <div>
            <h2>{titles[tab]}</h2>
            <span style={{ textTransform: "capitalize" }}>{today}</span>
          </div>
          <div className="admin-actions">
            <button className="avatar">{initiales(name || "BI")}</button>
            <div>
              <strong style={{ textTransform: "capitalize" }}>{name}</strong>
              <span>Bibliothécaire</span>
            </div>
          </div>
        </header>
        <div className="admin-content">
          {tab === "overview" && <DashboardOverview name={name} onAdd={() => open("add")} onTheses={() => open("activity")} />}
          {tab === "theses" && (
            <ThesesTable
              mode="all"
              go={go}
              onEdit={(m) => {
                setEditing(m);
                setTab("add");
              }}
            />
          )}
          {tab === "add" && <AddThesis key={editing?.id ?? "new"} editing={editing} onDone={() => open("theses")} />}
          {tab === "classification" && <ClassificationPage />}
          {tab === "archives" && <ThesesTable mode="archives" go={go} onEdit={() => {}} />}
          {tab === "activity" && <JournalPage />}
        </div>
      </div>
    </main>
  );
}

function AdminNav({ icon: Icon, label, active, badge, onClick }: any) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon /> <span>{label}</span>
      {badge && <i>{badge}</i>}
    </button>
  );
}

type Dash = {
  kpis: { publies: number; en_attente: number; archives: number; consultations_mois: number };
  consultations: { date: string; n: number }[];
  par_domaine: { domaine: string; n: number }[];
  activites: { id: number; action: string; memoire: string; utilisateur: string; date: string }[];
};

function DashboardOverview({ name, onAdd, onTheses }: { name: string; onAdd: () => void; onTheses: () => void }) {
  const { data } = useApi<Dash>("/gestion/tableau-de-bord/");
  const k = data?.kpis;
  const kpis: any[] = [
    ["Total publiés", k?.publies, "Visibles au public", FileCheck2, "blue"],
    ["En attente de vérification", k?.en_attente, "Brouillons à traiter", Clock3, "gold"],
    ["Archivés", k?.archives, "Conservés hors catalogue", Archive, "purple"],
    ["Consultations ce mois", k?.consultations_mois, "Depuis le 1er du mois", Eye, "green"],
  ];
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1 style={{ textTransform: "capitalize" }}>Bonjour {name.split(" ")[0]},</h1>
          <p>Voici ce qui se passe dans votre bibliothèque aujourd’hui.</p>
        </div>
        <Button icon={Plus} onClick={onAdd}>
          Ajouter un mémoire
        </Button>
      </div>
      <div className="kpi-grid">
        {kpis.map(([label, value, trend, Icon, color]) => (
          <div className="kpi-card" key={label}>
            <div className={`kpi-icon ${color}`}>
              <Icon />
            </div>
            <span>{label}</span>
            <strong>{value === undefined ? "—" : nombre(value)}</strong>
            <small>{trend}</small>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="admin-card chart-card">
          <div className="card-heading">
            <div>
              <h3>Évolution des consultations</h3>
              <p>Au cours des 30 derniers jours</p>
            </div>
          </div>
          <LineChart points={data?.consultations || []} />
        </section>
        <section className="admin-card chart-card">
          <div className="card-heading">
            <div>
              <h3>Mémoires par domaine</h3>
              <p>Répartition des publications</p>
            </div>
          </div>
          <BarChart rows={data?.par_domaine || []} />
        </section>
      </div>
      <section className="admin-card activities">
        <div className="card-heading">
          <div>
            <h3>Dernières activités</h3>
            <p>Mises à jour récentes du catalogue</p>
          </div>
          <button onClick={onTheses}>
            Voir tout <ArrowRight />
          </button>
        </div>
        {(data?.activites || []).map((a) => (
          <div className="activity-row" key={a.id}>
            <span className="activity-avatar">{initiales(a.utilisateur || "SY")}</span>
            <p>
              <strong>{a.utilisateur.split("@")[0] || "Système"}</strong> · {a.action}
              {a.memoire ? ` — ${a.memoire}` : ""}
            </p>
            <time>{fmtDateTime(a.date)}</time>
          </div>
        ))}
        {data && !data.activites.length && <p style={{ padding: 16 }}>Aucune activité pour le moment.</p>}
      </section>
    </>
  );
}

function LineChart({ points }: { points: { date: string; n: number }[] }) {
  const max = Math.max(4, ...points.map((p) => p.n));
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * 600 : 0);
  const y = (v: number) => 170 - (v / max) * 150;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.n).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(max * (1 - r)));
  const labels = points.length
    ? [0, 0.25, 0.5, 0.75, 1].map((r) => points[Math.round(r * (points.length - 1))].date)
    : [];
  return (
    <div className="line-chart">
      <div className="y-labels">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="chart-area">
        <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Consultations par jour">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B3A6F" stopOpacity=".2" />
              <stop offset="100%" stopColor="#0B3A6F" stopOpacity="0" />
            </linearGradient>
          </defs>
          {line && <path className="area-path" d={`${line} L600,180 L0,180Z`} />}
          {line && <path className="line-path" d={line} />}
          {last && <circle cx="600" cy={y(last.n)} r="5" />}
        </svg>
        <div className="x-labels">
          {labels.map((d, i) => (
            <span key={i}>{new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarChart({ rows }: { rows: { domaine: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="bar-chart">
      {rows.map((r) => (
        <div key={r.domaine}>
          <span>{r.domaine}</span>
          <i>
            <b style={{ width: `${(r.n / max) * 100}%` }} />
          </i>
          <strong>{r.n}</strong>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUTS[status] || status;
  return (
    <span className={`status ${label.toLowerCase().replace("é", "e")}`}>
      <i />
      {label}
    </span>
  );
}

function JournalPage() {
  const [page, setPage] = useState(1);
  const { data } = useApi<Page<Dash["activites"][0]>>(`/gestion/journal/${query({ page: page > 1 ? page : undefined })}`);
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Journal d’activité</h1>
          <p>Historique des actions effectuées sur le catalogue.</p>
        </div>
      </div>
      <section className="admin-card activities">
        {(data?.results || []).map((a) => (
          <div className="activity-row" key={a.id}>
            <span className="activity-avatar">{initiales(a.utilisateur || "SY")}</span>
            <p>
              <strong>{a.utilisateur.split("@")[0] || "Système"}</strong> · {a.action}
              {a.memoire ? ` — ${a.memoire}` : ""}
            </p>
            <time>{fmtDateTime(a.date)}</time>
          </div>
        ))}
        {data && !data.results.length && <p style={{ padding: 16 }}>Aucune activité.</p>}
      </section>
      <Pagination page={page} total={Math.ceil((data?.count || 0) / 20)} onPage={setPage} />
    </>
  );
}

function ThesesTable({ mode, go, onEdit }: { mode: "all" | "archives"; go: Go; onEdit: (m: Gestion) => void }) {
  const cls = useClassification();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [niveau, setNiveau] = useState("");
  const [domaine, setDomaine] = useState("");
  const [filiere, setFiliere] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<number[]>([]);
  const [bulk, setBulk] = useState("");
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const params = {
    q: dq,
    niveau,
    domaine,
    filiere,
    statut: mode === "archives" ? "archive" : statut,
    page: page > 1 ? page : undefined,
  };
  const { data, loading, reload } = useApi<Page<Gestion>>(`/gestion/memoires/${query(params)}`);
  const rows = data?.results || [];
  useEffect(() => setSel([]), [dq, niveau, domaine, filiere, statut, page, data]);
  const filiereOptions = cls.filieres.filter(
    (x) => !x.archive && x.domaine_nom && cls.domaines.find((d) => d.slug === domaine)?.nom === x.domaine_nom && (!niveau || x.niveaux.includes(niveau)),
  );
  const domaineOk = (d: GDomaine) =>
    !d.archive && (!niveau || cls.filieres.some((x) => !x.archive && x.domaine_nom === d.nom && x.niveaux.includes(niveau)));

  const run = async (path: string, ok: string) => {
    try {
      await api(path, { method: "POST" });
      setToast({ msg: ok });
      reload();
    } catch (e: any) {
      setToast({ msg: e.message, error: true });
    }
  };
  const applyBulk = async () => {
    if (!bulk || !sel.length) return;
    try {
      const r = await api<{ erreurs: { id: number; detail: string }[] }>("/gestion/memoires/lot/", {
        method: "POST",
        body: { ids: sel, action: bulk },
      });
      setToast(r.erreurs.length ? { msg: r.erreurs[0].detail, error: true } : { msg: "Action appliquée." });
      setBulk("");
      reload();
    } catch (e: any) {
      setToast({ msg: e.message, error: true });
    }
  };
  const allChecked = rows.length > 0 && sel.length === rows.length;
  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{mode === "archives" ? "Archives" : "Gestion des mémoires"}</h1>
          <p>
            {mode === "archives"
              ? "Les mémoires archivés sont conservés mais n’apparaissent plus dans le catalogue public."
              : "Recherchez, modifiez et publiez les travaux déposés."}
          </p>
        </div>
      </div>
      <section className="admin-card table-card">
        <div className="table-toolbar">
          <MiniSearch placeholder="Rechercher un titre ou un auteur…" value={q} onChange={(v) => (setQ(v), setPage(1))} />
          <div className="table-classification-filters">
            <select
              value={niveau}
              aria-label="Niveau"
              onChange={(e) => {
                setNiveau(e.target.value);
                setFiliere("");
                setPage(1);
              }}
            >
              <option value="">Tous les niveaux</option>
              {NIVEAUX.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <select
              value={domaine}
              aria-label="Domaine"
              onChange={(e) => {
                setDomaine(e.target.value);
                setFiliere("");
                setPage(1);
              }}
            >
              <option value="">Tous les domaines</option>
              {cls.domaines.map((d) => (
                <option key={d.slug} value={d.slug} disabled={!domaineOk(d)}>
                  {d.nom}
                </option>
              ))}
            </select>
            <select
              value={filiere}
              aria-label="Filière"
              disabled={!domaine}
              onChange={(e) => (setFiliere(e.target.value), setPage(1))}
            >
              <option value="">{domaine ? "Toutes les filières" : "Choisir un domaine"}</option>
              {filiereOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nom}
                </option>
              ))}
            </select>
            {mode === "all" && (
              <select value={statut} aria-label="Statut" onChange={(e) => (setStatut(e.target.value), setPage(1))}>
                <option value="">Tous les statuts</option>
                {["publie", "verifie", "brouillon"].map((s) => (
                  <option key={s} value={s}>
                    {STATUTS[s]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="bulk-bar">
          <label>
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])}
            />{" "}
            {sel.length} sélectionné{sel.length > 1 ? "s" : ""}
          </label>
          <select value={bulk} onChange={(e) => setBulk(e.target.value)} aria-label="Actions groupées">
            <option value="">Actions groupées</option>
            {mode === "all" ? (
              <>
                <option value="publier">Publier</option>
                <option value="archiver">Archiver</option>
              </>
            ) : (
              <option value="restaurer">Restaurer</option>
            )}
          </select>
          {bulk && sel.length > 0 && (
            <Button variant="secondary" onClick={applyBulk}>
              Appliquer
            </Button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th />
                <th>Titre</th>
                <th>Auteur</th>
                <th>Année</th>
                <th>Domaine / Filière</th>
                <th>Niveau</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody style={{ opacity: loading ? 0.6 : 1 }}>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={sel.includes(m.id)}
                      aria-label={`Sélectionner ${m.titre}`}
                      onChange={(e) => setSel(e.target.checked ? [...sel, m.id] : sel.filter((x) => x !== m.id))}
                    />
                  </td>
                  <td>
                    <strong>{m.titre}</strong>
                    <small>Créé le {fmtDate(m.cree_le)}</small>
                  </td>
                  <td>{m.auteur_nom}</td>
                  <td>{m.annee}</td>
                  <td>
                    <strong className="table-domain">{m.domaine.nom}</strong>
                    <small>{m.filiere_nom}</small>
                  </td>
                  <td>
                    <span className="level-badge">{m.niveau}</span>
                  </td>
                  <td>
                    <StatusBadge status={m.statut} />
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        title={m.fichier_present ? "Voir" : "Aucun fichier"}
                        disabled={!m.fichier_present}
                        onClick={() => go("reader", { id: m.id, from: "dashboard" })}
                      >
                        <Eye />
                      </button>
                      {mode === "all" && (
                        <button title="Modifier" onClick={() => onEdit(m)}>
                          <Pencil />
                        </button>
                      )}
                      {m.statut === "verifie" && (
                        <button title="Publier" onClick={() => run(`/gestion/memoires/${m.id}/publier/`, "Mémoire publié.")}>
                          <CheckCircle2 />
                        </button>
                      )}
                      {m.statut === "archive" ? (
                        <button title="Restaurer" onClick={() => run(`/gestion/memoires/${m.id}/restaurer/`, "Mémoire restauré en brouillon.")}>
                          <ArchiveRestore />
                        </button>
                      ) : (
                        <button title="Archiver" onClick={() => run(`/gestion/memoires/${m.id}/archiver/`, "Mémoire archivé.")}>
                          <Archive />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data && !rows.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                    Aucun mémoire ne correspond à ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-pagination">
          <span>
            {data ? `${data.count} mémoire${data.count > 1 ? "s" : ""}` : "Chargement…"}
          </span>
          <Pagination page={page} total={Math.ceil((data?.count || 0) / 9)} onPage={setPage} />
        </div>
      </section>
      {toast && <Toast msg={toast.msg} error={toast.error} onClose={() => setToast(null)} />}
    </>
  );
}

function ClassModal({ title, children, onClose, onSave, error, saving }: any) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <form
        className="modal form-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <h2>{title}</h2>
        <div className="form-grid">{children}</div>
        {error && (
          <p role="alert" style={{ color: "#D64545" }}>
            {error}
          </p>
        )}
        <div>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}

function ClassificationPage() {
  const cls = useClassification();
  const [modal, setModal] = useState<null | { kind: "domaine" | "filiere"; item: any }>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const actifs = cls.domaines.filter((d) => !d.archive);

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    setError("");
    const { kind, item } = modal;
    const path = `/gestion/${kind === "domaine" ? "domaines" : "filieres"}/`;
    try {
      await api(item.id ? `${path}${item.id}/` : path, { method: item.id ? "PATCH" : "POST", body: item });
      setModal(null);
      cls.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const patchRow = async (path: string, body: any) => {
    try {
      await api(path, { method: "PATCH", body });
      cls.reload();
    } catch (e: any) {
      setToast(e.message);
    }
  };
  const archive = async (path: string) => {
    await api(path, { method: "DELETE" });
    cls.reload();
  };
  const set = (k: string, v: any) => setModal((m) => (m ? { ...m, item: { ...m.item, [k]: v } } : m));

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Classification</h1>
          <p>Gérez les domaines, les filières et les niveaux d’études associés.</p>
        </div>
        <Button icon={Plus} onClick={() => setModal({ kind: "domaine", item: { nom: "", couleur: "#0B3A6F", icone: "BarChart3" } })}>
          Ajouter un domaine
        </Button>
      </div>
      <div className="classification-admin-grid">
        <section className="admin-card managed-list">
          <div className="card-heading">
            <div>
              <h3>Domaines</h3>
              <p>{actifs.length} domaines actifs</p>
            </div>
          </div>
          {cls.domaines.map((d) => {
            const Icon = iconFor(d.icone);
            return (
              <div className="managed-row" key={d.id} style={{ opacity: d.archive ? 0.5 : 1 }}>
                <span className="managed-icon" style={{ color: d.couleur, background: `${d.couleur}12` }}>
                  <Icon />
                </span>
                <div>
                  <strong>{d.nom}</strong>
                  <small>
                    {d.nb_filieres} filière{d.nb_filieres > 1 ? "s" : ""}
                    {d.archive ? " · archivé" : ""}
                  </small>
                </div>
                <div className="row-actions">
                  <button title="Modifier" onClick={() => setModal({ kind: "domaine", item: { ...d } })}>
                    <Pencil />
                  </button>
                  {d.archive ? (
                    <button title="Restaurer" onClick={() => patchRow(`/gestion/domaines/${d.id}/`, { archive: false })}>
                      <ArchiveRestore />
                    </button>
                  ) : (
                    <button title="Archiver" onClick={() => archive(`/gestion/domaines/${d.id}/`)}>
                      <Archive />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
        <section className="admin-card managed-list tracks-managed">
          <div className="card-heading">
            <div>
              <h3>Filières</h3>
              <p>{cls.filieres.filter((f) => !f.archive).length} filières configurées</p>
            </div>
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => setModal({ kind: "filiere", item: { nom: "", sigle: "", domaine: actifs[0]?.id, niveaux: ["Master"] } })}
            >
              Ajouter
            </Button>
          </div>
          {cls.filieres.map((f) => (
            <div className="managed-row managed-track-row" key={f.id} style={{ opacity: f.archive ? 0.5 : 1 }}>
              <div>
                <span className="managed-domain">{f.domaine_nom}</span>
                <strong>{f.nom}</strong>
                <div className="level-checks">
                  {NIVEAUX.map((n) => (
                    <label key={n}>
                      <input
                        type="checkbox"
                        checked={f.niveaux.includes(n)}
                        disabled={f.archive}
                        onChange={(e) => {
                          const niveaux = e.target.checked ? [...f.niveaux, n] : f.niveaux.filter((x) => x !== n);
                          if (!niveaux.length) return setToast("Une filière doit avoir au moins un niveau.");
                          patchRow(`/gestion/filieres/${f.id}/`, { niveaux });
                        }}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </div>
              <div className="row-actions">
                <button title="Modifier" onClick={() => setModal({ kind: "filiere", item: { ...f } })}>
                  <Pencil />
                </button>
                {f.archive ? (
                  <button title="Restaurer" onClick={() => patchRow(`/gestion/filieres/${f.id}/`, { archive: false })}>
                    <ArchiveRestore />
                  </button>
                ) : (
                  <button title="Archiver" onClick={() => archive(`/gestion/filieres/${f.id}/`)}>
                    <Archive />
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
      {modal && (
        <ClassModal
          title={`${modal.item.id ? "Modifier" : "Ajouter"} ${modal.kind === "domaine" ? "un domaine" : "une filière"}`}
          onClose={() => setModal(null)}
          onSave={save}
          error={error}
          saving={saving}
        >
          <label className="span-2">
            Nom *<input required value={modal.item.nom} onChange={(e) => set("nom", e.target.value)} />
          </label>
          {modal.kind === "domaine" ? (
            <>
              <label>
                Icône
                <select value={modal.item.icone} onChange={(e) => set("icone", e.target.value)}>
                  <option value="BarChart3">Graphique</option>
                  <option value="Database">Données</option>
                  <option value="Atom">Atome</option>
                  <option value="Sparkles">Étoiles</option>
                </select>
              </label>
              <label>
                Couleur
                <input type="color" value={modal.item.couleur} onChange={(e) => set("couleur", e.target.value)} />
              </label>
            </>
          ) : (
            <>
              <label>
                Sigle (court)
                <input value={modal.item.sigle} onChange={(e) => set("sigle", e.target.value)} />
              </label>
              <label>
                Domaine *
                <select required value={modal.item.domaine} onChange={(e) => set("domaine", Number(e.target.value))}>
                  {actifs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </label>
              <div className="span-2 level-checks">
                {NIVEAUX.map((n) => (
                  <label key={n}>
                    <input
                      type="checkbox"
                      checked={modal.item.niveaux.includes(n)}
                      onChange={(e) =>
                        set("niveaux", e.target.checked ? [...modal.item.niveaux, n] : modal.item.niveaux.filter((x: string) => x !== n))
                      }
                    />
                    {n}
                  </label>
                ))}
              </div>
            </>
          )}
        </ClassModal>
      )}
      {toast && <Toast msg={toast} error onClose={() => setToast(null)} />}
    </>
  );
}

function PersonSelect({ role, value, onChange }: { role: "auteur" | "directeur"; value: Personne | null; onChange: (p: Personne) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value?.nom || "");
  const dq = useDebounced(text, 200);
  const { data } = useApi<Personne[]>(open ? `/personnes/${query({ q: dq, role })}` : null);
  const exact = (data || []).some((p) => p.nom.toLowerCase() === text.trim().toLowerCase());
  const add = async () => {
    const p = await api<Personne>("/gestion/personnes/", { method: "POST", body: { nom: text.trim() } });
    onChange(p);
    setText(p.nom);
    setOpen(false);
  };
  return (
    <div className="person-select" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <div>
        <Search />
        <input
          value={text}
          placeholder={`Rechercher un ${role}`}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
        />
        <ChevronDown />
      </div>
      {open && (
        <div className="person-options">
          {(data || []).map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => {
                onChange(p);
                setText(p.nom);
                setOpen(false);
              }}
            >
              <i>{initiales(p.nom)}</i>
              <span>{p.nom}</span>
            </button>
          ))}
          {text.trim() && !exact && (
            <button type="button" className="add-person-option" onClick={add}>
              <Plus /> Ajouter « {text.trim()} »
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddThesis({ onDone, editing }: { onDone: () => void; editing: Gestion | null }) {
  const cls = useClassification();
  const thisYear = new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [auteur, setAuteur] = useState<Personne | null>(editing ? { id: editing.auteur, nom: editing.auteur_nom } : null);
  const [directeur, setDirecteur] = useState<Personne | null>(
    editing ? { id: editing.directeur, nom: editing.directeur_nom } : null,
  );
  const [titre, setTitre] = useState(editing?.titre || "");
  const [annee, setAnnee] = useState(editing?.annee || thisYear);
  const [niveau, setNiveau] = useState(editing?.niveau || "");
  const [domaine, setDomaine] = useState(editing?.domaine.slug || "");
  const [filiere, setFiliere] = useState(editing?.filiere || 0);
  const [resume, setResume] = useState(editing?.resume || "");
  const [mots, setMots] = useState<string[]>(editing?.mots_cles || []);
  const [motInput, setMotInput] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [checks, setChecks] = useState([editing?.depot_physique_verifie || false, editing?.depot_numerique_verifie || false]);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const domaineObj = cls.domaines.find((d) => d.slug === domaine);
  const filiereOptions = cls.filieres.filter((f) => !f.archive && f.domaine === domaineObj?.id && f.niveaux.includes(niveau));
  const domaineOk = (d: GDomaine) =>
    !d.archive && cls.filieres.some((f) => !f.archive && f.domaine === d.id && f.niveaux.includes(niveau));
  const info = titre.trim() && auteur && directeur && niveau && domaine && filiere && resume.trim();
  const fileOk = !!fichier || !!editing?.fichier_present;
  const addMot = () => {
    const m = motInput.trim().replace(/,$/, "");
    if (m && !mots.includes(m)) setMots([...mots, m]);
    setMotInput("");
  };
  const pickFile = (f?: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) return setToast({ msg: "Le fichier doit être un PDF.", error: true });
    if (f.size > 100 * 1024 * 1024) return setToast({ msg: "Fichier trop volumineux (100 Mo max).", error: true });
    setFichier(f);
  };

  const save = async (publish: boolean) => {
    setSaving(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.set("titre", titre.trim());
      fd.set("auteur", String(auteur!.id));
      fd.set("directeur", String(directeur!.id));
      fd.set("annee", String(annee));
      fd.set("niveau", niveau);
      fd.set("filiere", String(filiere));
      fd.set("resume", resume.trim());
      fd.set("mots_cles", mots.join(","));
      fd.set("depot_physique_verifie", String(checks[0]));
      fd.set("depot_numerique_verifie", String(checks[1]));
      fd.set("date_verification", checks[0] && checks[1] ? editing?.date_verification || today : "");
      if (fichier) fd.set("fichier", fichier);
      const saved = await upload<Gestion>(editing ? `/gestion/memoires/${editing.id}/` : "/gestion/memoires/", editing ? "PATCH" : "POST", fd, setProgress);
      if (publish) await api(`/gestion/memoires/${saved.id}/publier/`, { method: "POST" });
      setModal(false);
      setToast({ msg: publish ? "Le mémoire est maintenant visible dans le catalogue." : "Brouillon enregistré." });
      setTimeout(onDone, 1500);
    } catch (e: any) {
      setModal(false);
      setToast({ msg: e.message || "Échec de l’enregistrement.", error: true });
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{editing ? "Modifier un mémoire" : "Ajouter un mémoire"}</h1>
          <p>Renseignez les informations puis vérifiez le dépôt avant publication.</p>
        </div>
        <Button variant="secondary" onClick={onDone}>
          Annuler
        </Button>
      </div>
      <div className="stepper">
        {[
          ["Informations", "Métadonnées du mémoire"],
          ["Fichier PDF", "Document à consulter"],
          ["Vérification", "Contrôle et publication"],
        ].map((x, i) => (
          <div className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""} key={x[0]}>
            <span>{step > i + 1 ? <Check /> : i + 1}</span>
            <p>
              <strong>{x[0]}</strong>
              <small>{x[1]}</small>
            </p>
            {i < 2 && <i />}
          </div>
        ))}
      </div>
      <section className="admin-card add-form">
        {step === 1 && (
          <div className="form-step">
            <div className="form-step-head">
              <span>01</span>
              <div>
                <h2>Informations générales</h2>
                <p>Tous les champs marqués d’un astérisque sont obligatoires.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="span-2">
                Titre du mémoire *
                <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Saisir le titre complet du mémoire" />
              </label>
              <label>
                Auteur *
                <PersonSelect role="auteur" value={auteur} onChange={setAuteur} />
              </label>
              <label>
                Directeur de mémoire *
                <PersonSelect role="directeur" value={directeur} onChange={setDirecteur} />
              </label>
              <label>
                Année de soutenance *
                <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
                  {Array.from({ length: thisYear - 1999 }, (_, i) => thisYear - i).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                Niveau *
                <select
                  value={niveau}
                  onChange={(e) => {
                    setNiveau(e.target.value);
                    setFiliere(0);
                    const d = cls.domaines.find((x) => x.slug === domaine);
                    if (d && !cls.filieres.some((f) => !f.archive && f.domaine === d.id && f.niveaux.includes(e.target.value))) setDomaine("");
                  }}
                >
                  <option value="">Sélectionner un niveau</option>
                  {NIVEAUX.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Domaine *
                <select
                  value={domaine}
                  disabled={!niveau}
                  onChange={(e) => {
                    setDomaine(e.target.value);
                    setFiliere(0);
                  }}
                >
                  <option value="">{niveau ? "Sélectionner un domaine" : "Choisissez d’abord un niveau"}</option>
                  {cls.domaines
                    .filter((d) => !d.archive)
                    .map((d) => (
                      <option key={d.id} value={d.slug} disabled={!domaineOk(d)}>
                        {d.nom}
                      </option>
                    ))}
                </select>
              </label>
              <label className="span-2">
                Filière / Option *
                <select value={filiere} disabled={!niveau || !domaine} onChange={(e) => setFiliere(Number(e.target.value))}>
                  <option value={0}>
                    {!niveau || !domaine ? "Choisissez d’abord un niveau et un domaine" : "Sélectionner une filière"}
                  </option>
                  {filiereOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Résumé *
                <textarea
                  value={resume}
                  maxLength={2000}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Présentez le contexte, la méthodologie et les principaux résultats…"
                />
                <small>{resume.length} / 2 000 caractères</small>
              </label>
              <label className="span-2">
                Mots-clés
                <input
                  value={motInput}
                  placeholder="Saisissez un mot-clé puis appuyez sur Entrée"
                  onChange={(e) => setMotInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addMot();
                    }
                  }}
                  onBlur={addMot}
                />
                <div className="keywords">
                  {mots.map((m) => (
                    <span key={m}>
                      {m}{" "}
                      <button type="button" aria-label={`Retirer ${m}`} onClick={() => setMots(mots.filter((x) => x !== m))} style={{ border: 0, background: "none", cursor: "pointer" }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="form-step">
            <div className="form-step-head">
              <span>02</span>
              <div>
                <h2>Fichier du mémoire</h2>
                <p>Ajoutez le PDF qui sera disponible en consultation uniquement.</p>
              </div>
            </div>
            <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
            {!fichier ? (
              <>
                {editing?.fichier_present && (
                  <p>
                    Un fichier est déjà associé à ce mémoire ({editing.nb_pages} pages). Déposez un PDF pour le remplacer.
                  </p>
                )}
                <button
                  type="button"
                  className="dropzone"
                  style={drag ? { borderColor: "#E0A82E" } : undefined}
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <UploadCloud />
                  <strong>Glissez-déposez le fichier PDF ici</strong>
                  <span>
                    ou <u>parcourir vos fichiers</u>
                  </span>
                  <small>PDF uniquement · 100 Mo maximum</small>
                </button>
              </>
            ) : (
              <div className="upload-file">
                <div className="pdf-icon">PDF</div>
                <div>
                  <strong>{fichier.name}</strong>
                  <span>{(fichier.size / 1048576).toFixed(1).replace(".", ",")} Mo · Prêt à être envoyé</span>
                  <i>
                    <b style={{ width: `${progress ?? 0}%` }} />
                  </i>
                </div>
                <CheckCircle2 />
                <button type="button" onClick={() => setFichier(null)} aria-label="Retirer le fichier">
                  <Trash2 />
                </button>
              </div>
            )}
            <div className="upload-notice">
              <LockKeyhole />
              <p>
                <strong>Protection du document</strong>
                <span>Le lecteur n’offre ni téléchargement ni impression.</span>
              </p>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="form-step">
            <div className="form-step-head">
              <span>03</span>
              <div>
                <h2>Vérification du dépôt</h2>
                <p>Confirmez la conformité avant de publier.</p>
              </div>
            </div>
            <div className="review-summary">
              <div>
                <span>Titre</span>
                <strong>{titre}</strong>
              </div>
              <div>
                <span>Auteur</span>
                <strong>{auteur?.nom}</strong>
              </div>
              <div>
                <span>Fichier</span>
                <strong>{fichier?.name || (editing?.fichier_present ? "Fichier existant conservé" : "—")}</strong>
              </div>
            </div>
            <div className="verification-box">
              <h3>Contrôles obligatoires</h3>
              <p>Les deux vérifications sont nécessaires pour activer la publication.</p>
              {["Dépôt physique vérifié", "Dépôt numérique vérifié"].map((x, i) => (
                <label key={x} className={checks[i] ? "verified" : ""}>
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) => {
                      const c = [...checks];
                      c[i] = e.target.checked;
                      setChecks(c);
                    }}
                  />
                  <span>
                    <strong>{x}</strong>
                    <small>
                      {i === 0 ? "L’exemplaire papier est présent et conforme." : "Le PDF est lisible, complet et correctement nommé."}
                    </small>
                  </span>
                  {checks[i] && (
                    <time>
                      <Check /> {fmtDate(editing?.date_verification || today)}
                    </time>
                  )}
                </label>
              ))}
            </div>
            {saving && progress !== null && (
              <div className="upload-file">
                <div>
                  <strong>Enregistrement en cours…</strong>
                  <i>
                    <b style={{ width: `${progress}%` }} />
                  </i>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="form-nav">
          <Button variant="secondary" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || saving}>
            <ArrowLeft /> Précédent
          </Button>
          <div>
            {step === 3 && (
              <Button variant="soft" disabled={saving} onClick={() => save(false)}>
                Enregistrer en brouillon
              </Button>
            )}
            {step < 3 ? (
              <Button disabled={step === 1 ? !info : !fileOk} onClick={() => setStep(step + 1)}>
                Continuer <ArrowRight />
              </Button>
            ) : (
              <Button icon={CheckCircle2} disabled={!checks.every(Boolean) || !fileOk || saving} onClick={() => setModal(true)}>
                Publier
              </Button>
            )}
          </div>
        </div>
      </section>
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">
              <FileCheck2 />
            </div>
            <h2>Publier ce mémoire ?</h2>
            <p>Le mémoire sera immédiatement visible dans le catalogue public et disponible en consultation.</p>
            <div>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Annuler
              </Button>
              <Button disabled={saving} onClick={() => save(true)}>
                Confirmer la publication
              </Button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast.msg} error={toast.error} onClose={() => setToast(null)} />}
    </>
  );
}

function InfoPage({ go, active, title, lead, children }: { go: Go; active: View; title: string; lead: string; children: React.ReactNode }) {
  return (
    <>
      <Header go={go} active={active} />
      <main>
        <div className="page-banner">
          <div className="container">
            <span className="breadcrumb">
              <button onClick={() => go("home")}>Accueil</button>
              <ChevronRight size={14} /> {title}
            </span>
            <h1>{title}</h1>
            <p>{lead}</p>
          </div>
        </div>
        <div className="container info-page">{children}</div>
      </main>
      <Footer go={go} />
    </>
  );
}

function AboutPage({ go }: { go: Go }) {
  return (
    <InfoPage
      go={go}
      active="about"
      title="À propos"
      lead="Les travaux de l’Institut, accessibles à tous."
    >
      <section>
        <h2>Bienvenue à la bibliothèque numérique de l’IMSP</h2>
        <p>
          Bienvenue sur la bibliothèque numérique de l’Institut de Mathématiques et de Sciences Physiques
          (IMSP-UAC), à Dangbo, au Bénin. Vous y trouverez les mémoires et les thèses soutenus à
          l’Institut en mathématiques, en informatique, en physique et dans les disciplines associées,
          consultables en ligne, où que vous soyez.
        </p>
        <p>
          Étudiants, enseignants, chercheurs ou simples visiteurs : explorez le catalogue pour découvrir
          les travaux de nos diplômés, prolonger vos recherches ou vous inspirer pour les vôtres.
        </p>
      </section>
      <section>
        <h2>Comment ça marche</h2>
        <div className="info-grid">
          <div>
            <Search />
            <strong>Rechercher</strong>
            <p>Filtrez par domaine, niveau d’études, filière, année, auteur ou directeur de mémoire.</p>
          </div>
          <div>
            <BookOpen />
            <strong>Consulter en ligne</strong>
            <p>Lisez le document directement dans le lecteur de la bibliothèque, sans rien installer.</p>
          </div>
          <div>
            <ShieldCheck />
            <strong>Des travaux vérifiés</strong>
            <p>
              Seuls les documents dont le dépôt physique et numérique a été vérifié par la bibliothèque
              sont publiés.
            </p>
          </div>
        </div>
      </section>
      <section>
        <h2>Consultation en ligne uniquement</h2>
        <p>
          Pour protéger les droits des auteurs, les documents sont consultables en ligne mais ne sont pas
          téléchargeables. Pour toute demande particulière, rapprochez-vous de la bibliothèque de l’Institut.
        </p>
        <div className="info-actions">
          <Button icon={BookOpen} onClick={() => go("catalogue")}>
            Parcourir le catalogue
          </Button>
          <Button variant="secondary" onClick={() => go("contact")}>
            Nous contacter
          </Button>
        </div>
      </section>
    </InfoPage>
  );
}

function ContactPage({ go }: { go: Go }) {
  return (
    <InfoPage
      go={go}
      active="contact"
      title="Contact"
      lead="Une question sur un mémoire ou sur la plateforme ? Rapprochez-vous de la bibliothèque."
    >
      <div className="info-grid">
        <div>
          <Mail />
          <strong>E-mail</strong>
          <p>
            <a href="mailto:bibliotheque@imsp-uac.org">bibliotheque@imsp-uac.org</a>
          </p>
        </div>
        <div>
          <CircleUserRound />
          <strong>Téléphone</strong>
          <p>
            <a href="tel:+22901970000000">+229 01 97 00 00 00</a>
          </p>
        </div>
        <div>
          <Library />
          <strong>Adresse</strong>
          <p>
            Institut de Mathématiques et de Sciences Physiques
            <br />
            Dangbo, Porto-Novo — République du Bénin
          </p>
        </div>
      </div>
      <section>
        <h2>Vous êtes de la bibliothèque ?</h2>
        <p>L’espace bibliothécaire permet d’ajouter, vérifier et publier les mémoires.</p>
        <div className="info-actions">
          <Button variant="secondary" icon={LockKeyhole} onClick={() => go("login")}>
            Espace bibliothécaire
          </Button>
        </div>
      </section>
    </InfoPage>
  );
}

export default function App() {
  const [nav, setNav] = useState<{ view: View } & GoArg>({ view: "home" });
  const go: Go = (view, arg = {}) => {
    if (view === "login" && getToken()) view = "dashboard";
    setNav({ view, ...arg });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    document.title = "IMSP – Bibliothèque numérique";
    const onLogout = () => setNav({ view: "login" });
    window.addEventListener("imsp-logout", onLogout);
    return () => window.removeEventListener("imsp-logout", onLogout);
  }, []);
  const key = JSON.stringify(nav);
  if (nav.view === "catalogue") return <CataloguePage key={key} go={go} initial={nav.filters} />;
  if (nav.view === "detail" && nav.id) return <DetailPage key={key} go={go} id={nav.id} />;
  if (nav.view === "reader" && nav.id) return <ReaderPage key={key} go={go} id={nav.id} from={nav.from} />;
  if (nav.view === "about") return <AboutPage go={go} />;
  if (nav.view === "contact") return <ContactPage go={go} />;
  if (nav.view === "login") return <LoginPage go={go} />;
  if (nav.view === "dashboard") return getToken() ? <AdminShell go={go} /> : <LoginPage go={go} />;
  return <HomePage go={go} />;
}

