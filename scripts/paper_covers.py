#!/usr/bin/env python3
"""Draw the cover pictures for the papers in _publications/.

Each paper gets images/papers/<name>.jpg, named after its file in _publications/ (so
2026-hilbertgen-3d.md gets images/papers/2026-hilbertgen-3d.jpg): a 1280x720 drawing of the
paper's main idea. The home page shows it about 240px wide next to the paper, and the
paper's own page about 620px wide at the top. They all share one style (dark background,
glowing lines, one palette) so the list reads as a set, and the random seeds are fixed, so
a rerun draws exactly the same pictures.

Any cover can be replaced by a figure from the paper: save it as a 16:9 JPEG under the same
name, and from then on name the covers you want redrawn instead of redrawing them all.

Needs numpy and matplotlib. Run it from the top of the repository:

    python3 scripts/paper_covers.py                       # all of them
    python3 scripts/paper_covers.py 2026-hilbertgen-3d    # just this one
"""

import argparse
from itertools import combinations, product
from pathlib import Path

import numpy as np
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.collections import LineCollection, PatchCollection, PolyCollection
from matplotlib.colors import to_rgb
from matplotlib.figure import Figure
from matplotlib.patches import FancyBboxPatch, Polygon
from PIL import Image  # comes with matplotlib

OUT_DIR = Path(__file__).resolve().parent.parent / "images" / "papers"
PIXELS, DPI = (1280, 720), 100
# Everything is drawn in units of 80px: x runs from 0 to 16, y from 0 (bottom) to 9.
W, H = 16, 9
PT = 72 * PIXELS[0] / (W * DPI)  # points per unit, for line widths and dot sizes

AMBER, CORAL, TEAL, SKY, VIOLET, IVORY = (np.array(to_rgb(c)) for c in
                                          ("#F2B24C", "#EE6C5B", "#3FC1B0", "#5DA9E9", "#A08CF0", "#F4EBDD"))
INK_TOP_LEFT, INK_BOTTOM_RIGHT = np.array(to_rgb("#14243a")), np.array(to_rgb("#0a121f"))


# --- Drawing helpers ------------------------------------------------------------------

def mix(a, b, t):
    """The colors (or points) between a and b: t=0 gives a, t=1 gives b; t may be an array."""
    return a + (b - a) * np.asarray(t, float)[..., None]


def ramp(*colors):
    """A function taking t from 0 to 1 to colors running evenly through the given ones."""
    stops = np.linspace(0, 1, len(colors))
    return lambda t: np.stack([np.interp(t, stops, [c[k] for c in colors]) for k in range(3)], axis=-1)


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def background(dots=True):
    """The backdrop of every cover: a diagonal gradient that darkens toward the corners."""
    w, h = PIXELS
    y, x = np.mgrid[0:h, 0:w] + 0.5
    image = mix(INK_TOP_LEFT, INK_BOTTOM_RIGHT, (x / w + y / h) / 2)
    corner = np.hypot(x / w - 0.5, y / h - 0.5) * 2  # 0 in the middle, 1.41 in the corners
    image *= 1 - 0.4 * smoothstep(0.45, 1.45, corner)[..., None]
    if dots:  # a very faint grid of dots, 40px apart
        image = mix(image, IVORY, 0.05 * np.clip(1.8 - np.hypot(x % 40 - 20, y % 40 - 20), 0, 1))
    image += np.random.default_rng(0).uniform(-0.5, 0.5, image.shape) / 255  # dither, against banding
    return np.clip(np.round(image * 255), 0, 255).astype(np.uint8)


def new_cover(dots=True):
    """A figure with the backdrop, and axes on it that draw in units (see W and H)."""
    fig = Figure(figsize=(PIXELS[0] / DPI, PIXELS[1] / DPI), dpi=DPI)
    FigureCanvasAgg(fig)
    fig.figimage(background(dots), zorder=-10)
    ax = fig.add_axes((0, 0, 1, 1))
    ax.set(xlim=(0, W), ylim=(0, H))
    ax.set_axis_off()
    return fig, ax


def blur(image, sigma):
    """A Gaussian-like blur of an (h, w, channels) array: three box blurs along each axis."""
    r = max(1, round((np.sqrt(4 * sigma ** 2 + 1) - 1) / 2))
    for axis in (0, 1):
        a = np.moveaxis(image, axis, 0)
        for _ in range(3):
            c = np.cumsum(np.pad(a, [(r + 1, r), (0, 0), (0, 0)]), axis=0)
            a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        image = np.moveaxis(a, 0, axis)
    return image


class Light:
    """An agg_filter that makes an artist add light to whatever is under it.

    Matplotlib draws the artist on its own first, so overlapping pieces of it (the joints of
    a line made of many segments) don't build up. Here its brightness becomes its opacity,
    so black is clear and a color scaled toward black is a fainter light; alpha scales it
    all, and a blur of `soften` pixels takes the hard edge off a halo.
    """

    def __init__(self, alpha=1.0, soften=0.0):
        self.alpha, self.soften = alpha, soften

    def __call__(self, image, dpi):
        pad = int(3 * self.soften) + 2
        rgb = np.pad(image[..., :3] * image[..., 3:], ((pad, pad), (pad, pad), (0, 0)))
        if self.soften >= 1:
            rgb = blur(rgb, self.soften)
        light = rgb.max(axis=2, keepdims=True)
        return np.concatenate([rgb / np.maximum(light, 1e-6), light * self.alpha], axis=2), -pad, -pad


def per_item(value, n, width=None):
    """value repeated for n items, unless it already has one entry per item."""
    value = np.asarray(value, float)
    return np.broadcast_to(value, (n,) if width is None else (n, width))


# A glowing line is drawn four times, from wide and faint to narrow and solid: (width, alpha).
GLOW = ((5.0, 0.05), (3.0, 0.11), (1.8, 0.26), (1.0, 1.0))


def glow(ax, lines, color, width, fade=1.0, halo=1.0, hot=0.35, z=3, dashes=None, core=True):
    """Draw polylines (a list of (n, 2) arrays) as light.

    color, width (in points) and fade (1 for full strength down to 0 for gone, for depth
    cues and trails) are one value for all lines or one per line. halo scales the glow
    around them; hot adds a thin, whiter line down the middle; core=False leaves out the
    lines themselves, to draw only their glow.
    """
    n = len(lines)
    fade = per_item(fade, n)[:, None]
    color = per_item(color, n, 3) * fade
    width = per_item(width, n)
    passes = [(f, a * halo if f > 1 else a * core, color) for f, a in GLOW]
    if hot and core:
        passes.append((0.4, 0.9, color + (fade - color) * hot))
    for factor, alpha, rgb in passes:
        if alpha <= 0:
            continue
        lw = width * factor
        lines_ = LineCollection(lines, colors=np.clip(rgb, 0, 1), linewidths=lw, zorder=z,
                                capstyle="butt" if dashes else "round", joinstyle="round")
        if dashes:  # in points; matplotlib would otherwise stretch them with the line width
            lines_.set_linestyle((0, [d / lw.mean() for d in dashes]))
        lines_.set_agg_filter(Light(alpha, 0.35 * lw.max() * DPI / 72 if factor > 1 else 0))
        ax.add_collection(lines_)


def glow_dots(ax, points, color, radius, fade=1.0, halo=1.0, hot=0.45, z=4):
    """Draw round dots (radius in units) as light, with a soft halo."""
    points = np.atleast_2d(points)
    n = len(points)
    fade = per_item(fade, n)[:, None]
    color = per_item(color, n, 3) * fade
    radius = per_item(radius, n)
    passes = [(3.4, 0.06 * halo, color), (2.1, 0.15 * halo, color), (1.4, 0.32 * halo, color), (1.0, 1.0, color)]
    if hot:
        passes.append((0.5, 0.9, color + (fade - color) * hot))
    for factor, alpha, rgb in passes:
        if alpha <= 0:
            continue
        size = 2 * radius * factor * PT
        dots = ax.scatter(points[:, 0], points[:, 1], s=size ** 2, c=np.clip(rgb, 0, 1), linewidths=0, zorder=z)
        dots.set_agg_filter(Light(alpha, 0.25 * size.max() * DPI / 72 if factor > 1 else 0))


def aura(ax, center, color, radius, strength=0.3, z=1):
    """A soft round glow of light, strongest in the middle and gone by about 1.5 radius."""
    dot = ax.scatter(*center, s=(2 * radius * PT) ** 2, c=[color], linewidths=0, zorder=z)
    dot.set_agg_filter(Light(strength, radius * PIXELS[0] / W / 2))


def glow_patches(ax, patches, color, alpha=1.0, halo=0.4, soften=10, z=3):
    """Fill patches with light, over a blurred glow of themselves."""
    for a, s in ((halo, soften), (alpha, 0)):
        if a > 0:
            fill = PatchCollection(patches, facecolors=np.clip(color, 0, 1), edgecolors="none", zorder=z)
            fill.set_agg_filter(Light(a, s))
            ax.add_collection(fill)


def rounded_rect(x, y, w, h, r, tail=None):
    """The outline of a rounded rectangle as a closed polyline, with an optional speech-bubble
    tail: three points to put into its bottom edge."""
    points = []
    corners = ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180))
    for cx, cy, start in corners:  # counterclockwise from the bottom right
        a = np.radians(np.linspace(start, start + 90, 10))
        points.extend(zip(cx + r * np.cos(a), cy + r * np.sin(a)))
    points.extend(tail or [])
    points.append(points[0])
    return np.array(points)


def quadcopter(ax, center, size, heading=0.0, color=IVORY, fade=1.0, width=2.6, z=6):
    """A quadcopter seen from above: crossed arms with a rotor ring on each end, `size` units
    from the middle to a rotor, flying toward `heading` degrees."""
    angles = np.radians(heading + np.array([45, 135, 225, 315]))
    tips = np.asarray(center) + size * np.column_stack([np.cos(angles), np.sin(angles)])
    around = np.linspace(0, 2 * np.pi, 48)
    ring = 0.5 * size * np.column_stack([np.cos(around), np.sin(around)])
    glow(ax, [tips[[0, 2]], tips[[1, 3]]] + [tip + ring for tip in tips], color, width, fade=fade, halo=0.8, z=z)
    glow_dots(ax, center, color, 0.2 * size, fade=fade, halo=0.5, z=z)


def rotate(points, yaw=0.0, pitch=0.0):
    """Turn 3D points (x right, y up, z toward the viewer) about the vertical axis by yaw
    degrees, then tip their top toward the viewer by pitch degrees."""
    a, b = np.radians(yaw), np.radians(pitch)
    x, y, z = np.moveaxis(np.asarray(points, float), -1, 0)
    x, z = x * np.cos(a) + z * np.sin(a), -x * np.sin(a) + z * np.cos(a)
    y, z = y * np.cos(b) - z * np.sin(b), y * np.sin(b) + z * np.cos(b)
    return np.stack([x, y, z], axis=-1)


def perspective(points, distance):
    """Rotated 3D points seen from a camera at z=distance: their (x, y) on the screen, smaller
    the farther they are, and their depth z (larger is nearer)."""
    f = distance / (distance - points[..., 2])
    return points[..., :2] * f[..., None], points[..., 2]


def segments(points):
    """The consecutive pairs of a polyline, as an (n-1, 2, dims) array."""
    return np.stack([points[:-1], points[1:]], axis=1)


# --- The covers -------------------------------------------------------------------------

def hilbert_point(index, bits, dims=3):
    """The cell at `index` along a Hilbert curve through a grid of side 2**bits (Skilling, 2004)."""
    x = [0] * dims
    for k in range(bits * dims):  # deal the index's bits out across the coordinates (the "transpose")
        if index >> (bits * dims - 1 - k) & 1:
            x[k % dims] |= 1 << (bits - 1 - k // dims)
    t = x[dims - 1] >> 1  # Gray decode
    for i in range(dims - 1, 0, -1):
        x[i] ^= x[i - 1]
    x[0] ^= t
    q = 2
    while q != 1 << bits:  # undo the excess work
        p = q - 1
        for i in range(dims - 1, -1, -1):
            if x[i] & q:
                x[0] ^= p
            else:
                t = (x[0] ^ x[i]) & p
                x[0] ^= t
                x[i] ^= t
        q <<= 1
    return x


# A 3D Hilbert curve of order 3 (8x8x8 cells) in a wireframe cube, colored along its length.
def hilbertgen_3d(ax):
    cells = np.array([hilbert_point(i, bits=3) for i in range(8 ** 3)])
    assert (np.abs(np.diff(cells, axis=0)).sum(axis=1) == 1).all(), "consecutive points must be unit steps"
    assert len(np.unique(cells, axis=0)) == 8 ** 3, "the curve must visit every cell once"

    view = dict(yaw=-147, pitch=24)
    corners = np.array(list(product((-0.5, 0.5), repeat=3)))
    cube, cube_z = perspective(rotate(corners, **view), 4.2)
    curve, curve_z = perspective(rotate((cells + 0.5) / 8 - 0.5, **view), 4.2)
    lo, hi = cube.min(axis=0), cube.max(axis=0)

    def place(p):  # the cube 6.6 units tall, in the middle
        return (p - (lo + hi) / 2) * 6.6 / (hi - lo)[1] + (W / 2, H / 2)

    def near(z):  # 0 at the cube's back corner, 1 at its front one
        return (z - cube_z.min()) / np.ptp(cube_z)

    edges = [(a, b) for a, b in combinations(range(8), 2) if np.abs(corners[a] - corners[b]).sum() == 1]
    glow(ax, [place(cube[[a, b]]) for a, b in edges], IVORY, 1.6, hot=0, halo=0.5, z=2,
         fade=[0.12 + 0.22 * near(cube_z[[a, b]].mean()) for a, b in edges])

    depth = near((curve_z[:-1] + curve_z[1:]) / 2)
    order = np.argsort(depth)  # back to front
    colors = ramp(TEAL, SKY, VIOLET, CORAL, AMBER)(np.linspace(0, 1, len(depth)))
    glow(ax, list(place(segments(curve))[order]), colors[order], 4.0 * (0.45 + 0.55 * depth[order]),
         fade=0.18 + 0.82 * depth[order] ** 1.2, halo=0.7, z=3)


def gl_weights(order, n):
    """The Grünwald–Letnikov weights c_0..c_n of the fractional difference of this order."""
    c = np.ones(n + 1)
    for j in range(1, n + 1):
        c[j] = c[j - 1] * (j - 1 - order) / j
    return c


# A long-memory path; lines from its newest point back to every earlier one fade like the GL weights below.
def fractional_order(ax):
    rng = np.random.default_rng(3)
    order, n = 0.6, 80
    c = gl_weights(order, n)
    x, noise = np.zeros(n), 0.0
    for t in range(1, n):  # Δ^order x_t = -0.03 x_{t-1} + noise (slightly colored, for a smoother path)
        noise = 0.7 * noise + rng.normal()
        x[t] = -c[1:t + 1] @ x[t - 1::-1] - 0.03 * x[t - 1] + noise

    path = np.column_stack([np.linspace(2.2, 13.2, n), 4.0 + 3.3 * (x - x.min()) / np.ptp(x)])
    now = path[-1]
    weight = (np.abs(c[n - 1 - np.arange(n - 1)]) / abs(c[1])) ** 0.3  # compressed, so the long tail shows

    # The memory: a line back to every earlier point, as strong as its weight. Unlike the
    # glowing lines these add up, so they merge into a bright cone at the newest point.
    fan = [np.array([now, p]) for p in path[:-1]]
    glow(ax, fan, AMBER, 1.5, fade=0.9 * weight, halo=0.35, core=False, z=2)
    ax.add_collection(LineCollection(fan, colors=np.column_stack([np.tile(AMBER, (n - 1, 1)), 0.65 * weight]),
                                     linewidths=1.5, zorder=2))
    bars = [np.array([[px, 1.5], [px, 1.5 + 1.6 * w]]) for px, w in zip(path[:-1, 0], weight)]
    glow(ax, bars, ramp(CORAL, AMBER)(weight), 4.0, fade=0.9, halo=0.4, hot=0, z=2)
    glow(ax, [path], SKY, 3.8, z=3)
    glow_dots(ax, path[:-1], IVORY, 0.04, fade=0.75, halo=0, hot=0, z=4)
    glow_dots(ax, now, AMBER, 0.15, z=5)


# Brownian paths spreading over a sphere from three tight clusters of data, amber turning to sky blue.
def riemannian_diffusion(ax):
    rng = np.random.default_rng(2)
    center, radius = np.array([W / 2, H / 2]), 3.35

    # the sphere, lit from the top left
    n = int(2 * radius * 80)
    s = (np.arange(n) + 0.5) / n * 2 - 1
    u, v = np.meshgrid(s, s[::-1])
    r = np.hypot(u, v)
    nz = np.sqrt(np.clip(1 - r ** 2, 0, 1))
    lit = np.clip(np.stack([u, v, nz], axis=-1) @ unit([-0.45, 0.55, 0.7]), 0, 1)
    rgb = mix(np.array(to_rgb("#152740")), np.array(to_rgb("#2a4870")), lit) + 0.22 * SKY * (1 - nz)[..., None] ** 3
    alpha = np.clip((1 - r) * n / 2 + 0.5, 0, 1)
    ax.imshow(np.dstack([np.clip(rgb, 0, 1), alpha]), extent=(*(center[0] + np.array([-1, 1]) * radius),
              *(center[1] + np.array([-1, 1]) * radius)), aspect="auto", interpolation="bilinear", zorder=1)

    # latitude and longitude lines, on the front only
    view = dict(yaw=20, pitch=22)
    a = np.linspace(0, 2 * np.pi, 181)
    circles = [np.column_stack([np.cos(np.radians(lat)) * np.cos(a), np.full_like(a, np.sin(np.radians(lat))),
                                np.cos(np.radians(lat)) * np.sin(a)]) for lat in (-60, -30, 0, 30, 60)]
    circles += [np.column_stack([np.cos(a) * np.cos(np.radians(lon)), np.sin(a), np.cos(a) * np.sin(np.radians(lon))])
                for lon in range(0, 180, 30)]
    grid = np.concatenate([segments(rotate(c, **view)) for c in circles])
    front = smoothstep(0.0, 0.25, grid[:, :, 2].mean(axis=1))
    glow(ax, list(center + radius * grid[front > 0][:, :, :2]), IVORY, 1.0, fade=0.16 * front[front > 0],
         halo=0, hot=0, z=2)

    # the paths, simulated in view space: tangent steps, put back on the sphere, then lightly
    # averaged so that they read as threads rather than scribbles
    clusters = unit([[-0.5, 0.45, 0.74], [0.58, 0.22, 0.78], [-0.08, -0.55, 0.83]])
    data, ends, pieces, times = [], [], [], []
    for c in clusters:
        points = unit(c + 0.045 * rng.normal(size=(10, 3)))
        data.extend(points)
        for p in points[:4]:
            walk = [p]
            for _ in range(700):
                step = 0.03 * rng.normal(size=3)
                p = unit(p + step - (step @ p) * p)
                walk.append(p)
            walk = np.array(walk)
            walk = unit(np.stack([np.convolve(np.pad(axis, 20, mode="edge"), np.ones(41) / 41, mode="valid")
                                  for axis in walk.T], axis=1))
            ends.append(walk[-1])
            pieces.append(segments(walk))
            times.append(np.linspace(0, 1, len(walk) - 1))
    pieces, times = np.concatenate(pieces), np.concatenate(times)
    z = pieces[:, :, 2].mean(axis=1)
    order = np.argsort(z)  # back to front
    front = smoothstep(-0.15, 0.2, z)  # 0 on the back of the sphere, 1 on the front
    colors = mix(AMBER, SKY, smoothstep(0.0, 0.6, times))
    glow(ax, list(center + radius * pieces[order][:, :, :2]), colors[order], (2.2 * (0.55 + 0.45 * front))[order],
         fade=((1 - 0.35 * times) * (0.08 + 0.92 * front))[order], halo=0.8, z=3)

    ends = np.array(ends)
    glow_dots(ax, center + radius * ends[:, :2], SKY, 0.06, fade=0.12 + 0.88 * smoothstep(-0.15, 0.2, ends[:, 2]),
              halo=0.6, z=4)
    for c in clusters:
        aura(ax, center + radius * c[:2], AMBER, 0.45, strength=0.4, z=2)
    glow_dots(ax, center + radius * np.array(data)[:, :2], AMBER, 0.055, halo=1.0, z=5)


# A Hankel matrix of a system with one unstable mode, beside its singular values: two large, the rest small.
def polti(ax):
    rng = np.random.default_rng(1)
    size = 10
    k = np.arange(2 * size - 1)
    h = (1.16 ** k * np.cos(0.95 * k) + 0.6 * 0.72 ** k * np.cos(2.3 * k + 1) + 0.5 * 0.55 ** k
         + 0.03 * rng.normal(size=k.size))  # one unstable mode, damped ones, a little measurement noise
    hankel = h[np.add.outer(np.arange(size), np.arange(size))]  # constant along anti-diagonals
    sv = np.linalg.svd(hankel, compute_uv=False)
    value = np.tanh(hankel / 1.8)

    pitch, cell, bar_pitch, gap = 0.62, 0.52, 0.42, 1.0
    left = (W - (size * pitch + gap + size * bar_pitch)) / 2
    bottom = H / 2 - size * pitch / 2
    base = mix(INK_TOP_LEFT, IVORY, 0.13)
    cells, colors = [], []
    for i, j in product(range(size), repeat=2):
        cells.append(FancyBboxPatch((left + j * pitch, bottom + (size - 1 - i) * pitch), cell, cell,
                                    boxstyle="round,pad=0,rounding_size=0.1"))
        colors.append(mix(base, AMBER if value[i, j] > 0 else VIOLET, 0.85 * abs(value[i, j]) ** 0.8))
    glow_patches(ax, cells, np.array(colors), halo=0.3, soften=12)

    heights = np.maximum(6.0 * (sv / sv[0]) ** 0.32, 0.2)  # compressed, so the small ones still show
    x0 = left + size * pitch + gap
    bars = [FancyBboxPatch((x0 + i * bar_pitch, bottom), 0.26, hgt, boxstyle="round,pad=0,rounding_size=0.08")
            for i, hgt in enumerate(heights)]
    glow_patches(ax, bars, np.array([CORAL if i < 2 else TEAL for i in range(size)]), halo=0.45, soften=12)
    glow(ax, [np.array([[x0 - 0.15, bottom - 0.14], [x0 + size * bar_pitch - 0.05, bottom - 0.14]])], IVORY, 1.4,
         fade=0.35, halo=0, hot=0)


# A noisy path spiraling out while it explores, then back into the origin once the controller is on.
def lti(ax):
    rng = np.random.default_rng(11)
    dt = 0.02
    x, noise, out = np.array([0.1, 0.0]), np.zeros(2), []
    explore_steps = 1300
    for growth, turn, steps in ((0.085, 1.0, explore_steps), (-0.4, 1.6, 750)):  # open loop, then closed loop
        a = np.array([[growth, -turn], [turn, growth]])
        for _ in range(steps):
            noise += -noise * dt / 0.4 + 0.45 * np.sqrt(dt) * rng.normal(size=2)  # smooth noise
            x = x + dt * (a @ x + noise)
            out.append(x)
    out = np.array(out)
    path = (W / 2, H / 2) + out * 3.5 / np.linalg.norm(out, axis=1).max()
    explore, settle = path[:explore_steps + 1], path[explore_steps:]
    aura(ax, (W / 2, H / 2), TEAL, 1.1, strength=0.35, z=1)
    glow(ax, list(segments(explore)), ramp(AMBER, CORAL)(np.linspace(0, 1, len(explore) - 1)), 3.3, z=3)
    glow(ax, list(segments(settle)), ramp(TEAL, SKY)(np.linspace(0, 1, len(settle) - 1)), 3.3, z=4)
    glow_dots(ax, (W / 2, H / 2), IVORY, 0.1, halo=1.5, z=5)


# A time series up to a glowing "now", then a look-ahead window with a fan of forecasts around their mean.
def contraction(ax):
    rng = np.random.default_rng(5)
    t = np.linspace(1.3, 14.3, 651)
    signal = 4.7 + sum(amp * np.sin(freq * t + rng.uniform(0, 2 * np.pi))
                       for amp, freq in ((0.95, 0.55), (0.55, 1.0), (0.3, 1.9), (0.14, 3.3)))
    now, end = 8.7, 12.4
    past, window, beyond = t <= now, (t >= now) & (t <= end), t >= end

    ax.add_patch(FancyBboxPatch((now, 1.75), end - now, 5.5, boxstyle="round,pad=0,rounding_size=0.25",
                                facecolor=VIOLET, alpha=0.08, edgecolor="none", zorder=1))
    glow(ax, [rounded_rect(now, 1.75, end - now, 5.5, 0.25)], VIOLET, 1.2, fade=0.3, halo=0, hot=0, z=1)

    tw = t[window]
    kernel = np.ones(31) / 31
    mean = np.convolve(np.pad(signal, 15, mode="edge"), kernel, mode="valid")[window]
    mean += signal[window][0] - mean[0]
    spread = 0.85 * ((tw - now) / (end - now)) ** 0.85  # the forecasts grow less sure further ahead
    fan = []
    for z in np.linspace(-1.5, 1.5, 13):
        wiggle = np.cumsum(rng.normal(size=len(tw))) / np.sqrt(len(tw))
        wiggle = np.convolve(np.pad(wiggle, 20, mode="edge"), np.ones(41) / 41, mode="valid")
        fan.append(np.column_stack([tw, mean + spread * (z + 0.35 * (wiggle - wiggle[0]))]))
    glow(ax, fan, TEAL, 1.3, fade=0.5, halo=0.3, hot=0, z=2)
    glow(ax, [np.column_stack([tw, mean])], TEAL, 3.6, z=3)

    glow(ax, [np.column_stack([t[past], signal[past]])], SKY, 3.8, z=3)
    glow_dots(ax, np.column_stack([t[beyond], signal[beyond]])[::9], IVORY, 0.03, fade=0.3, halo=0, hot=0, z=2)
    glow(ax, [np.array([[now, 1.4], [now, 7.6]])], AMBER, 2.6, z=4)
    glow_dots(ax, (now, signal[past][-1]), AMBER, 0.12, z=5)


# A path converging onto a figure eight, colored by the policy the bandit picks; a quadcopter at its end.
def bandit(ax):
    rng = np.random.default_rng(9)
    center, a, b = np.array([W / 2, H / 2]), 5.2, 6.0

    def reference(phase):  # a figure eight (the lemniscate of Gerono)
        return center + np.column_stack([a * np.sin(phase), b * np.sin(phase) * np.cos(phase)])

    glow(ax, [reference(np.linspace(0, 2 * np.pi, 400))], IVORY, 1.8, fade=0.4, halo=0.4, hot=0, z=2, dashes=(7, 6))

    dt, lap, epoch = 0.01, 10.0, 0.3
    omega, phase0 = 2 * np.pi / lap, -np.pi / 2  # the reference starts at the far left of the eight
    # Each policy's (stiffness, damping, how much of the path's curvature it anticipates): too soft,
    # too jumpy, and the one that fits.
    gains = ((1.0, 1.2, 0.6), (6.0, 0.6, 1.3), (2.5, 2.4, 1.0))
    schedule = [1, 0, 2, 1, 0, 2, 1, 0, 2, 2, 1, 2]  # the bandit's pick for each epoch; then always 2
    p, v = np.array([5.0, 4.4]), np.zeros(2)  # at rest, inside the left loop
    points, arms = [p], []
    for k in range(int(0.675 * lap / dt)):
        arm = schedule[int(k * dt / epoch)] if k * dt < epoch * len(schedule) else 2
        before, target, after = reference(phase0 + omega * (k * dt + np.array([-dt, 0, dt])))
        kp, kd, ahead = gains[arm]
        acc = (kp * (target - p) + kd * ((after - before) / (2 * dt) - v)
               + ahead * (after - 2 * target + before) / dt ** 2 + 0.6 * rng.normal(size=2))
        v = v + dt * acc
        p = p + dt * v
        points.append(p)
        arms.append(arm)
    points, arms = np.array(points), np.array(arms)

    colors = (CORAL, VIOLET, TEAL)
    cuts = np.flatnonzero(np.diff(arms)) + 1
    for start, stop in zip(np.r_[0, cuts], np.r_[cuts, len(arms)]):
        glow(ax, [points[start:stop + 1]], colors[arms[start]], 3.6, z=3)
    heading = np.degrees(np.arctan2(*(points[-1] - points[-8])[::-1]))
    quadcopter(ax, points[-1], 0.42, heading, z=6)


# Drones in formation around a target, linked to their neighbors, and a speech bubble giving them an order.
def uavgent(ax):
    center, radius = np.array([9.8, 4.1]), 2.4
    angles = np.radians(90 + 60 * np.arange(6))
    drones = center + radius * np.column_stack([np.cos(angles), np.sin(angles)])

    a = np.linspace(0, 2 * np.pi, 120)
    rings = [center + rr * np.column_stack([np.cos(a), np.sin(a)]) for rr in (0.35, 0.75, 1.15)]
    glow(ax, rings, AMBER, 2.2, fade=[0.9, 0.55, 0.3], halo=0.8, z=2)
    glow_dots(ax, center, AMBER, 0.12, z=3)

    glow(ax, [drones[[i, (i + 1) % 6]] for i in range(6)], SKY, 1.8, fade=0.6, halo=0.4, hot=0, z=2)

    s = np.linspace(0, 1, 40)[:, None]
    for angle in angles:  # each drone's trail, curving in from farther out
        trail_angle = angle - 0.6 * (1 - s)
        trail = center + (radius + 1.1 * (1 - s) ** 1.3) * np.hstack([np.cos(trail_angle), np.sin(trail_angle)])
        glow(ax, list(segments(trail)), TEAL, 3.0, fade=0.1 + 0.85 * s[1:, 0] ** 1.2, halo=0.6, hot=0, z=3)
    for d, angle in zip(drones, angles):
        quadcopter(ax, d, 0.4, np.degrees(angle) + 90, z=6)

    bx, by, bw, bh = 2.0, 6.3, 3.5, 1.85
    tip = np.array([bx + 3.0, by - 0.55])
    outline = rounded_rect(bx, by, bw, bh, 0.45, tail=[(bx + 2.65, by), tuple(tip), (bx + 2.15, by)])
    ax.add_patch(Polygon(outline, closed=True, facecolor=VIOLET, alpha=0.12, edgecolor="none", zorder=4))
    glow(ax, [outline], VIOLET, 2.4, z=5)
    for k, length in enumerate((2.5, 2.0, 1.3)):
        y = by + bh * (0.72 - 0.22 * k)
        glow(ax, [np.array([[bx + 0.5, y], [bx + 0.5 + length, y]])], IVORY, 8, fade=0.85, halo=0.3, hot=0, z=5)
    p0, p2 = tip + (0.3, -0.15), drones[1] - (0.8, 0.05)  # from the bubble's tail to the nearest drone
    p1 = (p0 + p2) / 2 - (0, 0.4)
    s = np.linspace(0, 1, 40)
    curve = mix(mix(p0, p1, s), mix(p1, p2, s), s)
    glow(ax, [curve], IVORY, 2.2, fade=0.75, halo=0.5, hot=0, z=5, dashes=(6, 5))
    d = unit(p2 - p1)
    nrm = np.array([-d[1], d[0]])
    glow(ax, [np.array([p2 - 0.3 * d + 0.2 * nrm, p2, p2 - 0.3 * d - 0.2 * nrm])], IVORY, 2.2, fade=0.75,
         halo=0.5, hot=0, z=5)


def minkowski_sum(p, q):
    """The vertices of P+Q for convex polygons, counterclockwise, and for each edge
    (from vertex i to i+1) whether it comes from P."""
    def walk(poly):  # counterclockwise from the lowest (then leftmost) vertex: start and edges
        poly = np.asarray(poly, float)
        (ax_, ay), (bx, by) = poly[1] - poly[0], poly[2] - poly[0]
        if ax_ * by - ay * bx < 0:
            poly = poly[::-1]
        poly = np.roll(poly, -min(range(len(poly)), key=lambda i: (poly[i][1], poly[i][0])), axis=0)
        return poly[0], np.diff(np.vstack([poly, poly[:1]]), axis=0)

    (p0, pe), (q0, qe) = walk(p), walk(q)
    tagged = sorted([(np.arctan2(e[1], e[0]) % (2 * np.pi), tuple(e), True) for e in pe] +
                    [(np.arctan2(e[1], e[0]) % (2 * np.pi), tuple(e), False) for e in qe])
    vertices = np.cumsum([p0 + q0] + [e for _, e, _ in tagged], axis=0)[:-1]
    return vertices, [from_p for _, _, from_p in tagged]


# Lattice polygons P + Q = P+Q, their Minkowski sum, each edge colored like the polygon it comes from.
def polyhedra(ax):
    u = 0.92  # lattice spacing, in units
    origin = np.array([W / 2 - 6 * u, H / 2 - 2 * u])

    def at(points, offset):
        return origin + (np.asarray(points, float) + offset) * u

    lattice = at(list(product(range(-3, 17), range(-3, 9))), (0, 0))
    lattice = lattice[((lattice > 0) & (lattice < (W, H))).all(axis=1)]
    glow_dots(ax, lattice, IVORY, 0.035, fade=0.22, halo=0, hot=0, z=1)

    p = [(0, 0), (2, 1), (0, 2)]
    q = [(1, 0), (2, 1), (1, 2), (0, 1)]
    total, from_p = minkowski_sum(p, q)
    shapes = (  # corners, where on the lattice, fill color and strength, edge colors
        (p, (0, 1), AMBER, 0.13, [AMBER] * len(p)),
        (q, (4, 1), SKY, 0.13, [SKY] * len(q)),
        (total, (8, 0), VIOLET, 0.24, [AMBER if edge_from_p else SKY for edge_from_p in from_p]))
    for poly, offset, fill, strength, edge_colors in shapes:
        corners = at(poly, offset)
        ax.add_patch(Polygon(corners, closed=True, facecolor=fill, alpha=strength, edgecolor="none", zorder=2))
        glow(ax, [corners[[i, (i + 1) % len(corners)]] for i in range(len(corners))], edge_colors, 3.0, z=3)
        glow_dots(ax, corners, fill, 0.07, halo=0.6, z=4)

    plus, equals = at((3, 2), 0), at((7, 2), 0)
    arm = 0.42
    glow(ax, [plus + [[-arm, 0], [arm, 0]], plus + [[0, -arm], [0, arm]],
              equals + [[-arm, 0.2], [arm, 0.2]], equals + [[-arm, -0.2], [arm, -0.2]]], IVORY, 6, fade=0.85,
         halo=0.6, hot=0.2, z=3)


# A triangulated torus: glowing edges in front, faint ones behind, and a dot on every vertex.
def min_triangulation(ax):
    m, n, big, small = 16, 8, 1.0, 0.42  # vertices around the ring and around the tube; radii
    i, j = np.meshgrid(np.arange(m), np.arange(n), indexing="ij")
    theta, phi = 2 * np.pi * (i + j / 2) / m, 2 * np.pi * j / n  # each ring turned half a step
    points = np.stack([(big + small * np.cos(phi)) * np.cos(theta), small * np.sin(phi),
                       (big + small * np.cos(phi)) * np.sin(theta)], axis=-1).reshape(-1, 3)
    normals = np.stack([np.cos(phi) * np.cos(theta), np.sin(phi), np.cos(phi) * np.sin(theta)], axis=-1).reshape(-1, 3)

    def vertex(a, b):  # the index of vertex (a, b), going around the tube past the seam
        if b >= n:
            a, b = a + n // 2, b - n
        return (a % m) * n + b

    triangles = np.array([t for a, b in product(range(m), range(n)) for t in
                          ((vertex(a, b), vertex(a + 1, b), vertex(a, b + 1)),
                           (vertex(a + 1, b), vertex(a + 1, b + 1), vertex(a, b + 1)))])
    edges = sorted({tuple(sorted(e)) for t in triangles for e in combinations(t, 2)})

    view, distance = dict(yaw=10, pitch=33), 6.0
    world = rotate(points, **view)
    flat, z = perspective(world, distance)
    facing = (rotate(normals, **view) * ((0, 0, distance) - world)).sum(axis=1) > 0
    lo, hi = flat.min(axis=0), flat.max(axis=0)
    screen = (flat - (lo + hi) / 2) * 6.5 / (hi - lo)[1] + (W / 2, H / 2)

    # which points are hidden: inside a nearer front-facing triangle on the screen
    front = triangles[facing[triangles].all(axis=1)]
    tri, tri_z = screen[front], z[front]

    def hidden(p, pz):
        a, b, c = tri[:, 0], tri[:, 1], tri[:, 2]
        d = (b[:, 1] - c[:, 1]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 1] - c[:, 1])
        l1 = ((b[:, 1] - c[:, 1]) * (p[0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (p[1] - c[:, 1])) / d
        l2 = ((c[:, 1] - a[:, 1]) * (p[0] - c[:, 0]) + (a[:, 0] - c[:, 0]) * (p[1] - c[:, 1])) / d
        l3 = 1 - l1 - l2
        inside = (l1 > 0.02) & (l2 > 0.02) & (l3 > 0.02)
        return (inside & (l1 * tri_z[:, 0] + l2 * tri_z[:, 1] + l3 * tri_z[:, 2] > pz + 1e-3)).any()

    near = (z - z.min()) / np.ptp(z)
    lit = np.clip(rotate(normals, **view) @ unit([-0.4, 0.6, 0.7]), 0, 1)
    shade = mix(np.array(to_rgb("#13283a")), np.array(to_rgb("#1f4a55")), lit[front].mean(axis=1))
    order = np.argsort(tri_z.mean(axis=1))
    ax.add_collection(PolyCollection(tri[order], facecolors=np.clip(shade[order], 0, 1), edgecolors="none",
                                     alpha=0.55, zorder=1))

    seen = np.array([not hidden(screen[[a, b]].mean(axis=0), z[[a, b]].mean()) for a, b in edges])
    depth = np.array([near[[a, b]].mean() for a, b in edges])
    lines = np.array([screen[[a, b]] for a, b in edges])
    glow(ax, list(lines[~seen]), TEAL, 1.2, fade=0.18, halo=0, hot=0, z=2)
    order = np.argsort(depth[seen])
    glow(ax, list(lines[seen][order]), TEAL, 2.4 * (0.6 + 0.4 * depth[seen][order]),
         fade=0.5 + 0.5 * depth[seen][order], halo=0.6, z=3)
    shown = np.array([not hidden(screen[k], z[k]) for k in range(len(points))])
    glow_dots(ax, screen[~shown], AMBER, 0.035, fade=0.2, halo=0, hot=0, z=2)
    glow_dots(ax, screen[shown], AMBER, 0.08, fade=0.6 + 0.4 * near[shown], halo=0.6, z=4)


COVERS = {
    "2026-hilbertgen-3d": hilbertgen_3d,
    "2026-fractional-order": fractional_order,
    "2026-riemannian-diffusion": riemannian_diffusion,
    "2026-uavgent": uavgent,
    "2025-POLTI": polti,
    "2024-LTI": lti,
    "2024-contraction": contraction,
    "2024-bandit": bandit,
    "2020-polyhedra": polyhedra,
    "2020-min-triangulation": min_triangulation,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("names", nargs="*", metavar="name",
                        help="the publication files to draw covers for, like 2026-hilbertgen-3d (default: all)")
    names = [Path(name).stem for name in parser.parse_args().names] or list(COVERS)
    unknown = [name for name in names if name not in COVERS]
    if unknown:
        parser.error(f"no cover drawn for {', '.join(unknown)}; the ones there are: {', '.join(COVERS)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        fig, ax = new_cover(dots=name != "2020-polyhedra")
        COVERS[name](ax)
        fig.canvas.draw()
        out = OUT_DIR / f"{name}.jpg"
        Image.fromarray(np.asarray(fig.canvas.buffer_rgba())[..., :3]).save(
            out, "JPEG", quality=85, optimize=True, progressive=True)
        print(f"{out.relative_to(OUT_DIR.parent.parent)}  ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
