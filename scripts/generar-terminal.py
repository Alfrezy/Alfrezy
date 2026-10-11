#!/usr/bin/env python3
"""Genera assets/terminal.svg: tarjeta estilo terminal con tu foto hecha de puntos.

Uso:
    pip install pillow
    python scripts/generar-terminal.py                 # usa assets/avatar.png
    python scripts/generar-terminal.py mi-foto.jpg     # usa otra foto

Edita el diccionario DATOS de abajo con tu información y vuelve a ejecutarlo.
"""
from __future__ import annotations

import sys
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageEnhance, ImageOps

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "assets" / "terminal.svg"

# ---------------------------------------------------------------- EDITA AQUÍ
USUARIO = "alfrezy"
DATOS = {
    "INFO.SISTEMA": [
        ("Sujeto", "Frezzy (Alfrezy)"),
        ("Rol", "Estudiante · Programación e IoT"),
        ("Ubicación", "Santa Tecla · El Salvador"),
        ("Estado", "Construyendo · Aprendiendo · Subiendo"),
    ],
    "STACK.PRINCIPAL": [
        ("Lenguajes", "Java · HTML · JavaScript · C · C++ · C# · Python"),
        ("Hardware", "ESP32-CAM · ESP32 · Redes neuronales"),
        ("Herramientas", "Git · GitHub · Docker · PostgreSQL · VSCode · Arduino IDE"),
    ],
    "ENLACES.CONTACTO": [
        ("GitHub", "@Alfrezy"),
        ("Proyecto", "Mini Wall-E"),
    ],
}
MENSAJE_FINAL = "Listo. Abierto a retos."
RECORTE = (0.08, 0.0, 0.92, 0.72)  # encuadre de la foto (izq, arriba, der, abajo); None = completa
GAMMA = 1.9                        # más alto = fondo más oscuro
# ------------------------------------------------------------------------------

ANCHO, ALTO = 1180, 560
PANEL_X, PANEL_Y, PANEL_W, PANEL_H = 50, 112, 458, 388
COLUMNAS, FILAS = 70, 59
PALETA = ["#0e4f63", "#0e7490", "#0891b2", "#22d3ee", "#67e8f9", "#cffafe"]


def puntos_retrato(ruta: Path) -> str:
    img = Image.open(ruta).convert("RGB")
    if RECORTE:  # fracción (izq, arriba, der, abajo) para encuadrar la cara
        w, h = img.size
        img = img.crop((int(RECORTE[0] * w), int(RECORTE[1] * h), int(RECORTE[2] * w), int(RECORTE[3] * h)))
    img = ImageOps.fit(img.convert("L"), (COLUMNAS, FILAS), Image.LANCZOS)
    img = ImageOps.autocontrast(img, cutoff=1)
    # Curva gamma: oscurece los tonos medios y deja brillar lo importante
    img = img.point(lambda v: int(255 * (v / 255) ** GAMMA))
    img = ImageEnhance.Contrast(img).enhance(1.3)
    celda_x, celda_y = PANEL_W / COLUMNAS, PANEL_H / FILAS
    cubos: list[list[str]] = [[] for _ in PALETA]
    for j in range(FILAS):
        for i in range(COLUMNAS):
            v = img.getpixel((i, j)) / 255
            if v < 0.12:
                continue
            r = 0.55 + v * 2.1
            cx = PANEL_X + (i + 0.5) * celda_x
            cy = PANEL_Y + (j + 0.5) * celda_y
            k = min(int(v * len(PALETA)), len(PALETA) - 1)
            cubos[k].append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.2f}"/>')
    return "".join(
        f'<g fill="{c}">{"".join(items)}</g>' for c, items in zip(PALETA, cubos) if items
    )


def texto_derecha() -> str:
    x0, y, paso = 548, 126, 24
    xv = x0 + 166
    partes: list[str] = []
    t = 0.9  # segundo en que empieza a escribirse la primera línea
    n = 0
    for titulo, filas in DATOS.items():
        y += 6
        partes.append(
            f'<text x="{x0}" y="{y}" class="sec" opacity="0">{escape(titulo)}'
            f'<animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.2s" fill="freeze"/></text>'
            f'<line x1="{x0 + len(titulo) * 8.4 + 14:.0f}" y1="{y - 4}" x2="1128" y2="{y - 4}" '
            f'class="lin" opacity="0"><animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.2s" fill="freeze"/></line>'
        )
        t += 0.2
        y += paso
        for etiqueta, valor in filas:
            n += 1
            ancho = max(len(valor) * 8.4 + 10, 40)
            dur = max(len(valor) * 0.025, 0.3)
            partes.append(
                f'<text x="{x0}" y="{y}" class="eti" opacity="0">{escape(etiqueta)}'
                f'<animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.15s" fill="freeze"/></text>'
                f'<text x="{x0 + 108}" y="{y}" class="pun" opacity="0">······'
                f'<animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.15s" fill="freeze"/></text>'
                f'<clipPath id="c{n}"><rect x="{xv}" y="{y - 16}" width="0" height="22">'
                f'<animate attributeName="width" from="0" to="{ancho:.0f}" begin="{t:.2f}s" dur="{dur:.2f}s" fill="freeze"/></rect></clipPath>'
                f'<text x="{xv}" y="{y}" class="val" clip-path="url(#c{n})">{escape(valor)}</text>'
            )
            t += dur + 0.05
            y += paso
        y += 4
    y += 6
    partes.append(
        f'<text x="{x0}" y="{y}" class="eti" opacity="0">SISTEMA'
        f'<animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.2s" fill="freeze"/></text>'
        f'<text x="{x0 + 108}" y="{y}" class="pun" opacity="0">······'
        f'<animate attributeName="opacity" to="1" begin="{t:.2f}s" dur="0.2s" fill="freeze"/></text>'
        f'<text x="{xv}" y="{y}" class="ok" opacity="0">{escape(MENSAJE_FINAL)}'
        f'<animate attributeName="opacity" to="1" begin="{t + 0.2:.2f}s" dur="0.2s" fill="freeze"/></text>'
    )
    y += 30
    partes.append(
        f'<rect x="{x0}" y="{y - 14}" width="9" height="17" fill="#22d3ee" opacity="0">'
        f'<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.01;0.5;0.51;1" dur="1.1s" begin="{t + 0.5:.2f}s" repeatCount="indefinite"/></rect>'
    )
    return "".join(partes)


def construir(ruta_foto: Path) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO}" height="{ALTO}" viewBox="0 0 {ANCHO} {ALTO}" role="img" aria-labelledby="t d">
  <title id="t">Perfil de Frezzy en una terminal animada</title>
  <desc id="d">Retrato hecho de puntos e información del perfil con efecto de escritura.</desc>
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050816"/><stop offset=".55" stop-color="#0b1120"/><stop offset="1" stop-color="#050816"/>
    </linearGradient>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"><animate attributeName="stop-color" values="#22d3ee;#8b5cf6;#10b981;#22d3ee" dur="8s" repeatCount="indefinite"/></stop>
      <stop offset="1" stop-color="#8b5cf6"><animate attributeName="stop-color" values="#8b5cf6;#10b981;#22d3ee;#8b5cf6" dur="8s" repeatCount="indefinite"/></stop>
    </linearGradient>
    <linearGradient id="barrido" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#67e8f9" stop-opacity="0"/>
      <stop offset=".5" stop-color="#67e8f9" stop-opacity=".30"/>
      <stop offset="1" stop-color="#67e8f9" stop-opacity="0"/>
    </linearGradient>
    <pattern id="lineas" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#22d3ee" opacity=".035"/></pattern>
    <clipPath id="marco"><rect x="34" y="94" width="490" height="422" rx="12"/></clipPath>
    <style>
      text {{ font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace; font-size: 14px; }}
      .tit {{ fill: #64748b; font-size: 12px; }}
      .rot {{ fill: #22d3ee; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; }}
      .sec {{ fill: #8b5cf6; font-size: 12px; font-weight: 700; letter-spacing: 1px; }}
      .eti {{ fill: #22d3ee; font-weight: 700; }}
      .pun {{ fill: #334155; }}
      .val {{ fill: #e2e8f0; }}
      .ok  {{ fill: #10b981; }}
      .lin {{ stroke: #1e293b; stroke-width: 1; }}
    </style>
  </defs>

  <rect x="14" y="14" width="{ANCHO - 28}" height="{ALTO - 28}" rx="18" fill="url(#fondo)" stroke="url(#neon)" stroke-width="2"/>
  <rect x="14" y="14" width="{ANCHO - 28}" height="{ALTO - 28}" rx="18" fill="url(#lineas)"/>

  <circle cx="40" cy="40" r="6" fill="#ef4444"/><circle cx="62" cy="40" r="6" fill="#f59e0b"/><circle cx="84" cy="40" r="6" fill="#10b981"/>
  <text x="{ANCHO // 2}" y="44" text-anchor="middle" class="tit">{escape(USUARIO)}@github ~ % ./perfil --en-vivo</text>
  <circle cx="1060" cy="40" r="4" fill="#10b981"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>
  <text x="1072" y="44" class="tit" style="font-size:11px">EN LÍNEA</text>

  <rect x="34" y="94" width="490" height="422" rx="12" fill="#07101f" stroke="#1e3a5f"/>
  <text x="50" y="108" class="rot">FOTO.PERFIL // EN VIVO</text>
  <g clip-path="url(#marco)">
    {puntos_retrato(ruta_foto)}
    <rect x="34" y="-60" width="490" height="60" fill="url(#barrido)">
      <animate attributeName="y" values="80;520" dur="4.5s" repeatCount="indefinite"/>
    </rect>
  </g>

  <rect x="534" y="94" width="612" height="422" rx="12" fill="#07101f" stroke="#1e3a5f"/>
  <text x="548" y="108" class="rot">PERFIL.DATOS</text>
  {texto_derecha()}
</svg>
'''


if __name__ == "__main__":
    foto = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "assets" / "avatar.png"
    SALIDA.write_text(construir(foto), encoding="utf-8")
    print(f"Listo: {SALIDA} ({SALIDA.stat().st_size // 1024} KB)")
