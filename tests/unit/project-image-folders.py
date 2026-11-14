"""Run: python tests/unit/project-image-folders.py"""
import importlib.util
import sys
from pathlib import Path
import tempfile
from urllib.parse import quote

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('sync_project_images', Path(__file__).resolve().parents[2] / 'tools/assets/sync_project_images.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    folder = root / 'assets/images/projects/project-01'
    related = folder / 'related'
    related.mkdir(parents=True)
    page = root / 'pages/projects/project-01.html'
    page.parent.mkdir(parents=True)
    page.write_text(f'Before user content\n{sync.START}\n{sync.END}\nAfter user content', encoding='utf-8')
    names = ['anh-10.PNG', 'anh-2.jpg', 'ảnh & logo #1.webp'] + [f'photo-{i}.svg' for i in range(7)]
    for name in names:
        (related / name).write_text('image', encoding='utf-8')
    (related / 'notes.txt').write_text('ignore', encoding='utf-8')
    (related / '.hidden.png').write_text('ignore', encoding='utf-8')
    (folder / 'cover.jpg').write_text('ignore', encoding='utf-8')
    assert sync.sync_project(root, folder)
    html = page.read_text(encoding='utf-8')
    assert html.count('<figure') == len(names) == 10
    assert html.index('anh-2.jpg') < html.index('anh-10.PNG')
    assert quote(names[2], safe='') in html
    assert 'ảnh &amp; logo #1' in html
    assert html.startswith('Before user content\n') and html.endswith('\nAfter user content')
    assert not sync.sync_project(root, folder), 'No rewriting unchanged pages'
    (related / names[0]).write_text('replacement image', encoding='utf-8')
    assert sync.sync_project(root, folder), 'Replacement updates cache version'
    for name in names:
        (related / name).unlink()
    assert sync.sync_project(root, folder)
    assert '<figure' not in page.read_text(encoding='utf-8')
    assert 'Chưa có ảnh liên quan.' in page.read_text(encoding='utf-8')
print('PASS: all folder images, natural ordering, encoded URLs/escaped text, ignored non-images, add/remove/replace, empty state and preserved user content.')
