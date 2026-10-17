// Regression tests for the inline admin handlers; no live database writes.
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(require('node:path').join(__dirname, '../admin.html'), 'utf8');
for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1]);
const classes = () => ({add(){}, remove(){}, toggle(){}});
function setup(slugs=['a','b','c']) {
  let rows=[], stored=slugs.map((song_slug,i)=>({song_slug,position:i+1})), mode='', patches=0;
  const messages=[], calls=[], nodes=new Map();
  const tbody={querySelectorAll:()=>rows};
  const makeRow=slug=>({dataset:{slug},parentElement:tbody,classList:classes(),events:{},
    addEventListener(k,f){this.events[k]=f;},querySelector(){return {};},
    after(r){rows.splice(rows.indexOf(r),1);rows.splice(rows.indexOf(this)+1,0,r);},
    before(r){rows.splice(rows.indexOf(r),1);rows.splice(rows.indexOf(this),0,r);}});
  rows=slugs.map(makeRow);
  const document={getElementById(id){
    if(!nodes.has(id)) nodes.set(id,{classList:classes(),querySelector:()=>({}),set innerHTML(v){
      if(id==='altable-test') rows=v.split(',').filter(Boolean).map(makeRow);
    }});
    return nodes.get(id);
  },querySelector(sel){return sel.includes('dragtable')?tbody:null;}};
  const c=vm.createContext({document,CSS:{escape:x=>x},toast:(...args)=>messages.push(args),
    SB_URL:'https://example.test',SB_KEY:'test',hdrs:()=>({}),sbUrl:x=>'https://example.test'+x,
    fetch:async(url,opts={})=>{
      const method=opts.method||'GET'; calls.push(method);
      const response=data=>({ok:true,json:async()=>JSON.parse(JSON.stringify(data))});
      if(method==='GET') return response([...stored].sort((a,b)=>a.position-b.position));
      const body=JSON.parse(opts.body);
      if(method==='POST'){stored.push({...body});return response([body]);}
      assert.equal(method,'PATCH','Saving must never delete album membership');
      patches++;
      if(mode==='noop') return response([]);
      if(mode==='fail' && patches===3) return {ok:false,text:async()=>'Network failure'};
      const slug=new URL(url).searchParams.get('song_slug').slice(3);
      const t=stored.find(t=>t.song_slug===slug);
      assert(!stored.some(x=>x!==t && x.position===body.position),'Position must be unique');
      t.position=body.position;return response([t]);
    }});
  vm.runInContext('let albumsData=[]; const albumOrderDirty=new Set(); const albumWritesPending=new Set();',c);
  vm.runInContext(source.slice(source.indexOf('async function addToAlbum('),source.indexOf('/* ── NEW ALBUM ── */')),c);
  c.renderAlbumSongs=al=>al.tracks.slice().sort((a,b)=>a.position-b.position).map(t=>t.song_slug).join(',');
  c.renderPicker=()=>'';
  c.initial=stored.map(t=>({...t,playlist_slug:'test'}));
  vm.runInContext("albumsData=[{slug:'test',tracks:initial}]; initDragSort('test');",c);
  const state=()=>JSON.parse(vm.runInContext('JSON.stringify(albumsData[0].tracks)',c));
  return {c,state,messages,calls,stored,filter(slugs){rows=slugs.map(makeRow);c.initDragSort('test');},
    mode(m){mode=m;patches=0;},drag(from,to){const event={preventDefault(){},dataTransfer:{}};
      rows.find(r=>r.dataset.slug===from).events.dragstart(event);
      rows.find(r=>r.dataset.slug===to).events.drop(event);
    },order:()=>state().map(t=>t.song_slug)};
}
(async()=>{
  let t=setup();t.drag('c','a');assert.deepEqual(t.order(),['c','a','b']);
  await t.c.addToAlbum('test','d');assert.deepEqual(t.order(),['c','a','b','d']);
  t.drag('d','c');await t.c.saveOrder('test');assert.deepEqual(t.order(),['d','c','a','b']);
  assert.deepEqual([...t.stored].sort((a,b)=>a.position-b.position).map(t=>t.song_slug),t.order());
  assert.equal(vm.runInContext('albumOrderDirty.size',t.c),0);
  console.log('PASS: reorder → add → reorder → save and database reload');
  t=setup();t.filter(['a','c']);t.drag('c','a');assert.deepEqual(t.order(),['c','b','a']);
  await t.c.saveOrder('test');assert.equal(t.stored.length,3);
  assert.deepEqual([...t.stored].sort((a,b)=>a.position-b.position).map(t=>t.song_slug),['c','b','a']);
  console.log('PASS: filtered reordering preserves hidden songs');
  for(const mode of ['noop','fail']){
    t=setup();t.drag('c','a');t.mode(mode);await t.c.saveOrder('test');
    assert.deepEqual(t.order(),['c','a','b']);assert.equal(t.stored.length,3);
    assert.equal(vm.runInContext('albumOrderDirty.has("test")',t.c),true);
    assert(t.messages.at(-1)[0].startsWith('Fehler beim Speichern'));
    t.mode('');await t.c.saveOrder('test');
    assert.equal(vm.runInContext('albumOrderDirty.size',t.c),0);
  }
  console.log('PASS: denied updates / interrupted save retain draft and allow retry');
  console.log('PASS: all inline scripts parse');
})().catch(e=>{console.error(e);process.exitCode=1;});
