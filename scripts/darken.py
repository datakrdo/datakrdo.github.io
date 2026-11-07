"""Dark variant of a light chart: neutral pixels (background, text, grid) are inverted onto the site's dark palette, coloured pixels (bars, lines) are kept.
Usage: darken.py <in.png> <out.png>
shortcut: anti-aliased edges between a coloured mark and the background keep a faint light fringe, redraw the chart in dark if it ever bothers."""
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float)
sat = img.max(2) - img.min(2)
w = np.clip(sat / 60, 0, 1)[..., None]  # 0 = neutral, 1 = coloured
lum = img.mean(2, keepdims=True) / 255
neutral = 5 + (1 - lum) * (242 - 5)  # white -> site bg #050505, black -> text #f2f2f2
out = w * img + (1 - w) * neutral
Image.fromarray(out.clip(0, 255).astype("uint8")).save(sys.argv[2])
