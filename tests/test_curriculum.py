import base64
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'local'))
import server

class CurriculumTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.app=server.WorkshopServer(data_dir=self.temp.name)
        self.c=self.app.curriculum
        self.theme=next(m for m in self.app.manifests() if m['name']=='fruits')
    def tearDown(self):
        self.app.server_close();self.temp.cleanup()
    def payload(self,n=6):
        return {'title':'Découverte','sources':[{'theme_id':self.theme['id'],'cards':[c['file'] for c in self.theme['cards'][:n]]}], 'resources':[]}
    def test_sequences_lessons_order_duplicate_and_restart(self):
        seq=self.c.save('sequences',{'title':'Feelings','level':'CP','objective':'Exprimer une émotion'})
        p=self.payload();p.update(sequence_id=seq['id'],position=2)
        lesson=self.c.save('lessons',p)
        p=self.payload(4);p.update(title='Avant',sequence_id=seq['id'],position=1)
        earlier=self.c.save('lessons',p)
        self.assertEqual([x['id'] for x in self.c.listing()['lessons']],[earlier['id'],lesson['id']])
        copied=self.c.duplicate(lesson['id'])
        self.assertNotEqual(copied['id'],lesson['id']);self.assertEqual(copied['card_count'],6)
        restored=server.WorkshopServer(data_dir=self.temp.name)
        try:
            detail=restored.curriculum.detail(lesson['id'])
            self.assertEqual(len(detail['cards']),6)
            self.assertEqual(detail['sequence']['title'],'Feelings')
        finally:restored.server_close()
    def test_snapshot_survives_theme_edit_and_metadata_edit(self):
        p=self.payload();lesson=self.c.save('lessons',p);before=self.c.detail(lesson['id'])['cards']
        # Replace the theme archive without one of the selected cards.
        theme_file=self.app.path_for(self.theme['id'])
        with zipfile.ZipFile(theme_file) as z:
            manifest=json.loads(z.read('manifest.json'));manifest['cards']=manifest['cards'][1:]
            out=io.BytesIO()
            with zipfile.ZipFile(out,'w') as dest:
                for name in z.namelist():dest.writestr(name,json.dumps(manifest) if name=='manifest.json' else z.read(name))
        theme_file.write_bytes(out.getvalue())
        edited={**lesson,'title':'Mon nouveau titre'}
        self.c.save('lessons',edited)
        self.assertEqual(self.c.detail(lesson['id'])['cards'],before)
        with self.assertRaisesRegex(ValueError,'retirée'):self.c.save('lessons',{**edited,'refresh':True})
        self.assertEqual(self.c.get('lessons',lesson['id'])['title'],'Mon nouveau titre')
    def test_multiple_themes_and_independent_selections(self):
        animal=next(m for m in self.app.manifests() if m['name']=='wild animals')
        p=self.payload(3);p['sources'].append({'theme_id':animal['id'],'cards':[c['file'] for c in animal['cards'][:3]]})
        first=self.c.save('lessons',p);second=self.c.save('lessons',self.payload(2))
        self.assertEqual(len(self.c.detail(first['id'])['cards']),6)
        self.assertEqual(len(self.c.detail(second['id'])['cards']),2)
        self.assertIsNone(second['sequence_id'])
    def test_reorder_and_legacy_migration(self):
        one=self.c.save('lessons',self.payload(3));two=self.c.save('lessons',self.payload(4))
        self.c.reorder(None,[two['id'],one['id']])
        self.assertEqual([l['id'] for l in self.c.listing()['lessons']],[two['id'],one['id']])
        legacy=self.app.data_dir/'seances'/(self.theme['id']+'.json')
        legacy.parent.mkdir(parents=True,exist_ok=True)
        legacy.write_text(json.dumps({'selected':[c['file'] for c in self.theme['cards'][:6]],'resources':[]}))
        self.c.migrate_legacy();self.c.migrate_legacy()
        recovered=[l for l in self.c.listing()['lessons'] if 'récupérée' in l['title']]
        self.assertEqual(len(recovered),1);self.assertEqual(recovered[0]['card_count'],6)
        self.assertTrue(legacy.exists())

    def test_validation_is_non_destructive(self):
        lesson=self.c.save('lessons',self.payload())
        for update in [{'resources':[{'title':'Bad','url':'javascript:alert(1)'}]},{'duration':0},{'sources':[]},{'sequence_id':'../bad'}]:
            with self.assertRaises((ValueError,OSError)):self.c.save('lessons',{**lesson,**update})
        self.assertEqual(self.c.get('lessons',lesson['id'])['card_count'],6)

if __name__=='__main__':unittest.main()
