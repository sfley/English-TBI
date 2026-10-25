import base64
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'local'))
import server
from PIL import Image


def fixture():
    image = io.BytesIO()
    Image.new('RGB',(300,180),'green').save(image,'PNG')
    audio = (Path(__file__).resolve().parents[1]/'audio/fruits/apple.mp3').read_bytes()
    return {'name':'School <supplies>', 'credit':'Images personnelles', 'cards':[
        {'label':label,'image':'data:image/png;base64,'+base64.b64encode(image.getvalue()).decode(),
         'audio':'data:audio/mpeg;base64,'+base64.b64encode(audio).decode()} for label in ['Pencil','Ruler']]}


class PackTests(unittest.TestCase):
    def test_pack_round_trip_and_image_size(self):
        manifest,data=server.build_pack(fixture())
        imported,new_data=server.read_pack(data)
        self.assertEqual(imported['name'],manifest['name'])
        self.assertEqual([c['label'] for c in imported['cards']],['Pencil','Ruler'])
        with zipfile.ZipFile(io.BytesIO(new_data)) as z:
            with Image.open(io.BytesIO(z.read(imported['cards'][0]['image']))) as image:
                self.assertEqual(image.size,(187,187))

    def test_missing_audio_and_small_theme(self):
        data=fixture();data['cards'][0]['audio']=None
        with self.assertRaisesRegex(ValueError,'Pencil'):server.build_pack(data)
        data=fixture();data['cards']=data['cards'][:1]
        with self.assertRaises(ValueError):server.build_pack(data)

    def test_bad_files(self):
        data=fixture();data['cards'][0]['image']='data:image/png;base64,'+base64.b64encode(b'not image').decode()
        with self.assertRaises(ValueError):server.build_pack(data)
        data=fixture();data['cards'][0]['audio']='data:audio/mpeg;base64,'+base64.b64encode(b'not audio').decode()
        with self.assertRaises(ValueError):server.build_pack(data)

    def test_untrusted_archives(self):
        for name in ['../outside.png','/outside.png','images\\outside.png']:
            out=io.BytesIO()
            with zipfile.ZipFile(out,'w') as z:z.writestr(name,b'test')
            with self.assertRaises(ValueError):server.read_pack(out.getvalue())
        with self.assertRaises(ValueError):server.read_pack(b'invalid zip')


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.server=server.WorkshopServer(data_dir=self.temp.name)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.base=f'http://127.0.0.1:{self.server.server_port}'
        self.token=self.call('/api/session')['token']

    def tearDown(self):
        self.server.shutdown();self.thread.join();self.server.server_close();self.temp.cleanup()

    def call(self,path,payload=None,token=True,raw=False):
        headers={}
        if token and hasattr(self,'token'):headers['X-Local-Token']=self.token
        body=None if payload is None else payload if isinstance(payload,bytes) else json.dumps(payload).encode()
        with urlopen(Request(self.base+path,data=body,headers=headers),timeout=5) as response:
            result=response.read()
            return result if raw else json.loads(result)

    def test_save_edit_export_import_and_restart(self):
        result=self.call('/api/save',fixture());tid=result['id']
        current=self.call('/api/themes/'+tid)
        self.assertEqual(current['credit'],'Images personnelles')
        current['name']='Updated';self.call('/api/save',current)
        self.assertEqual(len(self.call('/api/themes')['themes']),3)
        pack=self.call('/api/themes/'+tid+'/export',raw=True)
        imported=self.call('/api/import',pack)
        self.assertNotEqual(imported['id'],tid)
        self.assertEqual(len(self.call('/api/themes')['themes']),4)
        restored=server.WorkshopServer(data_dir=self.temp.name)
        try:self.assertEqual(len(restored.catalog()[0]),4)
        finally:restored.server_close()
        script=self.call('/app/cards.js',raw=True).decode()
        self.assertIn('Updated',script)
        self.assertNotIn('Local ·',script)
        self.assertIn('window.CARD_SETS',script)

    def test_readable_files_and_static_registration(self):
        result=self.call('/api/save',fixture())
        self.assertEqual(result['folder'],'school-supplies')
        root=self.server.project_dir
        with Image.open(root/'flashcards/school-supplies/pencil.png') as image:
            self.assertEqual(image.size,(187,187))
        expected=(server.ROOT/'audio/fruits/apple.mp3').read_bytes()
        self.assertEqual((root/'audio/school-supplies/pencil.mp3').read_bytes(),expected)
        self.assertEqual(self.call('/app/audio/school-supplies/pencil.mp3',raw=True),expected)
        self.assertIn('flashcards/school-supplies/pencil.png',(root/'cards.js').read_text())
        self.assertIn('audio/school-supplies/ruler.mp3',(root/'cards.js').read_text())
        imported=self.call('/api/import',self.call('/api/themes/'+result['id']+'/export',raw=True))
        self.assertEqual(imported['folder'],'school-supplies-2')

    def test_builtin_folders_and_unowned_files_preserved(self):
        payload=fixture();payload['name']='fruits'
        result=self.call('/api/save',payload)
        self.assertEqual(result['folder'],'fruits-2')
        root=self.server.project_dir
        stranger=root/'flashcards/fruits-2/book.png'
        stranger.write_bytes(b'preserve me')
        current=self.call('/api/themes/'+result['id'])
        current['cards'][0]['label']='Book'
        self.call('/api/save',current)
        self.assertEqual(stranger.read_bytes(),b'preserve me')
        self.assertTrue((stranger.parent/'book-2.png').exists())

    def test_old_theme_migration_keeps_original(self):
        payload=fixture()
        image=io.BytesIO();Image.new('RGB',(512,512),'blue').save(image,'PNG')
        old_manifest,raw=server.build_pack(payload)
        out=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(raw)) as source, zipfile.ZipFile(out,'w') as target:
            for name in source.namelist():
                target.writestr(name,image.getvalue() if name.endswith('.png') else source.read(name))
        old_data=out.getvalue()
        file=Path(self.temp.name)/(old_manifest['id']+'.zip')
        file.write_bytes(old_data)
        self.server.migrate_themes()
        self.assertEqual((Path(self.temp.name)/'avant_migration_187'/file.name).read_bytes(),old_data)
        with Image.open(self.server.project_dir/'flashcards/school-supplies/pencil.png') as converted:
            self.assertEqual(converted.size,(187,187))
        self.assertEqual(len(self.call('/api/themes')['themes']),3)
        # A second migration does not create another theme or touch the backup.
        self.server.migrate_themes()
        self.assertEqual((Path(self.temp.name)/'avant_migration_187'/file.name).read_bytes(),old_data)

    def test_restores_theme_after_copying_local_backups(self):
        result=self.call('/api/save',fixture())
        missing=self.server.project_dir/'flashcards/school-supplies/pencil.png'
        missing.unlink()
        self.server.cards_file.write_bytes((server.ROOT/'cards.js').read_bytes())
        self.server.migrate_themes()
        self.assertTrue(missing.exists())
        self.assertIn('school-supplies/pencil.png',self.server.cards_file.read_text())
        self.assertEqual(len(self.call('/api/themes')['themes']),3)

    def test_builtin_themes_editable_and_exact_theme_names(self):
        themes=self.call('/api/themes')['themes']
        self.assertEqual({t['name'] for t in themes},{'fruits','wild animals'})
        for theme in themes:
            data=self.call('/api/themes/'+theme['id'])
            self.assertEqual(len(data['cards']),17 if theme['name']=='fruits' else 13)
            self.assertTrue(all(c['image'].startswith('data:image/') and c['audio'].startswith('data:audio/') for c in data['cards']))
        fruits=next(t for t in themes if t['name']=='fruits')
        data=self.call('/api/themes/'+fruits['id']);data['name']='Feelings'
        saved=self.call('/api/save',data)
        self.assertEqual(saved['key'],'fruits')
        self.assertEqual(saved['folder'],'fruits')
        script=self.call('/app/cards.js',raw=True).decode()
        self.assertIn('"fruits": "Feelings"',script)
        self.assertNotIn('Local ·',script)

    def test_session_selection_and_resources(self):
        theme=next(t for t in self.call('/api/themes')['themes'] if t['name']=='fruits')
        tid=theme['id']
        full=self.call('/api/themes/'+tid)
        selected=[c['file'] for c in full['cards'][:6]]
        self.call('/api/lesson?theme='+tid,{'selected':selected})
        self.assertEqual(len(self.call('/api/themes/'+tid+'?selection=1')['cards']),6)
        self.assertEqual(len(self.call('/api/themes/'+tid)['cards']),17)
        with self.assertRaises(HTTPError):self.call('/api/lesson?theme='+tid,{'selected':selected[:1]})
        with self.assertRaises(HTTPError):self.call('/api/resource?theme='+tid+'&title=Bad&kind=game&mode=link',b'javascript:alert(1)')
        saved=self.call('/api/resource?theme='+tid+'&title=Game&kind=game&mode=link',b'https://example.org/game')
        self.assertEqual(saved['resources'][0]['url'],'https://example.org/game')
        raw=b'%PDF-1.4 test resource'
        saved=self.call('/api/resource?theme='+tid+'&title=Preparation&kind=prep&mode=file&ext=pdf',raw)
        self.assertEqual(self.call(saved['resources'][1]['url'],raw=True),raw)
        restored=server.WorkshopServer(data_dir=self.temp.name)
        try:self.assertEqual(restored.session_data(tid)['selected'],selected)
        finally:restored.server_close()

    def test_csrf_host_and_traversal(self):
        with self.assertRaises(HTTPError) as cm:self.call('/api/save',fixture(),token=False)
        self.assertEqual(cm.exception.code,403)
        req=Request(self.base+'/api/session',headers={'Host':'evil.example'})
        with self.assertRaises(HTTPError) as cm:urlopen(req)
        self.assertEqual(cm.exception.code,403)
        for path in ['/app/js/../../.git/config','/app/js/../local/server.py','/app/flashcards/../.git/config','/app/audio/../local/server.py']:
            with self.assertRaises(HTTPError):self.call(path,raw=True)

    def test_import_errors_preserve_saved_theme(self):
        self.call('/api/save',fixture())
        with self.assertRaises(HTTPError) as cm:self.call('/api/import',b'bad zip')
        self.assertEqual(cm.exception.code,400)
        self.assertEqual(len(self.call('/api/themes')['themes']),3)

    def test_corrupt_saved_archive_preserved(self):
        file=Path(self.temp.name)/('a'*32+'.zip');file.write_bytes(b'broken')
        result=self.call('/api/themes')
        self.assertEqual(len(result['warnings']),1)
        self.assertTrue(file.exists())

    def test_tts_failure_is_actionable(self):
        # This exercises the API error path without making a remote request.
        from unittest.mock import patch
        with patch('tts.generate_audio',side_effect=OSError('network offline')):
            with self.assertRaises(HTTPError) as cm:self.call('/api/tts',{'label':'pencil'})
            self.assertEqual(cm.exception.code,502)
            self.assertIn('Internet',json.loads(cm.exception.read())['error'])

    def test_tts_generation_and_tls_transport(self):
        from unittest.mock import patch, MagicMock
        from tts import generate_audio
        audio=(Path(__file__).resolve().parents[1]/'audio/fruits/apple.mp3').read_bytes()
        nested=json.dumps([base64.b64encode(audio).decode()])
        response=MagicMock()
        response.__enter__.return_value=response
        response.iter_lines.return_value=iter([b")]}'",json.dumps([['wrb.fr','jQ1olc',nested]]).encode()])
        with patch('tts.requests.post',return_value=response) as post:
            self.assertEqual(generate_audio('pencil','co.uk'),audio)
            self.assertIs(post.call_args.kwargs['verify'],True)
            self.assertTrue(post.call_args.args[0].startswith('https://translate.google.co.uk/'))
        with patch('tts.generate_audio',return_value=audio):
            result=self.call('/api/tts',{'label':'pencil','accent':'com'})
            self.assertEqual(base64.b64decode(result['audio'].split(',')[1]),audio)


if __name__=='__main__':unittest.main()
