"""
Builds every app icon and splash image from the brand logo.

    python3 scripts/generate-icons.py

The source (assets/brand/logo-source.png) holds the logo twice: dark on white
above, white and gold on deep green below. The lower, white-on-green version is
the one cut out here, because it reads best as an app icon.

The mark is only ~330px wide in the source, so the largest outputs are enlarged
and slightly soft. Replace the source with a vector or a >=1500px original and
re-run this script for a crisp 1024px icon — the stores display it that large.
"""
from PIL import Image, ImageFilter
import os

SRC = "assets/brand/logo-source.png"
OUT = "assets/images"
GREEN = (3, 77, 48)           # sampled from the logo's own background

im = Image.open(SRC).convert("RGB")
mark = im.crop((560, 540, 897, 826))          # the heart + figures, no wordmark

# Key the green out to transparency with a soft edge, so the mark can sit on
# any background (Android adaptive icons composite it over their own layer).
def key_out_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            d = abs(r - GREEN[0]) + abs(g - GREEN[1]) + abs(b - GREEN[2])
            a = max(0, min(255, (d - 25) * 255 // 90))      # 0 at the bg colour, opaque past ~115
            px[x, y] = (r, g, b, a)
    return rgba

mark_rgba = key_out_green(mark)

def fit(img: Image.Image, width: int) -> Image.Image:
    h = round(img.height * width / img.width)
    return img.resize((width, h), Image.LANCZOS)

def on_canvas(img: Image.Image, size: int, bg=None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return canvas

os.makedirs(OUT, exist_ok=True)

# iOS / store icon: opaque (Apple rejects transparency), mark at ~64% of the width.
on_canvas(fit(mark_rgba, 660), 1024, GREEN).convert("RGB").save(f"{OUT}/icon.png")

# Android adaptive icon. The OS crops to a circle/squircle, so everything that
# matters must sit inside the central 66% (~676px of 1024).
on_canvas(fit(mark_rgba, 560), 1024).save(f"{OUT}/android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), (*GREEN, 255)).save(f"{OUT}/android-icon-background.png")

# Android 13+ themed icon: a single-colour silhouette; the system tints it.
sil = mark_rgba.copy()
sil.putdata([(255, 255, 255, px[3]) for px in sil.get_flattened_data()] if hasattr(sil, 'get_flattened_data') else [(255, 255, 255, px[3]) for px in sil.getdata()])
on_canvas(fit(sil, 560), 1024).save(f"{OUT}/android-icon-monochrome.png")

# Splash: the mark alone; its background colour is set in app.json.
on_canvas(fit(mark_rgba, 600), 1024).save(f"{OUT}/splash-icon.png")

# Android status-bar notification icon: a white silhouette on transparency,
# or the system draws the full-colour logo as a solid grey square.
on_canvas(fit(sil, 80), 96).save(f"{OUT}/notification-icon.png")

# Favicon (only used by the web build, which isn't shipped).
on_canvas(fit(mark_rgba, 44), 48, GREEN).convert("RGB").save(f"{OUT}/favicon.png")
print("wrote icon, android foreground/background/monochrome, splash, favicon")
