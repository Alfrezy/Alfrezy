#!/usr/bin/env node
// Genera assets/estadisticas.svg (todo en español) con la API GraphQL de GitHub.
//   GH_USERNAME=Alfrezy GH_TOKEN=xxxx node scripts/generar-estadisticas.mjs
//   node scripts/generar-estadisticas.mjs --demo     (datos de ejemplo, sin red)
import fs from "node:fs";
import path from "node:path";

const SALIDA = process.env.OUTPUT_PATH || "assets/estadisticas.svg";
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const COLORES_LENGUAJE = ["#22d3ee", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

const QUERY = `
query($login: String!) {
  user(login: $login) {
    login name createdAt
    repositories(privacy: PUBLIC, ownerAffiliations: OWNER, isFork: false, first: 100) {
      totalCount
      nodes { stargazerCount primaryLanguage { name } }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } }
    }
  }
}`;

async function obtener(login, token) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "perfil-estadisticas" },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
  const j = await r.json();
  if (j.errors?.length) throw new Error(j.errors[0].message);
  if (!j.data?.user) throw new Error(`No se encontró el usuario ${login}`);
  return j.data.user;
}

function demo() {
  const dias = [];
  const hoy = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    dias.push({ date: d.toISOString().slice(0, 10), contributionCount: Math.max(0, Math.round(Math.sin(i / 25) * 4 + 2 + (i % 7 === 0 ? 3 : 0))) });
  }
  return {
    login: "Alfrezy", name: "Frezzy", createdAt: new Date(Date.now() - 2.4 * 365 * 864e5).toISOString(),
    repositories: { totalCount: 9, nodes: [
      ...Array(4).fill({ stargazerCount: 1, primaryLanguage: { name: "Java" } }),
      ...Array(2).fill({ stargazerCount: 0, primaryLanguage: { name: "C" } }),
      { stargazerCount: 1, primaryLanguage: { name: "CSS" } },
      { stargazerCount: 0, primaryLanguage: { name: "Python" } },
      { stargazerCount: 0, primaryLanguage: { name: "C#" } },
    ] },
    contributionsCollection: { totalCommitContributions: 84, totalPullRequestContributions: 3, totalIssueContributions: 0,
      totalRepositoriesWithContributedCommits: 6, contributionCalendar: { totalContributions: dias.reduce((a, d) => a + d.contributionCount, 0), weeks: [{ contributionDays: dias }] } },
  };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

function hace(fecha) {
  const meses = Math.max(0, Math.floor((Date.now() - new Date(fecha)) / (30.44 * 864e5)));
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const a = Math.floor(meses / 12);
  return `hace ${a} ${a === 1 ? "año" : "años"}`;
}

export function porMes(semanas) {
  const dias = semanas.flatMap((s) => s.contributionDays);
  const hoy = new Date();
  const cubos = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    cubos.push({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, etiqueta: MESES[d.getMonth()], total: 0 });
  }
  for (const d of dias) {
    const c = cubos.find((x) => x.clave === d.date.slice(0, 7));
    if (c) c.total += d.contributionCount;
  }
  return cubos;
}

export function lenguajes(repos) {
  const cuenta = new Map();
  for (const r of repos) {
    const n = r.primaryLanguage?.name;
    if (n) cuenta.set(n, (cuenta.get(n) || 0) + 1);
  }
  const orden = [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  const top = orden.slice(0, 5);
  const resto = orden.slice(5).reduce((a, [, v]) => a + v, 0);
  if (resto) top.push(["Otros", resto]);
  return top;
}

export function render(u, esDemo = false) {
  const cc = u.contributionsCollection;
  const meses = porMes(cc.contributionCalendar.weeks);
  const langs = lenguajes(u.repositories.nodes);
  const estrellas = u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0);
  const W = 1000, H = 520;
  const maxMes = Math.max(1, ...meses.map((m) => m.total));

  // Barras mensuales
  const bx = 540, by = 120, bw = 420, bh = 120, paso = bw / 12;
  const barras = meses.map((m, i) => {
    const h = Math.max(2, (m.total / maxMes) * bh);
    return `<rect x="${(bx + i * paso + 4).toFixed(1)}" y="${(by + bh - h).toFixed(1)}" width="${(paso - 8).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="url(#barra)"/>` +
      `<text x="${(bx + i * paso + paso / 2).toFixed(1)}" y="${by + bh + 18}" class="peq" text-anchor="middle">${m.etiqueta}</text>` +
      (m.total ? `<text x="${(bx + i * paso + paso / 2).toFixed(1)}" y="${(by + bh - h - 6).toFixed(1)}" class="peq" fill="#a5f3fc" text-anchor="middle">${m.total}</text>` : "");
  }).join("");

  // Dona de lenguajes
  const totalL = Math.max(1, langs.reduce((a, [, v]) => a + v, 0));
  const cx = 150, cy = 395, R = 62, r = 38;
  let ang = -Math.PI / 2;
  const trozos = langs.map(([, v], i) => {
    const a2 = ang + (v / totalL) * Math.PI * 2 - (langs.length > 1 ? 0.03 : 0);
    const grande = a2 - ang > Math.PI ? 1 : 0;
    const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
    const d = langs.length === 1
      ? `M ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
      : `M ${p(R, ang)} A ${R} ${R} 0 ${grande} 1 ${p(R, a2)} L ${p(r, a2)} A ${r} ${r} 0 ${grande} 0 ${p(r, ang)} Z`;
    ang += (v / totalL) * Math.PI * 2;
    return `<path d="${d}" fill="${COLORES_LENGUAJE[i % COLORES_LENGUAJE.length]}" fill-rule="evenodd"/>`;
  }).join("");
  const leyenda = langs.map(([n, v], i) =>
    `<rect x="250" y="${352 + i * 24}" width="12" height="12" rx="3" fill="${COLORES_LENGUAJE[i % COLORES_LENGUAJE.length]}"/>` +
    `<text x="272" y="${363 + i * 24}" class="val">${esc(n)} <tspan fill="#64748b">· ${Math.round((v / totalL) * 100)}%</tspan></text>`).join("");

  const filas = [
    ["Estrellas recibidas", estrellas], ["Commits (último año)", cc.totalCommitContributions],
    ["Pull requests", cc.totalPullRequestContributions], ["Issues", cc.totalIssueContributions],
    ["Repos con aportes", cc.totalRepositoriesWithContributedCommits],
  ].map(([e, v], i) => `<text x="64" y="${196 + i * 24}" class="eti">${e}</text><text x="330" y="${196 + i * 24}" class="num" text-anchor="end">${v}</text>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">Estadísticas de GitHub de ${esc(u.login)}</title>
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1120"/><stop offset="1" stop-color="#050816"/></linearGradient>
    <linearGradient id="barra" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#67e8f9"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
    <style>
      text { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace; }
      .tit { fill: #e2e8f0; font-size: 22px; font-weight: 700; } .sub { fill: #8b5cf6; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; }
      .eti { fill: #94a3b8; font-size: 14px; } .num { fill: #22d3ee; font-size: 16px; font-weight: 700; }
      .val { fill: #e2e8f0; font-size: 14px; } .peq { fill: #64748b; font-size: 10px; } .gran { fill: #22d3ee; font-size: 34px; font-weight: 700; }
    </style>
  </defs>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="18" fill="url(#fondo)" stroke="#1e3a5f" stroke-width="2"/>
  <text x="40" y="50" class="tit">${esc(u.name || u.login)} <tspan fill="#64748b" font-size="15" font-weight="400">@${esc(u.login)}</tspan></text>
  <text x="40" y="72" class="eti">En GitHub desde ${hace(u.createdAt)} · ${u.repositories.totalCount} repositorios públicos</text>

  <line x1="40" y1="92" x2="${W - 40}" y2="92" stroke="#1e293b"/>
  <text x="40" y="124" class="sub">ESTADÍSTICAS</text>
  <text x="64" y="160" class="gran">${cc.contributionCalendar.totalContributions}</text>
  <text x="${64 + String(cc.contributionCalendar.totalContributions).length * 21 + 10}" y="160" class="eti">contribuciones en el último año</text>
  ${filas}

  <text x="540" y="104" class="sub">CONTRIBUCIONES POR MES</text>
  ${barras}

  <line x1="40" y1="308" x2="${W - 40}" y2="308" stroke="#1e293b"/>
  <text x="40" y="330" class="sub">LENGUAJES MÁS USADOS (POR REPOSITORIO)</text>
  ${trozos}${leyenda}
  <text x="540" y="360" class="sub">ACTIVIDAD</text>
  <text x="540" y="392" class="eti">Cada barra suma tus contribuciones públicas</text>
  <text x="540" y="414" class="eti">del mes. Se actualiza sola cada día con</text>
  <text x="540" y="436" class="eti">GitHub Actions, sin servicios externos.</text>
  <text x="540" y="478" class="peq">${esDemo ? "DATOS DE EJEMPLO · se reemplazan al ejecutar el workflow" : "Actualizado: " + new Date().toISOString().slice(0, 10)}</text>
</svg>
`;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generar-estadisticas.mjs")) {
  const esDemo = process.argv.includes("--demo");
  const login = process.env.GH_USERNAME;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!esDemo && (!login || !token)) { console.error("Faltan GH_USERNAME y GH_TOKEN (o usa --demo)"); process.exit(1); }
  const datos = esDemo ? demo() : await obtener(login, token);
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, render(datos, esDemo), "utf8");
  console.log(`Listo: ${SALIDA}`);
}
