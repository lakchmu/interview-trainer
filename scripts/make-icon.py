#!/usr/bin/env python3
"""
Рисует иконку приложения: рассветное небо и три гряды гор — та же сцена,
что в самом приложении. Пишет PNG вручную (zlib + struct), чтобы не тянуть
Pillow ради одного файла.

Использование: python3 scripts/make-icon.py out.png [размер]
"""
import math
import struct
import sys
import zlib

SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 1024
OUT = sys.argv[1] if len(sys.argv) > 1 else 'icon.png'

# Поле иконки по гайдлайнам macOS: скруглённый квадрат с полями по краям
INSET = SIZE * 0.098
RADIUS = SIZE * 0.180
LEFT, TOP = INSET, INSET
RIGHT, BOTTOM = SIZE - INSET, SIZE - INSET
W = RIGHT - LEFT
H = BOTTOM - TOP

# Палитра фазы «рассвет» из styles.css
SKY = [
    (0.00, (0x14, 0x1a, 0x3c)),
    (0.34, (0x3b, 0x2b, 0x5e)),
    (0.58, (0x6a, 0x4a, 0x7d)),
    (0.82, (0xd4, 0x82, 0x6f)),
    (1.00, (0xf4, 0xa9, 0x7e)),
]
RIDGES = [
    # (цвет, точки силуэта в долях ширины/высоты поля)
    ((0x4a, 0x3a, 0x63), [(0, .60), (.09, .44), (.16, .52), (.25, .28), (.33, .43),
                          (.39, .38), (.46, .52), (.55, .33), (.62, .44), (.73, .22),
                          (.82, .42), (.89, .49), (.96, .38), (1, .48)]),
    ((0x2f, 0x27, 0x48), [(0, .72), (.14, .58), (.27, .70), (.42, .53), (.50, .63),
                          (.62, .50), (.76, .68), (.87, .58), (1, .66)]),
    ((0x19, 0x14, 0x30), [(0, .84), (.15, .76), (.30, .88), (.46, .80), (.60, .90),
                          (.74, .82), (.88, .90), (1, .84)]),
]
SUN = (0.63, 0.40, 0.075, (0xff, 0xd7, 0xa3))  # x, y, радиус — в долях поля
STARS = [(.12, .13), (.22, .07), (.34, .17), (.47, .09), (.58, .19),
         (.69, .11), (.79, .21), (.88, .10), (.93, .25), (.17, .26)]


def lerp(a, b, t):
    return a + (b - a) * t


def sky_color(t):
    """Цвет неба на вертикальной доле t по многоточечному градиенту."""
    for i in range(len(SKY) - 1):
        p0, c0 = SKY[i]
        p1, c1 = SKY[i + 1]
        if t <= p1:
            k = 0 if p1 == p0 else (t - p0) / (p1 - p0)
            return [lerp(c0[j], c1[j], k) for j in range(3)]
    return list(SKY[-1][1])


def ridge_y(points, x):
    """Высота гряды в точке x (доли), линейная интерполяция между вершинами."""
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        if x0 <= x <= x1:
            k = 0 if x1 == x0 else (x - x0) / (x1 - x0)
            return lerp(y0, y1, k)
    return points[-1][1]


def rounded_alpha(px, py):
    """Сглаженная маска скруглённого квадрата: 0 снаружи, 1 внутри."""
    if px < LEFT or px > RIGHT or py < TOP or py > BOTTOM:
        return 0.0
    # ближайший центр скругления
    cx = min(max(px, LEFT + RADIUS), RIGHT - RADIUS)
    cy = min(max(py, TOP + RADIUS), BOTTOM - RADIUS)
    d = math.hypot(px - cx, py - cy)
    if d <= RADIUS - 1:
        return 1.0
    if d >= RADIUS + 1:
        return 0.0
    return (RADIUS + 1 - d) / 2.0


rows = bytearray()
sun_x, sun_y, sun_r, sun_c = SUN

for py in range(SIZE):
    rows.append(0)  # фильтр строки: none
    row = bytearray()
    for px in range(SIZE):
        a = rounded_alpha(px + 0.5, py + 0.5)
        if a <= 0:
            row += b'\x00\x00\x00\x00'
            continue

        u = (px + 0.5 - LEFT) / W  # доля по ширине поля
        v = (py + 0.5 - TOP) / H   # доля по высоте поля
        r, g, b = sky_color(min(max(v, 0.0), 1.0))

        # звёзды — только в верхней части, гаснут к горизонту
        for sx, sy in STARS:
            d = math.hypot((u - sx) * W, (v - sy) * H)
            if d < 3.2:
                k = (1 - d / 3.2) * max(0.0, 1 - v / 0.32)
                r, g, b = (lerp(r, 255, k), lerp(g, 255, k), lerp(b, 245, k))

        # солнце: диск + мягкое свечение
        d = math.hypot((u - sun_x) * W, (v - sun_y) * H)
        disc = sun_r * W
        if d < disc * 4:
            k = 1.0 if d <= disc else max(0.0, 1 - (d - disc) / (disc * 3)) ** 2 * 0.55
            r = lerp(r, sun_c[0], k)
            g = lerp(g, sun_c[1], k)
            b = lerp(b, sun_c[2], k)

        # горы: сплошная заливка ниже линии гряды, со сглаживанием кромки
        for color, pts in RIDGES:
            edge = ridge_y(pts, u) * H
            dy = (v * H) - edge
            if dy > 0.7:
                r, g, b = color
            elif dy > -0.7:
                k = (dy + 0.7) / 1.4
                r, g, b = (lerp(r, color[0], k), lerp(g, color[1], k), lerp(b, color[2], k))

        row += bytes((int(r), int(g), int(b), int(a * 255)))
    rows += row


def chunk(tag, data):
    return (struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))


png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(bytes(rows), 9))
       + chunk(b'IEND', b''))

with open(OUT, 'wb') as f:
    f.write(png)
print(f'{OUT}: {SIZE}x{SIZE}, {len(png) // 1024} КБ')
