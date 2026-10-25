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
from urllib.parse import urlsplit, unquote
import uuid
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
            size = calc_size_contain(picture.width, picture.height, 512, 512)
            picture = picture.resize(size, Image.Resampling.LANCZOS)
            result = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
            result.alpha_composite(picture, ((512-picture.width)//2, (512-picture.height)//2))
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


class WorkshopServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, port=0, data_dir=None):
        self.data_dir = Path(data_dir or ROOT/'donnees_locales')
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.token = secrets.token_urlsafe(32)
        self.write_lock = threading.Lock()
        self.tts_lock = threading.Lock()
        super().__init__(('127.0.0.1', port), Handler)

    def path_for(self, tid):
        if not ID.fullmatch(tid):
            raise ValueError('Identifiant invalide.')
        return self.data_dir / (tid+'.zip')

    def store(self, manifest, data):
        target = self.path_for(manifest['id'])
        with self.write_lock:
            fd, temp = tempfile.mkstemp(dir=self.data_dir, suffix='.tmp')
            try:
                with os.fdopen(fd, 'wb') as stream:
                    stream.write(data)
                os.replace(temp, target)
            finally:
                if os.path.exists(temp): os.unlink(temp)

    def catalog(self):
        themes, warnings = [], []
        for file in sorted(self.data_dir.glob('*.zip')):
            try:
                with zipfile.ZipFile(file) as archive:
                    m = json.loads(archive.read('manifest.json'))
                    themes.append({'id': file.stem, 'name': m['name'], 'count': len(m['cards'])})
            except (OSError, KeyError, ValueError, zipfile.BadZipFile):
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
            if path.startswith('/api/themes/'):
                parts = path.split('/')
                tid = parts[3]
                data = self.server.path_for(tid).read_bytes()
                if len(parts)==5 and parts[4]=='export':
                    return self.send(data, 'application/zip', filename=f'theme-{tid[:8]}.zip')
                with zipfile.ZipFile(io.BytesIO(data)) as z:
                    m = json.loads(z.read('manifest.json'))
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
                script = (ROOT/'cards.js').read_text(encoding='utf-8')
                themes, _ = self.server.catalog()
                extra = {}
                for theme in themes:
                    with zipfile.ZipFile(self.server.path_for(theme['id'])) as z:
                        m=json.loads(z.read('manifest.json'))
                    key = 'Local · '+m['name']+' ['+theme['id'][:8]+']'
                    extra[key] = [{'id':c['id'],'label':c['label'],'img':'/themes/'+theme['id']+'/'+c['image'],
                                   'audio':'/themes/'+theme['id']+'/'+c['audio']} for c in m['cards']]
                script += '\nObject.assign(window.CARD_SETS, '+json.dumps(extra,ensure_ascii=False)+');\n'
                return self.send(script,'text/javascript; charset=utf-8')
            if path in ['/', '/index.html']:
                file=ROOT/'local/web/index.html'
            elif path.startswith('/app/'):
                rel=path[5:] or 'index.html'
                if not (rel in ['index.html','styles.css','cards.js'] or rel.startswith(('js/','audio/','flashcards/'))):
                    return self.send({'error':'Page introuvable.'},status=404)
                file=(ROOT/rel).resolve()
                if not file.is_relative_to(ROOT): raise ValueError('Chemin interdit.')
                resolved = file.relative_to(ROOT).as_posix()
                if not (resolved in ['index.html','styles.css','cards.js'] or any(file.is_relative_to(ROOT/d) for d in ['js','audio','flashcards'])):
                    raise ValueError('Chemin interdit.')
            elif path in ['/atelier.js','/atelier.css']:
                file=ROOT/'local/web'/path[1:]
            elif path=='/favicon.ico': return self.send(b'',status=204)
            else: return self.send({'error':'Page introuvable.'},status=404)
            data=file.read_bytes()
            if path in ['/app/','/app/index.html']:
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
            if path=='/api/import':
                manifest,data=read_pack(raw)
                # Never silently overwrite an existing theme, even when importing its backup.
                manifest['id']=uuid.uuid4().hex
                with zipfile.ZipFile(io.BytesIO(data)) as z:
                    output=io.BytesIO()
                    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as dest:
                        for name in z.namelist():
                            dest.writestr(name,json.dumps(manifest,ensure_ascii=False) if name=='manifest.json' else z.read(name))
                self.server.store(manifest,output.getvalue())
                return self.send({'id':manifest['id'],'name':manifest['name']})
            payload=json.loads(raw)
            if not isinstance(payload,dict): raise ValueError('Requête invalide.')
            if path=='/api/save':
                manifest,data=build_pack(payload)
                self.server.store(manifest,data)
                return self.send({'id':manifest['id'],'name':manifest['name']})
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
