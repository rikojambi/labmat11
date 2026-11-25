"""Generate Labmat PWA icons. Jalankan: py -3 tools/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parents[1] / "assets"
out.mkdir(exist_ok=True)

svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="96" fill="#0b2a4f"/>
<circle cx="256" cy="256" r="168" fill="none" stroke="#20c7b7" stroke-width="26"/>
<path d="M188 150v170h104" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="342" cy="170" r="24" fill="#ffd166"/></svg>'''
(out / "icon.svg").write_text(svg, encoding="utf-8")


def font(size):
    for name in ("arialbd.ttf", "segoeuihd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    img = Image.new("RGB", (size, size), "#0b2a4f")
    d = ImageDraw.Draw(img)
    s = size / 512
    pad = 56 * s if maskable else 0
    box = [pad, pad, size - pad, size - pad]
    d.ellipse(box, outline="#20c7b7", width=max(2, int(26 * s)))
    d.line([(188 * s + pad, 150 * s + pad), (188 * s + pad, 320 * s + pad),
            (292 * s + pad, 320 * s + pad)], fill="#ffffff", width=max(3, int(38 * s)), joint="curve")
    r = max(2, int(24 * s))
    d.ellipse([342 * s + pad - r, 170 * s + pad - r, 342 * s + pad + r, 170 * s + pad + r], fill="#ffd166")
    if size >= 192:
        f = font(int(48 * s))
        d.text((size / 2, size - (86 if maskable else 62) * s), "LABMAT XI", font=f,
               fill="#e8f4ff", anchor="mm")
    return img


for n in (192, 512):
    draw_icon(n).save(out / f"icon-{n}.png")
draw_icon(512, True).save(out / "icon-maskable-512.png")
print("Ikon dibuat di", out)
