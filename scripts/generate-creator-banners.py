"""Generates the two creator-only banners (public/banners/*.svg) deterministically. Original artwork in code:
Disco Cosmos (a glittering mosaic) and Supernova Haze (a soft nebula with glowing orbs)."""
import math, random, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'banners')

def hexc(c): return '#%02x%02x%02x' % tuple(max(0, min(255, round(v))) for v in c)
def mix(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def blob(x, y, cx, cy, rx, ry): return math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2))

def disco():
    random.seed(1977)
    W, H, P, G = 1200, 420, 12, 1.4  # tile pitch and grout
    cols, rows = W // P, H // P
    violet, deep, blue = rgb('#7b4be6'), rgb('#4a2aa6'), rgb('#5a5ff0')
    peach, orange, pink, magenta, lime, gold = rgb('#ffc09a'), rgb('#ff8c4a'), rgb('#ff6fc8'), rgb('#d63fd0'), rgb('#c8f06a'), rgb('#ffd65c')
    sparkles = [rgb(c) for c in ('#ffe66d', '#7ff0ff', '#ff7ad9', '#ffffff', '#ffb347', '#b8ff6a', '#a98bff', '#ff5a7a', '#4ad8c8', '#ff9a5a', '#c86bff', '#6aa8ff')]
    paths = {}
    for r in range(rows):
        for c in range(cols):
            x, y = (c + .5) / cols, (r + .5) / rows
            col = mix(deep, violet, .55 + .45 * math.sin(x * 5.1 + y * 2.3) * .5 + .25 * blob(x, y, .8, .5, .3, .6))
            col = mix(col, blue, .35 * blob(x, y, .92, .25, .2, .4))
            col = mix(col, peach, .85 * blob(x, y, .48, .58, .13, .22))
            col = mix(col, orange, .45 * blob(x, y, .42, .48, .2, .3))
            col = mix(col, pink, .55 * blob(x, y, .06, .2, .12, .35) + .45 * blob(x, y, .66, .9, .12, .25))
            col = mix(col, magenta, .35 * blob(x, y, .25, .85, .15, .3))
            col = mix(col, lime, .45 * blob(x, y, .3, .18, .07, .2))
            col = mix(col, gold, .4 * blob(x, y, .36, .3, .08, .2))
            col = mix(col, rgb('#ffb04a'), .55 * blob(x, y, .22, .42, .12, .3))
            col = mix(col, rgb('#9cf07a'), .3 * blob(x, y, .18, .3, .08, .2))
            col = mix(col, rgb('#2a1a7a'), .45 * blob(x, y, .78, .62, .18, .4) + .4 * blob(x, y, .98, .95, .15, .2))
            j = random.uniform(-.28, .24)
            col = tuple(v * (1 + j) for v in col)
            roll = random.random()
            if roll < .26:
                s = random.choice(sparkles); col = mix(col, s, random.uniform(.45, .95))
            elif roll < .32:
                col = mix(col, (255, 255, 255), .35)
            q = hexc(tuple(round(v / 8) * 8 for v in col))
            paths.setdefault(q, []).append(f'M{c*P+G/2:.1f} {r*P+G/2:.1f}h{P-G:.1f}v{P-G:.1f}h-{P-G:.1f}z')
    body = ''.join(f'<path fill="{k}" d="{"".join(v)}"/>' for k, v in paths.items())
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
           f'<rect width="{W}" height="{H}" fill="#22163a"/>{body}'
           f'<rect width="{W}" height="{H}" fill="url(#v)"/><defs><radialGradient id="v" cx=".5" cy=".55" r=".75">'
           f'<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#140a24" stop-opacity=".35"/></radialGradient></defs></svg>')
    open(os.path.join(OUT, 'disco-cosmos.svg'), 'w').write(svg)

def nebula():
    W, H = 1200, 420
    clouds = [  # cx, cy, rx, ry, color, opacity, rotate
        (.12, .5, .3, .9, '#2f3ad8', .95, 0), (.38, .55, .26, .8, '#3a2bc0', .85, 0), (.04, .15, .12, .35, '#ff2d7a', .75, 0),
        (.06, .95, .16, .3, '#ff2050', .8, 0), (.6, .92, .24, .28, '#ff2db8', .85, 0), (.8, .68, .2, .4, '#ff3d8a', .75, 0),
        (.95, .25, .14, .45, '#ff4a6a', .7, 0), (.64, .22, .16, .3, '#ffb08a', .85, 0), (.78, .1, .14, .22, '#ff9a5a', .7, 0),
        (.52, .45, .12, .4, '#b04cff', .55, 0), (.9, .95, .14, .2, '#ff8a3a', .7, 0), (.75, .45, .14, .3, '#1a1060', .55, 0),
        (.3, .9, .2, .25, '#c02ad8', .7, 0), (.45, .1, .14, .2, '#ff6ab0', .45, 0),
    ]
    streaks = [(.2, .45, .03, .6, '#55e2ff', .85, 12), (.27, .35, .022, .5, '#3ad0f5', .6, 8), (.12, .3, .02, .45, '#7af0ff', .45, 18),
               (.5, .3, .018, .6, '#ffe8f0', .55, -14), (.58, .32, .02, .7, '#fff0e6', .6, -10), (.66, .38, .02, .7, '#ffd8c0', .5, -6),
               (.72, .3, .016, .6, '#ffffff', .4, -18), (.44, .6, .028, .45, '#6af0ff', .45, 22), (.85, .5, .02, .5, '#ffc0d8', .35, -4)]
    # Kept inside the middle band so the wide, short banner crop always shows the star and orbs.
    orbs = [(.085, .68, 9), (.537, .3, 8), (.598, .6, 9), (.866, .45, 10), (.81, .7, 8), (.97, .72, 10), (.56, .38, 24), (.36, .62, 6), (.2, .32, 6), (.93, .3, 7)]
    el = []
    for cx, cy, rx, ry, col, op, rot in clouds:
        el.append(f'<ellipse cx="{cx*W:.0f}" cy="{cy*H:.0f}" rx="{rx*W:.0f}" ry="{ry*H:.0f}" fill="{col}" opacity="{op}" filter="url(#b)"/>')
    for cx, cy, rx, ry, col, op, rot in streaks:
        el.append(f'<ellipse cx="{cx*W:.0f}" cy="{cy*H:.0f}" rx="{rx*W:.0f}" ry="{ry*H:.0f}" fill="{col}" opacity="{op}" filter="url(#s)" transform="rotate({rot} {cx*W:.0f} {cy*H:.0f})"/>')
    for cx, cy, r in orbs:
        halo = '#ffffff' if r > 15 else '#ff7a4a'
        el.append(f'<circle cx="{cx*W:.0f}" cy="{cy*H:.0f}" r="{r*3}" fill="{halo}" opacity=".45" filter="url(#o)"/>'
                  f'<circle cx="{cx*W:.0f}" cy="{cy*H:.0f}" r="{r*1.1:.1f}" fill="{"#fff" if r > 15 else "#ffd0a0"}" filter="url(#g)"/>'
                  f'<circle cx="{cx*W:.0f}" cy="{cy*H:.0f}" r="{r*.45:.1f}" fill="#fff"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice"><defs>'
           '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1a6e"/><stop offset=".5" stop-color="#3a24a8"/><stop offset="1" stop-color="#5a1f8a"/></linearGradient>'
           '<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="48"/></filter>'
           '<filter id="s" x="-100%" y="-50%" width="300%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>'
           '<filter id="o" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14"/></filter>'
           '<filter id="g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>'
           f'<rect width="{W}" height="{H}" fill="url(#bg)"/>{"".join(el)}</svg>')
    open(os.path.join(OUT, 'supernova-haze.svg'), 'w').write(svg)

disco(); nebula()
print('written')
