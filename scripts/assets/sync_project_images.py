"""Sync related/ image folders into static project pages; no dependencies."""
import argparse
from html import escape
from pathlib import Path
import re
import time
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg'}
START = '<!-- project-gallery:start -->'
END = '<!-- project-gallery:end -->'


def sync_project(root, folder):
    page = root / 'Project' / folder.name / 'index.html'
    if not page.is_file():
        return False
    with page.open(encoding='utf-8', newline='') as source:
        original = source.read()
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError(f'Missing or duplicate gallery markers: {page}')
    images = sorted(
        (image for image in (folder / 'related').iterdir()
         if image.is_file() and not image.name.startswith('.') and image.suffix.lower() in EXTENSIONS),
        key=lambda image: ([int(part) if part.isdigit() else part.casefold()
                            for part in re.split(r'(\d+)', image.name)], image.name),
    )
    lines = [START,
             '    <section aria-labelledby="project-gallery-title">',
             f'      <div class="project-gallery-heading"><h2 id="project-gallery-title">Hình ảnh liên quan</h2><p class="project-note">{len(images)} ảnh</p></div>',
             '      <div class="project-gallery">']
    for index, image in enumerate(images, 1):
        # Version the URL so replacing a file also refreshes cached images.
        stat = image.stat()
        src = quote(image.relative_to(root).as_posix(), safe='/') + f'?v={stat.st_mtime_ns}-{stat.st_size}'
        alt = escape(f'Ảnh liên quan {index}: {image.stem}', quote=True)
        lines.append(f'        <figure class="project-media" data-image-state="loading"><img src="{escape(src, quote=True)}" width="1200" height="900" alt="{alt}" loading="lazy" decoding="async" /><span class="project-skeleton" aria-hidden="true"></span><span class="project-image-error" hidden>Ảnh chưa sẵn sàng</span></figure>')
    lines.append('      </div>')
    if not images:
        lines.append('      <p class="project-note">Chưa có ảnh liên quan.</p>')
    lines.extend(['    </section>', '    ' + END])
    newline = '\r\n' if '\r\n' in original else '\n'
    begin = original.index(START)
    end = original.index(END, begin) + len(END)
    updated = original[:begin] + newline.join(lines) + original[end:]
    if updated == original:
        return False
    with page.open('w', encoding='utf-8', newline='') as target:
        target.write(updated)
    print(f'Updated {page.relative_to(root)}: {len(images)} images', flush=True)
    return True


def sync_all():
    for folder in sorted((ROOT / 'assets/images/projects').glob('project-*')):
        if folder.is_dir() and (folder / 'related').is_dir():
            sync_project(ROOT, folder)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--watch', action='store_true', help='Keep syncing when images are added, removed, renamed or replaced')
    args = parser.parse_args()
    try:
        sync_all()
        if args.watch:
            print('Watching project related/ folders (Ctrl+C to stop).', flush=True)
            while True:
                time.sleep(1)
                try:
                    sync_all()
                except (OSError, ValueError) as error:
                    print(f'Sync skipped; retrying: {error}', flush=True)
    except KeyboardInterrupt:
        pass
