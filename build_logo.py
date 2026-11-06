"""Build a clean standalone Civil Registry seal PNG.

- Removes the orange box (fills with black).
- Removes the square corner background outside the outer ring
  (transparent) while keeping the white ring inside so text stays legible.
"""
from PIL import Image

SRC = "public/images/Civil Registry"
OUT = "public/images/Civil Registry/logo civil registry.png"

WHITE_TOL = 30
ORANGE_TOL = 28
R_KEEP = 236


def make_transparent_corners(img, r_keep):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    cx, cy = w / 2, h / 2
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    opx = out.load()
    r2 = r_keep * r_keep
    for y in range(h):
        for x in range(w):
            inside = (x - cx) ** 2 + (y - cy) ** 2 <= r2
            r, g, b, a = px[x, y]
            if inside:
                opx[x, y] = (r, g, b, a)
            elif abs(r - 255) < WHITE_TOL and abs(g - 255) < WHITE_TOL and abs(b - 255) < WHITE_TOL:
                opx[x, y] = (0, 0, 0, 0)
            else:
                opx[x, y] = (r, g, b, a)
    return out


def remove_orange(img):
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if abs(r - 211) < ORANGE_TOL and abs(g - 127) < ORANGE_TOL and abs(b - 37) < ORANGE_TOL:
                px[x, y] = (0, 0, 0, a)
    return img


img = Image.open(f"{SRC}/logo civil registry.jpg")
img = make_transparent_corners(img, R_KEEP)
img = remove_orange(img)
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
img.save(OUT)
print(f"Saved {OUT} {img.size}")