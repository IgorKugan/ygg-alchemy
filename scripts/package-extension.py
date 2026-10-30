"""Build a reproducible download, excluding tests and development dependencies."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'chrome-extension'
manifest = json.loads((SOURCE / 'manifest.json').read_text())
files = ['manifest.json', 'shared.js', 'background.js', 'calculator.js', 'shop-adapter.js', 'shop.js', 'popup.html', 'popup.js', 'popup.css', 'README.txt']
files += ['autocraft-core.js', 'autocraft-dom.js', 'autocraft-content.js', 'autocraft-background.js', 'autocraft-popup.js']
files += [f'icons/{size}.png' for size in (16, 48, 128)]
target = ROOT / 'downloads' / f'ygg-alchemy-extension-{manifest["version"]}.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for name in sorted(files):
        info = ZipInfo(name, date_time=(2026, 10, 30, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (SOURCE / name).read_bytes())
print(f'{target.relative_to(ROOT)} ({target.stat().st_size} bytes)')
