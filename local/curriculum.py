"""Named sequences and lessons, with independent immutable card snapshots."""
import base64
import io
import json
import re
import uuid
import zipfile
from urllib.parse import urlsplit


class Curriculum:
    def __init__(self, workshop, build_pack, atomic_files):
        self.workshop=workshop
        self.root=workshop.data_dir/'progressions'
        self.build_pack=build_pack
        self.atomic_files=atomic_files

    def path(self,kind,ident):
        if kind not in ['sequences','lessons'] or not isinstance(ident,str) or not re.fullmatch('[a-f0-9]{32}',ident):
            raise ValueError('Identifiant invalide.')
        return self.root/kind/(ident+'.json')

    def get(self,kind,ident):
        return json.loads(self.path(kind,ident).read_text(encoding='utf-8'))

    def listing(self):
        result={'sequences':[],'lessons':[],'warnings':[]}
        for kind in ['sequences','lessons']:
            for file in sorted((self.root/kind).glob('*.json')):
                try:
                    value=json.loads(file.read_text(encoding='utf-8'))
                    if not isinstance(value,dict) or not isinstance(value.get('title'),str) or not isinstance(value.get('position'),int):
                        raise ValueError('Métadonnées invalides.')
                    result[kind].append(value)
                except (OSError,ValueError):result['warnings'].append(file.name+' : fichier illisible, conservé.')
        for kind in ['sequences','lessons']:
            result[kind].sort(key=lambda x:(x.get('position',0),x.get('title','').casefold()))
        return result

    def string(self,payload,key,limit=2000,required=False):
        value=payload.get(key,'')
        if not isinstance(value,str) or len(value)>limit or (required and not value.strip()):
            raise ValueError(f'Champ {key} invalide (maximum {limit} caractères).')
        return value.strip()

    def resources(self,items):
        if not isinstance(items,list) or len(items)>100:raise ValueError('100 ressources maximum.')
        result=[]
        for item in items:
            if not isinstance(item,dict):raise ValueError('Ressource invalide.')
            title=self.string(item,'title',120,True)
            url=self.string(item,'url',3000,True)
            local=bool(re.fullmatch(r'/resource/[a-f0-9]{32}/[a-f0-9]{32}\.(mp3|mp4|ogg|webm|pdf)',url))
            parsed=urlsplit(url)
            if not local and (parsed.scheme not in ['https','http'] or not parsed.hostname or parsed.username or parsed.password):
                raise ValueError('Lien de ressource invalide.')
            kind=item.get('kind','other')
            if kind not in ['song','video','game','prep','other']:raise ValueError('Type de ressource invalide.')
            result.append({'title':title,'url':url,'kind':kind,'local':local,'notes':self.string(item,'notes',2000)})
        return result

    def save(self,kind,payload):
        ident=payload.get('id') or uuid.uuid4().hex
        target=self.path(kind,ident)
        old=self.get(kind,ident) if target.exists() else None
        status=payload.get('status','À préparer')
        if status not in ['À préparer','Prête','Réalisée']:raise ValueError('État invalide.')
        position=payload.get('position',0)
        if not isinstance(position,int) or not 0<=position<=999:raise ValueError('Ordre invalide.')
        data={'id':ident,'title':self.string(payload,'title',120,True),'status':status,
              'position':position,'objective':self.string(payload,'objective'),
              'notes':self.string(payload,'notes',10000),'resources':self.resources(payload.get('resources',[]))}
        updates={}
        if kind=='sequences':data['level']=self.string(payload,'level',80)
        else:
            sequence=payload.get('sequence_id') or None
            if sequence:self.get('sequences',sequence)
            duration=payload.get('duration',20)
            if not isinstance(duration,int) or not 1<=duration<=180:raise ValueError('Durée : de 1 à 180 minutes.')
            sources=payload.get('sources')
            if not isinstance(sources,list) or not sources or len(sources)>10:raise ValueError('Choisissez au moins un thème.')
            cleaned=[]
            for source in sources:
                tid=source.get('theme_id')
                self.workshop.path_for(tid)
                selected=source.get('cards')
                if not isinstance(selected,list) or any(not isinstance(x,str) for x in selected):raise ValueError('Sélection invalide.')
                cleaned.append({'theme_id':tid,'cards':list(dict.fromkeys(selected))})
            if len({s['theme_id'] for s in cleaned})!=len(cleaned):raise ValueError('Un thème ne peut être ajouté qu’une fois.')
            count=sum(len(x['cards']) for x in cleaned)
            if not 2<=count<=60:raise ValueError('Sélectionnez de 2 à 60 cartes au total.')
            data.update(sequence_id=sequence,duration=duration,sources=cleaned,instructions=self.string(payload,'instructions',5000))
            if old and old['sources']==cleaned and not payload.get('refresh'):
                data['card_count']=old['card_count']
                data['snapshot_sources']=old.get('snapshot_sources',[])
            else:
                cards=[]
                for source in cleaned:
                    with zipfile.ZipFile(self.workshop.path_for(source['theme_id'])) as z:
                        m=json.loads(z.read('manifest.json'))
                        bank={c.get('file',c['id']):c for c in m['cards']}
                        for key in source['cards']:
                            if key not in bank:raise ValueError('Une carte a été retirée du thème. Modifiez la sélection avant d’actualiser la séance.')
                            c=bank[key]
                            cards.append({'label':c['label'],'image':'data:image/png;base64,'+base64.b64encode(z.read(c['image'])).decode(),
                                          'audio':'data:audio/mpeg;base64,'+base64.b64encode(z.read(c['audio'])).decode()})
                manifest,pack=self.build_pack({'id':ident,'name':data['title'],'cards':cards})
                updates[self.root/'snapshots'/(ident+'.zip')]=pack
                data['card_count']=len(cards)
                data['snapshot_sources']=[c['label'] for c in cards]
        updates[target]=json.dumps(data,ensure_ascii=False,indent=2).encode()
        self.atomic_files(updates)
        return data

    def reorder(self,sequence,identifiers):
        if sequence:self.get('sequences',sequence)
        group=[l for l in self.listing()['lessons'] if l.get('sequence_id')==(sequence or None)]
        if not isinstance(identifiers,list) or len(identifiers)!=len(group) or set(identifiers)!={l['id'] for l in group}:
            raise ValueError('L’ordre doit contenir exactement les séances de cette séquence.')
        by_id={l['id']:l for l in group}
        updates={}
        for index,ident in enumerate(identifiers,1):
            lesson=by_id[ident];lesson['position']=index
            updates[self.path('lessons',ident)]=json.dumps(lesson,ensure_ascii=False).encode()
        self.atomic_files(updates)
        return {'saved':True}

    def deletion_backup_path(self,ident):
        if not isinstance(ident,str) or not re.fullmatch('[a-f0-9]{32}',ident):
            raise ValueError('Identifiant de suppression invalide.')
        return self.root/'suppressions'/ident

    def delete(self,kind,ident):
        target=self.path(kind,ident)
        original=self.get(kind,ident)
        trash_id=uuid.uuid4().hex
        trash=self.deletion_backup_path(trash_id)
        entry={'kind':kind,'metadata':original,'children':[]}
        updates={}
        remove=[target]
        if kind=='lessons':
            snapshot=self.root/'snapshots'/(ident+'.zip')
            updates[trash/'snapshot.zip']=snapshot.read_bytes()
            remove.append(snapshot)
        else:
            listing=self.listing()
            if listing['warnings']:raise ValueError('Un fichier de préparation est illisible. Récupérez-le avant de supprimer la séquence.')
            for child in listing['lessons']:
                if child.get('sequence_id')!=ident:continue
                inherited=[r for r in original['resources'] if r not in child['resources']]
                entry['children'].append({'id':child['id'],'inherited':inherited})
                child['sequence_id']=None
                child['resources']=inherited+child['resources']
                updates[self.path('lessons',child['id'])]=json.dumps(child,ensure_ascii=False).encode()
        updates[trash/'entry.json']=json.dumps(entry,ensure_ascii=False).encode()
        updates[self.root/'deleted'/kind/(ident+'.json')]=json.dumps({'trash_id':trash_id}).encode()
        self.atomic_files(updates,remove=remove)
        return {'deleted':True,'trash_id':trash_id}

    def migrate_legacy(self):
        for file in sorted((self.workshop.data_dir/'seances').glob('*.json')):
            try:
                data=json.loads(file.read_text(encoding='utf-8'))
                if data.get('selected') is None and not data.get('resources'):continue
                ident=uuid.uuid5(uuid.NAMESPACE_URL,'english-tbi-recovered:'+file.stem).hex
                if self.path('lessons',ident).exists() or (self.root/'deleted'/'lessons'/(ident+'.json')).exists():continue
                with zipfile.ZipFile(self.workshop.path_for(file.stem)) as archive:
                    theme=json.loads(archive.read('manifest.json'))
                selected=data.get('selected')
                valid=[c.get('file',c['id']) for c in theme['cards']]
                selected=valid if selected is None else [key for key in selected if key in valid]
                if len(selected)<2:continue
                self.save('lessons',{'id':ident,'title':theme['name']+' — Séance récupérée',
                    'sources':[{'theme_id':file.stem,'cards':selected}],
                    'resources':data.get('resources',[]),'notes':'Récupérée automatiquement de la préparation par thème. Les fichiers d’origine sont conservés.'})
            except (OSError,ValueError,KeyError,AttributeError,zipfile.BadZipFile):
                self.workshop.migration_warnings.append(file.name+' : ancienne préparation conservée, récupération impossible.')

    def detail(self,ident):
        data=self.get('lessons',ident)
        with zipfile.ZipFile(self.root/'snapshots'/(ident+'.zip')) as z:
            m=json.loads(z.read('manifest.json'))
            for c in m['cards']:
                for key,mime in [('image','image/png'),('audio','audio/mpeg')]:
                    c[key]='data:'+mime+';base64,'+base64.b64encode(z.read(c[key])).decode()
        data['cards']=m['cards']
        data['key']='lesson-'+ident
        data['sequence']=self.get('sequences',data['sequence_id']) if data['sequence_id'] else None
        return data

    def duplicate(self,ident):
        old=self.get('lessons',ident)
        new=uuid.uuid4().hex
        old.update(id=new,title=old['title']+' — copie',status='À préparer',position=old['position']+1)
        self.atomic_files({self.path('lessons',new):json.dumps(old,ensure_ascii=False).encode(),
                           self.root/'snapshots'/(new+'.zip'):(self.root/'snapshots'/(ident+'.zip')).read_bytes()})
        return old
