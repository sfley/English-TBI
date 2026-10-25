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
                self.assertEqual(image.size,(512,512))

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
        self.assertEqual(len(self.call('/api/themes')['themes']),1)
        pack=self.call('/api/themes/'+tid+'/export',raw=True)
        imported=self.call('/api/import',pack)
        self.assertNotEqual(imported['id'],tid)
        self.assertEqual(len(self.call('/api/themes')['themes']),2)
        restored=server.WorkshopServer(data_dir=self.temp.name)
        try:self.assertEqual(len(restored.catalog()[0]),2)
        finally:restored.server_close()
        script=self.call('/app/cards.js',raw=True).decode()
        self.assertIn('Local · Updated',script)
        self.assertIn('window.CARD_SETS',script)

    def test_csrf_host_and_traversal(self):
        with self.assertRaises(HTTPError) as cm:self.call('/api/save',fixture(),token=False)
        self.assertEqual(cm.exception.code,403)
        req=Request(self.base+'/api/session',headers={'Host':'evil.example'})
        with self.assertRaises(HTTPError) as cm:urlopen(req)
        self.assertEqual(cm.exception.code,403)
        for path in ['/app/js/../../.git/config','/app/js/../local/server.py']:
            with self.assertRaises(HTTPError):self.call(path,raw=True)

    def test_import_errors_preserve_saved_theme(self):
        self.call('/api/save',fixture())
        with self.assertRaises(HTTPError) as cm:self.call('/api/import',b'bad zip')
        self.assertEqual(cm.exception.code,400)
        self.assertEqual(len(self.call('/api/themes')['themes']),1)

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
