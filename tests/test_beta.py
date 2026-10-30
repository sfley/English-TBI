"""Beta workflows: pedagogical persistence, safe resource reuse and complete backups."""
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import urllib.request
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'local'))
import server

class BetaTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.app=server.WorkshopServer(data_dir=self.tmp.name)
        self.c=self.app.curriculum
        theme=self.app.manifests()[0]
        self.source={'theme_id':theme['id'],'cards':[c['file'] for c in theme['cards'][:6]]}
    def tearDown(self):
        self.app.server_close();self.tmp.cleanup()
    def test_pedagogy_stages_and_old_client_preservation(self):
        sequence=self.c.save('sequences',{'title':'Feelings','culture':'Album','final_task':'Dialogue','skills':['Échanger à l’oral'],'criteria':'Je réponds.'})
        resource={'title':'Chanson','kind':'song','url':'https://example.org/song'}
        lesson=self.c.save('lessons',{'title':'Découverte','sequence_id':sequence['id'],'sources':[self.source],'sentence':'I am happy.','criteria':'Je nomme.','stages':[{'title':'Rituel','kind':'resource','minutes':5,'resource':resource},{'title':'Écoute','kind':'game','game':'bingo','minutes':8}]})
        payload={k:v for k,v in lesson.items() if k not in ['stages','sentence','criteria']}
        saved=self.c.save('lessons',{**payload,'title':'Autre titre'})
        self.assertEqual(saved['stages'],lesson['stages']);self.assertEqual(saved['sentence'],'I am happy.')
        self.assertEqual(self.c.detail(saved['id'])['sequence']['culture'],'Album')
        self.assertEqual(self.c.duplicate(saved['id'])['stages'],saved['stages'])
    def test_invalid_stages_leave_snapshot_and_metadata_unchanged(self):
        lesson=self.c.save('lessons',{'title':'Ma séance','sources':[self.source]})
        before=self.c.detail(lesson['id'])
        for stages in ['bad',[{'title':'X','kind':'game','minutes':5,'game':'invalid'}],[{'title':'X','kind':'resource','minutes':5,'resource':{'title':'Bad','kind':'game','url':'javascript:alert(1)'}}],[{'title':'X','kind':'offline','minutes':0}]]:
            with self.assertRaises(ValueError):self.c.save('lessons',{**lesson,'stages':stages})
        self.assertEqual(self.c.detail(lesson['id']),before)
    def test_documents_deduplicate_and_find_stage_resources(self):
        r={'title':'Album','kind':'prep','url':'https://example.org/album'}
        seq=self.c.save('sequences',{'title':'Sequence','resources':[r]})
        self.c.save('lessons',{'title':'Lesson','sequence_id':seq['id'],'sources':[self.source],'resources':[r],'stages':[{'title':'Lecture','kind':'resource','minutes':5,'resource':r}]})
        docs=self.c.documents()['documents']
        self.assertEqual(len(docs),1);self.assertEqual(len(docs[0]['uses']),2)
        self.assertTrue(docs[0]['themes'])
    def test_backup_and_resource_attach_through_http(self):
        lesson=self.c.save('lessons',{'title':'Sauvegardée','sources':[self.source],'stages':[{'title':'Bilan','kind':'offline','minutes':2}]})
        resource_folder=self.app.data_dir/'ressources'/self.source['theme_id'];resource_folder.mkdir(parents=True)
        filename='f'*32+'.pdf';(resource_folder/filename).write_bytes(b'%PDF-1.4\nfixture')
        resource={'title':'Fiche','kind':'prep','url':'/resource/'+self.source['theme_id']+'/'+filename}
        t=threading.Thread(target=self.app.serve_forever,daemon=True);t.start()
        base='http://127.0.0.1:'+str(self.app.server_port)
        try:
            req=urllib.request.Request(base+'/api/curriculum/attach',data=json.dumps({'lesson_id':lesson['id'],'resource':resource}).encode(),headers={'Content-Type':'application/json','X-Local-Token':self.app.token})
            with urllib.request.urlopen(req) as response:saved=json.load(response)
            self.assertEqual(saved['resources'][0]['title'],'Fiche');self.assertEqual(saved['stages'],lesson['stages'])
            with urllib.request.urlopen(base+'/api/backup') as response:data=response.read()
        finally:self.app.shutdown();t.join()
        with tempfile.TemporaryDirectory() as restore:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                self.assertIsNone(archive.testzip());self.assertTrue(all(n.startswith('donnees_locales/') or n=='LIRE-MOI.txt' for n in archive.namelist()));archive.extractall(restore)
            recovered=server.WorkshopServer(data_dir=Path(restore)/'donnees_locales')
            try:
                self.assertEqual(recovered.curriculum.detail(lesson['id'])['cards'],self.c.detail(lesson['id'])['cards'])
                self.assertEqual(recovered.curriculum.get('lessons',lesson['id'])['resources'],saved['resources'])
                self.assertEqual((recovered.data_dir/'ressources'/self.source['theme_id']/filename).read_bytes(),b'%PDF-1.4\nfixture')
            finally:recovered.server_close()
    def test_long_lesson_title_keeps_snapshot_compatible(self):
        title='Séance '+('x'*100)
        lesson=self.c.save('lessons',{'title':title,'sources':[self.source]})
        self.assertEqual(lesson['title'],title);self.assertEqual(len(self.c.detail(lesson['id'])['cards']),6)

if __name__=='__main__':unittest.main()
