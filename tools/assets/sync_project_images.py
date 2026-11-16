"""Sync related/ image folders into static project pages; Pillow adds image dimensions."""
import argparse
from html import escape
from pathlib import Path
import re
import time
from urllib.parse import quote

try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[2]
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.mp4'}
START = '<!-- project-gallery:start -->'
END = '<!-- project-gallery:end -->'


def image_dimensions(path):
    if Image is not None:
        try:
            with Image.open(path) as image:
                width, height = image.size
                if image.getexif().get(274) in {5, 6, 7, 8}:
                    width, height = height, width
                return width, height
        except (OSError, ValueError):
            pass
    return 1200, 900


def media_url(root, path):
    stat = path.stat()
    return escape(quote(path.relative_to(root).as_posix(), safe='/') + f'?v={stat.st_mtime_ns}-{stat.st_size}', quote=True)


def folder_images(folder):
    return sorted(
        (image for image in folder.iterdir()
         if image.is_file() and not image.name.startswith('.') and image.suffix.lower() in EXTENSIONS
         and not (image.stem.endswith('-poster') and image.with_name(image.stem[:-7] + '.mp4').is_file())),
        key=lambda image: ([int(part) if part.isdigit() else part.casefold()
                            for part in re.split(r'(\d+)', image.name)], image.name),
    )


def media_markup(root, image, index):
    src = media_url(root, image)
    if image.suffix.lower() == '.mp4':
        poster = image.with_name(image.stem + '-poster.webp')
        width, height = image_dimensions(poster)
        poster_attr = f' poster="{media_url(root, poster)}"' if poster.is_file() else ''
        label = escape(f'Video liên quan {index}: {image.stem}', quote=True)
        return f'<figure class="project-media project-video"><video src="{src}"{poster_attr} width="{width}" height="{height}" style="aspect-ratio: {width} / {height}" controls playsinline preload="none" aria-label="{label}">Trình duyệt chưa hỗ trợ video.</video><span class="project-image-error" hidden>Video chưa sẵn sàng</span></figure>'
    alt = escape(f'Ảnh liên quan {index}: {image.stem}', quote=True)
    width, height = image_dimensions(image)
    return f'<figure class="project-media" data-image-state="loading"><img src="{src}" width="{width}" height="{height}" alt="{alt}" loading="lazy" decoding="async" /><span class="project-skeleton" aria-hidden="true"></span><span class="project-image-error" hidden>Ảnh chưa sẵn sàng</span></figure>'


def sync_project(root, folder):
    page = root / 'pages/projects' / f'{folder.name}.html'
    if not page.is_file():
        return False
    with page.open(encoding='utf-8', newline='') as source:
        original = source.read()
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError(f'Missing or duplicate gallery markers: {page}')
    related = folder / 'related'
    groups = [(child.name, folder_images(child)) for child in sorted(related.iterdir())
              if child.is_dir() and not child.name.startswith('.')]
    groups = [(name, items) for name, items in groups if items]
    grouped = bool(groups)
    ungrouped = folder_images(related)
    if ungrouped or not grouped:
        groups.append(('', ungrouped))
    images = [image for _, items in groups for image in items]
    video_count = sum(image.suffix.lower() == '.mp4' for image in images)
    count = f'{len(images) - video_count} ảnh · {video_count} video' if video_count else f'{len(images)} ảnh'
    lines = [START,
             '    <section aria-labelledby="project-gallery-title">',
             f'      <div class="project-gallery-heading"><h2 id="project-gallery-title">Hình ảnh liên quan</h2><p class="project-note">{count}</p></div>',
             f'      <div class="project-gallery{" project-gallery--grouped" if grouped else ""}">']
    index = 0
    for name, items in groups:
        if grouped:
            label = escape(re.sub(r'^\d+-', '', name).replace('-', ' ').title() or 'Ảnh khác', quote=True)
            lines.append(f'        <div class="project-gallery-group" role="group" aria-label="{label}" data-gallery-group="{escape(name, quote=True)}">')
        for image in items:
            index += 1
            lines.append(('          ' if grouped else '        ') + media_markup(root, image, index))
        if grouped:
            lines.append('        </div>')
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
