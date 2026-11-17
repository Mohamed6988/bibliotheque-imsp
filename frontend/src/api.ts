import { useCallback, useEffect, useState } from "react";

export type DomaineMini = { id: number; nom: string; slug: string; couleur: string; icone: string };
export type Memoire = {
  id: number;
  titre: string;
  auteur: string;
  directeur: string;
  annee: number;
  niveau: "Licence" | "Master" | "Doctorat";
  type_document: "Mémoire" | "Thèse";
  filiere: { id: number; nom: string; sigle: string };
  domaine: DomaineMini;
  nb_pages: number;
  couleur: string;
  resume?: string;
  mots_cles?: string[];
};
export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type Personne = { id: number; nom: string };
export type Facettes = {
  domaines: { slug: string; nom: string; icone: string; couleur: string; count: number }[];
  niveaux: { nom: string; count: number }[];
  filieres: { id: number; nom: string; sigle: string; domaine: string; niveaux: string[]; count: number }[];
};

const TOKEN_KEY = "imsp_token";
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible */
  }
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
  ) {
    super(
      typeof data?.detail === "string"
        ? data.detail
        : data && typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : `Erreur ${status}`,
    );
  }
}

export function query(params: Record<string, string | number | undefined | (string | number)[]>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api${path}`, { method: opts.method || "GET", headers, body });
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event("imsp-logout"));
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** Envoi multipart avec progression (fichier PDF). */
export function upload<T = any>(
  path: string,
  method: "POST" | "PATCH",
  form: FormData,
  onProgress: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Token ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* vide */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError(0, { detail: "Réseau indisponible." }));
    xhr.send(form);
  });
}

/** Charge `path` (null = ne rien charger). `reload()` force un nouveau chargement. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    api<T>(path)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const initiales = (nom: string) =>
  nom
    .replace(/^(Pr\.|Dr)\s+/, "")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export type Filters = {
  q: string;
  domaines: string[];
  niveaux: string[];
  filieres: number[];
  anneeMin: number;
  anneeMax: number;
  auteur: string;
  directeur: string;
  tri: string;
  page: number;
};
export const YEAR_MIN = 2015;
export const YEAR_MAX = new Date().getFullYear();
export const defaultFilters: Filters = {
  q: "",
  domaines: [],
  niveaux: [],
  filieres: [],
  anneeMin: YEAR_MIN,
  anneeMax: YEAR_MAX,
  auteur: "",
  directeur: "",
  tri: "recent",
  page: 1,
};
export function filtersToParams(f: Filters, withPaging = true) {
  return {
    q: f.q,
    domaine: f.domaines,
    niveau: f.niveaux,
    filiere: f.filieres,
    annee_min: f.anneeMin !== YEAR_MIN ? f.anneeMin : undefined,
    annee_max: f.anneeMax !== YEAR_MAX ? f.anneeMax : undefined,
    auteur: f.auteur,
    directeur: f.directeur,
    ...(withPaging ? { tri: f.tri, page: f.page > 1 ? f.page : undefined } : {}),
  };
}
