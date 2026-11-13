"""Check local page/asset references without starting a server or installing dependencies."""
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
checked = set()


def check(value, source, base='/'):
    value = value.strip()
    parsed = urlsplit(value)
    if not value or parsed.scheme or parsed.netloc or value.startswith('#') or '${' in value:
        return
    target = unquote(urlsplit(urljoin(base, value)).path).lstrip('/')
    path = ROOT / target
    checked.add(target)
    if not path.is_file() and not (path.is_dir() and (path / 'index.html').is_file()):
        errors.append(f'{source}: {value} -> {target}')


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.base = '/' + source.relative_to(ROOT).as_posix()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            self.base = attrs.get('href', self.base)
            return
        for key in ['src', 'href', 'poster']:
            if key in attrs:
                check(attrs[key], self.source.relative_to(ROOT), self.base)


if __name__ == '__main__':
    for source in [ROOT / 'index.html', *(ROOT / 'Project').rglob('*.html'), *(ROOT / 'about').rglob('*.html')]:
        Page(source).feed(source.read_text(encoding='utf-8'))
    for source in (ROOT / 'src/styles').rglob('*.css'):
        for match in re.finditer(r'url\(\s*(["\x27]?)(.*?)\1\s*\)', source.read_text(encoding='utf-8')):
            check(match[2], source.relative_to(ROOT), '/' + source.relative_to(ROOT).as_posix())
    for source in (ROOT / 'src/scripts').rglob('*.js'):
        for match in re.finditer(r'["\x27](assets/[^"\x27]+)["\x27]', source.read_text(encoding='utf-8')):
            check(match[1], source.relative_to(ROOT))
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'PASS: {len(checked)} unique local routes and assets, including CSS and JavaScript references.')
