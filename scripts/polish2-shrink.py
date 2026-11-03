# Polish 2: shrinks the committed screenshots (wider than 900 px to two thirds, JPEG quality 45).
#   python3 scripts/polish2-shrink.py docs/polish2/<dir>
import glob, sys
from PIL import Image
for f in glob.glob(sys.argv[1] + "/*.jpg"):
    im = Image.open(f).convert("RGB")
    if im.width > 900:
        im = im.resize((im.width * 2 // 3, im.height * 2 // 3), Image.LANCZOS)
    im.save(f, quality=45, optimize=True)
