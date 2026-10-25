"""Local-only theme workshop. Standard HTTP server; no hosted Python service."""
import argparse
import base64
import binascii
import io
import json
import mimetypes
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote, parse_qs
import uuid
import unicodedata
import webbrowser
import zipfile

from PIL import Image, ImageOps
from mutagen.mp3 import MP3
from mutagen import MutagenError
from image_tools import calc_size_contain

ROOT = Path(__file__).resolve().parent.parent
MAX_BODY = 64 * 1024 * 1024
MAX_ZIP = 50 * 1024 * 1024
MAX_ASSET = 8 * 1024 * 1024
IMAGE_SIZE = 187
LAYOUT_BEGIN = '// BEGIN ENGLISH TBI LOCAL THEMES'
LAYOUT_END = '// END ENGLISH TBI LOCAL THEMES'
ID = re.compile(r'^[a-f0-9]{32}$')
Image.MAX_IMAGE_PIXELS = 20_000_000


def text(value, limit, field):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ValueError(f'{field} : texte requis, {limit} caractères maximum.')
    return value.strip()


def decode(value):
    if not isinstance(value, str) or ',' not in value:
        raise ValueError('Fichier manquant ou illisible.')
    try:
        result = base64.b64decode(value.split(',', 1)[1], validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('Fichier encodé invalide.')
    if not result or len(result) > MAX_ASSET:
        raise ValueError('Chaque fichier doit peser entre 1 octet et 8 Mo.')
    return result


def image_png(data):
    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.width * source.height > 20_000_000:
                raise ValueError('Image trop grande.')
            source.load()
            picture = ImageOps.exif_transpose(source).convert('RGBA')
            size = calc_size_contain(picture.width, picture.height, IMAGE_SIZE, IMAGE_SIZE)
            picture = picture.resize(size, Image.Resampling.LANCZOS)
            result = Image.new('RGBA', (IMAGE_SIZE, IMAGE_SIZE), (0, 0, 0, 0))
            result.alpha_composite(picture, ((IMAGE_SIZE-picture.width)//2, (IMAGE_SIZE-picture.height)//2))
            output = io.BytesIO()
            result.save(output, 'PNG')
            return output.getvalue()
    except (OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError('Image invalide ou trop grande. Choisissez un PNG, JPEG ou WebP valide.')


def check_audio(data):
    if not (data.startswith(b'ID3') or (len(data) > 2 and data[0] == 255 and data[1] & 224 == 224)):
        raise ValueError('Le son doit être un fichier MP3 valide.')
    try:
        if MP3(io.BytesIO(data)).info.length <= 0:
            raise ValueError('Son vide.')
    except (MutagenError, ValueError, OSError):
        raise ValueError('Le MP3 est incomplet ou illisible.')
    return data


def build_pack(payload):
    name = text(payload.get('name'), 80, 'Nom du thème')
    credit = payload.get('credit', '')
    if not isinstance(credit, str) or len(credit) > 2000:
        raise ValueError('Crédits : 2 000 caractères maximum.')
    cards = payload.get('cards')
    if not isinstance(cards, list) or not 2 <= len(cards) <= 60:
        raise ValueError('Prévoyez de 2 à 60 cartes pour utiliser les sept activités.')
    theme_id = payload.get('id') or uuid.uuid4().hex
    if not isinstance(theme_id, str) or not ID.fullmatch(theme_id):
        raise ValueError('Identifiant de thème invalide.')
    manifest = {'format': 'english-tbi-theme', 'version': 1, 'id': theme_id,
                'name': name, 'credit': credit, 'cards': []}
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for card in cards:
            label = text(card.get('label'), 100, 'Mot anglais')
            cid = uuid.uuid4().hex
            image = image_png(decode(card.get('image')))
            if not card.get('audio'):
                raise ValueError(f'« {label} » : générez un son ou importez un MP3 avant d’enregistrer.')
            audio = check_audio(decode(card.get('audio')))
            item = {'id': cid, 'label': label, 'image': f'images/{cid}.png', 'audio': f'audio/{cid}.mp3'}
            archive.writestr(item['image'], image)
            archive.writestr(item['audio'], audio)
            manifest['cards'].append(item)
        archive.writestr('manifest.json', json.dumps(manifest, ensure_ascii=False))
    result = output.getvalue()
    if len(result) > MAX_ZIP:
        raise ValueError('Thème trop volumineux (50 Mo maximum).')
    return manifest, result


def read_pack(data):
    if len(data) > MAX_ZIP:
        raise ValueError('Archive trop volumineuse (50 Mo maximum).')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            files = archive.infolist()
            names = [f.filename for f in files]
            if len(files) > 121 or len(set(names)) != len(names) or sum(f.file_size for f in files) > MAX_ZIP:
                raise ValueError('Archive trop volumineuse ou fichiers en double.')
            for file in files:
                path = PurePosixPath(file.filename)
                if path.is_absolute() or '..' in path.parts or '\\' in file.filename or file.file_size > MAX_ASSET:
                    raise ValueError('Chemin ou taille de fichier interdit dans le thème.')
            manifest = json.loads(archive.read('manifest.json'))
            if not isinstance(manifest, dict) or manifest.get('format') != 'english-tbi-theme' or manifest.get('version') != 1:
                raise ValueError('Ce ZIP n’est pas un thème English TBI version 1.')
            cards = manifest.get('cards')
            if not isinstance(cards, list) or not 2 <= len(cards) <= 60:
                raise ValueError('Le thème doit contenir de 2 à 60 cartes.')
            payload = {'id': manifest.get('id'), 'name': manifest.get('name'), 'credit': manifest.get('credit', ''), 'cards': []}
            for card in cards:
                if not isinstance(card, dict):
                    raise ValueError('Carte invalide.')
                entry = {'label': card.get('label')}
                for field, media in [('image', 'image/png'), ('audio', 'audio/mpeg')]:
                    name = card.get(field)
                    if not isinstance(name, str) or name not in names or name == 'manifest.json':
                        raise ValueError('Image ou son absent du ZIP.')
                    entry[field] = f'data:{media};base64,' + base64.b64encode(archive.read(name)).decode()
                payload['cards'].append(entry)
            return build_pack(payload)
    except (zipfile.BadZipFile, KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError, RuntimeError) as exc:
        raise ValueError('Archive de thème invalide ou incomplète.') from exc


def theme_key(manifest):
    return manifest.get('builtin_key') or 'theme-'+manifest['id']


def slug(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    result = re.sub(r'[^a-z0-9]+', '-', value).strip('-')[:60] or 'theme'
    if result in {'con','prn','aux','nul'} or re.fullmatch(r'(com|lpt)[0-9]', result):
        result = 'theme-' + result
    return result


def repack(manifest, data):
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as dest:
            for name in source.namelist():
                dest.writestr(name, json.dumps(manifest, ensure_ascii=False) if name == 'manifest.json' else source.read(name))
    return output.getvalue()


def atomic_files(updates):
    # Stage all files before modifying any target, and roll back a partial write.
    staged, originals = {}, {}
    try:
        for path, data in updates.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            originals[path] = path.read_bytes() if path.exists() else None
            fd, name = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
            with os.fdopen(fd, 'wb') as stream:
                stream.write(data)
            staged[path] = Path(name)
        changed = []
        try:
            for path, temp in staged.items():
                os.replace(temp, path)
                changed.append(path)
        except OSError:
            for path in reversed(changed):
                if originals[path] is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(originals[path])
            raise
    finally:
        for temp in staged.values():
            temp.unlink(missing_ok=True)


class WorkshopServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, port=0, data_dir=None):
        self.data_dir = Path(data_dir or ROOT/'donnees_locales')
        self.data_dir.mkdir(parents=True, exist_ok=True)
        # Tests/CLI --data-dir use an isolated site so they never modify the checkout.
        self.project_dir = self.data_dir/'site' if data_dir else ROOT
        self.project_dir.mkdir(parents=True, exist_ok=True)
        self.cards_file = self.project_dir/'cards.js'
        if not self.cards_file.exists():
            self.cards_file.write_bytes((ROOT/'cards.js').read_bytes())
        self.token = secrets.token_urlsafe(32)
        self.write_lock = threading.Lock()
        self.tts_lock = threading.Lock()
        self.migration_warnings = []
        self.seed_builtin_themes()
        self.migrate_themes()
        super().__init__(('127.0.0.1', port), Handler)

    def seed_builtin_themes(self):
        source = (ROOT/'cards.js').read_text(encoding='utf-8')
        match = re.search(r'window.CARD_SETS\s*=\s*', source)
        sets, _ = json.JSONDecoder().raw_decode(source[match.end():])
        for name, cards in sets.items():
            tid = uuid.uuid5(uuid.NAMESPACE_URL, 'english-tbi-builtin:'+name).hex
            if self.path_for(tid).exists():
                continue
            manifest = {'format':'english-tbi-theme','version':1,'id':tid,'name':name,
                        'credit':'Ressources du thème fourni dans english.zip.',
                        'builtin_key':name,'layout':2,'folder':name,'cards':[]}
            output = io.BytesIO()
            updates = {}
            with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
                for c in cards:
                    filename = Path(c['img']).stem
                    item = {'id':c['id'],'label':c['label'],'file':filename,
                            'image':'images/'+filename+'.png','audio':'audio/'+filename+'.mp3'}
                    manifest['cards'].append(item)
                    for field, kind, ext in [('image','flashcards','.png'),('audio','audio','.mp3')]:
                        original = ROOT/(c['img'] if field=='image' else c['audio'])
                        content = original.read_bytes()
                        archive.writestr(item[field],content)
                        target = self.project_dir/kind/name/(filename+ext)
                        if not target.exists(): updates[target] = content
                archive.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False))
            data = output.getvalue()
            updates[self.path_for(tid)] = data
            backup = self.data_dir/'originaux'/ (tid+'.zip')
            if not backup.exists(): updates[backup] = data
            atomic_files(updates)

    def path_for(self, tid):
        if not ID.fullmatch(tid):
            raise ValueError('Identifiant invalide.')
        return self.data_dir / (tid+'.zip')

    def manifests(self):
        result = []
        for file in sorted(self.data_dir.glob('*.zip')):
            try:
                with zipfile.ZipFile(file) as archive:
                    m = json.loads(archive.read('manifest.json'))
                if not isinstance(m, dict) or m.get('id') != file.stem or not isinstance(m.get('cards'), list):
                    raise ValueError('Métadonnées invalides.')
                result.append(m)
            except (OSError, KeyError, ValueError, zipfile.BadZipFile):
                continue
        return result

    def registry(self, current):
        entries, labels = {}, {}
        for m in [x for x in self.manifests() if x['id'] != current['id']] + [current]:
            if m.get('layout') != 2:
                continue
            key = theme_key(m)
            labels[key] = m['name']
            entries[key] = [{'id':c['id'], 'label':c['label'],
                             'img':'flashcards/'+m['folder']+'/'+c['file']+'.png',
                             'audio':'audio/'+m['folder']+'/'+c['file']+'.mp3'} for c in m['cards']]
        script = self.cards_file.read_text(encoding='utf-8')
        if LAYOUT_BEGIN in script:
            a = script.index(LAYOUT_BEGIN)
            b = script.index(LAYOUT_END, a) + len(LAYOUT_END)
            script = script[:a] + script[b:]
        return script.rstrip()+'\n\n'+LAYOUT_BEGIN+'\nObject.assign(window.CARD_SETS, '+json.dumps(entries, ensure_ascii=False, indent=2)+');\nwindow.THEME_NAMES = '+json.dumps(labels,ensure_ascii=False)+';\n'+LAYOUT_END+'\n'

    def store(self, manifest, data):
        target = self.path_for(manifest['id'])
        with self.write_lock:
            old = next((m for m in self.manifests() if m['id'] == manifest['id']), None)
            folder = old.get('folder') if old else None
            if old and old.get('builtin_key'):
                manifest['builtin_key'] = old['builtin_key']
            if not folder:
                occupied = set()
                for root in {ROOT, self.project_dir}:
                    for kind in ['flashcards', 'audio']:
                        if (root/kind).exists():
                            occupied.update(f.name.casefold() for f in (root/kind).iterdir())
                folder = base = slug(manifest['name'])
                number = 2
                while folder.casefold() in occupied:
                    folder = f'{base}-{number}'
                    number += 1
            if not re.fullmatch(r'[a-z0-9][a-z0-9 -]*', folder):
                raise ValueError('Dossier de thème invalide.')
            manifest['folder'] = folder
            manifest['layout'] = 2
            # Human-readable filenames; never overwrite an unowned existing file.
            owned = {c.get('file') for c in old['cards']} if old else set()
            used = set()
            updates = {}
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for card in manifest['cards']:
                    filename = base = slug(card['label'])
                    number = 2
                    while (filename in used or (filename not in owned and any(
                        (self.project_dir/kind/folder/(filename+ext)).exists()
                        for kind, ext in [('flashcards','.png'),('audio','.mp3')]))):
                        filename = f'{base}-{number}'
                        number += 1
                    used.add(filename)
                    card['file'] = filename
                    updates[self.project_dir/'flashcards'/folder/(filename+'.png')] = archive.read(card['image'])
                    updates[self.project_dir/'audio'/folder/(filename+'.mp3')] = archive.read(card['audio'])
            updates[target] = repack(manifest, data)
            updates[self.cards_file] = self.registry(manifest).encode('utf-8')
            atomic_files(updates)
        return folder

    def migrate_themes(self):
        # Keep the previous ZIP before converting version-1 local themes to 187 px.
        for file in sorted(self.data_dir.glob('*.zip')):
            try:
                data = file.read_bytes()
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    old = json.loads(archive.read('manifest.json'))
                if old.get('layout') == 2:
                    folder = old.get('folder', '')
                    if not re.fullmatch(r'[a-z0-9][a-z0-9 -]*', folder):
                        raise ValueError('Dossier invalide.')
                    complete = all(re.fullmatch(r'[a-z0-9-]+', c.get('file', '')) and
                        all((self.project_dir/kind/folder/(c['file']+ext)).is_file()
                            for kind,ext in [('flashcards','.png'),('audio','.mp3')]) for c in old['cards'])
                    key = theme_key(old)
                    if complete and json.dumps(key) in self.cards_file.read_text(encoding='utf-8') and 'window.THEME_NAMES =' in self.cards_file.read_text(encoding='utf-8'):
                        continue
                manifest, converted = read_pack(data)
                if old.get('layout') != 2:
                    backup = self.data_dir/'avant_migration_187'/file.name
                    if not backup.exists():
                        atomic_files({backup:data})
                self.store(manifest, converted)
            except (OSError, KeyError, ValueError, zipfile.BadZipFile):
                self.migration_warnings.append(f'{file.name} : migration impossible, archive conservée.')

    def session_data(self, tid):
        self.path_for(tid).read_bytes()
        file = self.data_dir/'seances'/(tid+'.json')
        try:
            data = json.loads(file.read_text(encoding='utf-8'))
            if isinstance(data, dict): return data
        except (OSError, ValueError): pass
        return {'selected':None,'resources':[]}

    def selected_cards(self, tid, cards):
        selected = self.session_data(tid).get('selected')
        if selected is None: return cards
        filtered = [c for c in cards if c.get('file',c['id']) in selected]
        return filtered if len(filtered) >= 2 else cards

    def catalog(self):
        themes, warnings = [], list(self.migration_warnings)
        valid = {m['id']:m for m in self.manifests()}
        for file in sorted(self.data_dir.glob('*.zip')):
            m = valid.get(file.stem)
            if m:
                themes.append({'id':file.stem, 'name':m['name'], 'count':len(m['cards']), 'folder':m.get('folder'),'key':theme_key(m),'builtin':bool(m.get('builtin_key'))})
            else:
                warnings.append(f'{file.name} est illisible ; fichier conservé pour récupération.')
        return themes, warnings


class Handler(BaseHTTPRequestHandler):
    server_version = 'EnglishTBILocal/1'
    def log_message(self, *args):
        pass

    def allowed_host(self):
        return self.headers.get('Host') in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}

    def send(self, body, mime='application/json; charset=utf-8', status=200, filename=None):
        if isinstance(body, dict): body = json.dumps(body, ensure_ascii=False).encode()
        if isinstance(body, str): body = body.encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        if filename: self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self.allowed_host(): return self.send({'error':'Hôte interdit.'}, status=403)
        path = unquote(urlsplit(self.path).path)
        try:
            if path == '/api/session':
                return self.send({'token':self.server.token})
            if path == '/api/themes':
                themes, warnings = self.server.catalog()
                return self.send({'themes':themes,'warnings':warnings})
            if path.startswith('/api/lesson/'):
                return self.send(self.server.session_data(path.split('/')[-1]))
            if path.startswith('/resource/'):
                _,_,tid,filename = path.split('/')
                self.server.path_for(tid)
                if not re.fullmatch(r'[a-f0-9]{32}\.(mp3|mp4|webm|ogg|pdf)',filename): raise ValueError('Fichier invalide.')
                file = self.server.data_dir/'ressources'/tid/filename
                return self.send(file.read_bytes(),mimetypes.guess_type(filename)[0] or 'application/octet-stream')
            if path.startswith('/api/themes/'):
                parts = path.split('/')
                tid = parts[3]
                data = self.server.path_for(tid).read_bytes()
                if len(parts)==5 and parts[4]=='export':
                    return self.send(data, 'application/zip', filename=f'theme-{tid[:8]}.zip')
                with zipfile.ZipFile(io.BytesIO(data)) as z:
                    m = json.loads(z.read('manifest.json'))
                    m['key'] = theme_key(m)
                    if parse_qs(urlsplit(self.path).query).get('selection') == ['1']:
                        m['cards'] = self.server.selected_cards(tid,m['cards'])
                    for card in m['cards']:
                        for key, mime in [('image','image/png'),('audio','audio/mpeg')]:
                            card[key] = f'data:{mime};base64,'+base64.b64encode(z.read(card[key])).decode()
                    return self.send(m)
            if path.startswith('/themes/'):
                _, _, tid, kind, asset = path.split('/')
                if kind not in ['images','audio'] or not re.fullmatch(r'[a-f0-9]{32}\.(png|mp3)',asset):
                    raise ValueError('Ressource invalide.')
                with zipfile.ZipFile(self.server.path_for(tid)) as z: data=z.read(kind+'/'+asset)
                return self.send(data, 'image/png' if kind=='images' else 'audio/mpeg')
            if path == '/app/cards.js':
                script = self.server.cards_file.read_text(encoding='utf-8')
                ids = {}
                for m in self.server.manifests():
                    key = theme_key(m)
                    ids[key] = m['id']
                    labels = [c['id'] for c in self.server.selected_cards(m['id'],m['cards'])]
                    script += '\nwindow.CARD_SETS['+json.dumps(key)+'] = window.CARD_SETS['+json.dumps(key)+'].filter(c => '+json.dumps(labels)+'.includes(c.id));'
                script += '\nwindow.THEME_IDS = '+json.dumps(ids)+';'
                return self.send(script, 'text/javascript; charset=utf-8')
            if path in ['/', '/index.html']:
                file=ROOT/'local/web/index.html'
            elif path.startswith('/app/'):
                rel=path[5:] or 'index.html'
                if not (rel in ['index.html','styles.css','cards.js'] or rel.startswith(('js/','audio/','flashcards/'))):
                    return self.send({'error':'Page introuvable.'},status=404)
                local_file = (self.server.project_dir/rel).resolve()
                if not local_file.is_relative_to(self.server.project_dir.resolve()):
                    raise ValueError('Chemin interdit.')
                if rel.startswith(('flashcards/', 'audio/')) and local_file.is_file() and any(local_file.is_relative_to((self.server.project_dir/kind).resolve()) for kind in ['flashcards','audio']):
                    return self.send(local_file.read_bytes(), 'image/png' if local_file.suffix.lower()=='.png' else 'audio/mpeg')
                file=(ROOT/rel).resolve()
                if not file.is_relative_to(ROOT): raise ValueError('Chemin interdit.')
                resolved = file.relative_to(ROOT).as_posix()
                if not (resolved in ['index.html','styles.css','cards.js'] or any(file.is_relative_to(ROOT/d) for d in ['js','audio','flashcards'])):
                    raise ValueError('Chemin interdit.')
            elif path in ['/atelier.js','/atelier.css','/print.html','/print.js','/print.css','/session.html','/session.js','/common.css','/navigation.js']:
                file=ROOT/'local/web'/path[1:]
            elif path=='/favicon.ico': return self.send(b'',status=204)
            else: return self.send({'error':'Page introuvable.'},status=404)
            data=file.read_bytes()
            if file.suffix == '.html':
                data=data.replace(b'</head>',b'<link rel="stylesheet" href="/common.css"><script src="/navigation.js" defer></script></head>')
            if path in ['/app/','/app/index.html']:
                data=data.replace(b'<body>',b'<body class="local-app">')
                data=data.replace(b'</header>', b'<p><a href="/" style="color:inherit">Atelier de th\xc3\xa8mes</a></p></header>',1)
            mime = {'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
                    '.html':'text/html; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'}.get(file.suffix.lower())
            return self.send(data, mime or mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
        except (OSError, KeyError, ValueError, zipfile.BadZipFile):
            return self.send({'error':'Ressource absente ou illisible.'},status=404)

    def do_POST(self):
        if not self.allowed_host() or not secrets.compare_digest(self.headers.get('X-Local-Token',''), self.server.token):
            return self.send({'error':'Rechargez l’atelier avant de réessayer.'},status=403)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0 < length <= MAX_BODY: raise ValueError('Envoi vide ou trop volumineux (64 Mo maximum).')
            raw=self.rfile.read(length)
            path=urlsplit(self.path).path
            if path in ['/api/lesson','/api/resource']:
                query=parse_qs(urlsplit(self.path).query)
                tid=query.get('theme',[''])[0]
                self.server.path_for(tid).read_bytes()
                with self.server.write_lock:
                    data=self.server.session_data(tid)
                    if path=='/api/lesson':
                        incoming=json.loads(raw)
                        selected=incoming.get('selected')
                        if selected is not None and (not isinstance(selected,list) or len(selected)<2 or any(not isinstance(x,str) for x in selected)):
                            raise ValueError('Choisissez au moins deux cartes.')
                        with zipfile.ZipFile(self.server.path_for(tid)) as archive:
                            valid={c.get('file',c['id']) for c in json.loads(archive.read('manifest.json'))['cards']}
                        if selected is not None and not set(selected)<=valid: raise ValueError('Cartes inconnues.')
                        data['selected']=selected
                    else:
                        title=text(query.get('title',[''])[0],120,'Titre')
                        kind=query.get('kind',[''])[0]
                        if kind not in ['song','video','game','prep','other']: raise ValueError('Catégorie invalide.')
                        if query.get('mode')==['link']:
                            url=raw.decode('utf-8').strip()
                            parsed=urlsplit(url)
                            if parsed.scheme not in ['https','http'] or not parsed.hostname or parsed.username or parsed.password: raise ValueError('Indiquez un lien HTTP ou HTTPS valide.')
                        else:
                            ext=query.get('ext',[''])[0].lower()
                            if ext not in ['mp3','mp4','webm','ogg','pdf']: raise ValueError('Choisissez un MP3, MP4, WebM, OGG ou PDF.')
                            if ext=='mp3':check_audio(raw)
                            if ext=='pdf' and not raw.startswith(b'%PDF-'):raise ValueError('PDF invalide.')
                            if ext=='mp4' and raw[4:8]!=b'ftyp':raise ValueError('MP4 invalide.')
                            if ext=='webm' and not raw.startswith(b'\x1a\x45\xdf\xa3'):raise ValueError('WebM invalide.')
                            if ext=='ogg' and not raw.startswith(b'OggS'):raise ValueError('OGG invalide.')
                            filename=uuid.uuid4().hex+'.'+ext
                            atomic_files({self.server.data_dir/'ressources'/tid/filename:raw})
                            url='/resource/'+tid+'/'+filename
                        data.setdefault('resources',[]).append({'title':title,'kind':kind,'url':url,'local':url.startswith('/resource/'),'notes':query.get('notes',[''])[0][:2000]})
                    atomic_files({self.server.data_dir/'seances'/(tid+'.json'):json.dumps(data,ensure_ascii=False).encode()})
                return self.send(data)
            if path=='/api/import':
                manifest,data=read_pack(raw)
                # Never silently overwrite an existing theme, even when importing its backup.
                manifest['id']=uuid.uuid4().hex
                with zipfile.ZipFile(io.BytesIO(data)) as z:
                    output=io.BytesIO()
                    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as dest:
                        for name in z.namelist():
                            dest.writestr(name,json.dumps(manifest,ensure_ascii=False) if name=='manifest.json' else z.read(name))
                folder = self.server.store(manifest,output.getvalue())
                return self.send({'id':manifest['id'],'name':manifest['name'],'folder':folder,'key':theme_key(manifest)})
            payload=json.loads(raw)
            if not isinstance(payload,dict): raise ValueError('Requête invalide.')
            if path=='/api/save':
                manifest,data=build_pack(payload)
                folder = self.server.store(manifest,data)
                return self.send({'id':manifest['id'],'name':manifest['name'],'folder':folder,'key':theme_key(manifest)})
            if path=='/api/tts':
                label=text(payload.get('label'),100,'Mot anglais')
                accent=payload.get('accent','co.uk')
                if accent not in ['co.uk','com']: raise ValueError('Accent non pris en charge.')
                if not self.server.tts_lock.acquire(blocking=False):
                    return self.send({'error':'Une génération est déjà en cours. Réessayez après sa fin.'},status=409)
                try:
                    from tts import generate_audio
                    audio=check_audio(generate_audio(label,accent))
                    return self.send({'audio':'data:audio/mpeg;base64,'+base64.b64encode(audio).decode()})
                except Exception:
                    return self.send({'error':'La voix n’a pas pu être générée. Vérifiez Internet ou importez un MP3. Vos cartes restent dans l’atelier.'},status=502)
                finally: self.server.tts_lock.release()
            return self.send({'error':'Action inconnue.'},status=404)
        except (ValueError, TypeError, AttributeError, json.JSONDecodeError) as exc:
            return self.send({'error':str(exc)},status=400)
        except OSError:
            return self.send({'error':'Écriture impossible. Vérifiez l’espace disque et les droits du dossier donnees_locales.'},status=500)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=0)
    parser.add_argument('--data-dir')
    parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    server=WorkshopServer(args.port,args.data_dir)
    url=f'http://127.0.0.1:{server.server_port}/'
    print('English TBI local : '+url,flush=True)
    print('Laissez cette fenêtre ouverte. Fermez-la pour arrêter l’application.',flush=True)
    if not args.no_browser: webbrowser.open(url)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
