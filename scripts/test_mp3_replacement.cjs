// Exercise the real save handler without uploading or changing live songs.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../admin.html'),'utf8');
for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(m[1]);
async function run(mode){
  const nodes={eTitle:{value:'Burning Love'},eArtist:{value:'Bro'},eSlug:{value:'burning-love'},eLang:{value:'german'},editSaveBtn:{},editMsg:{}};
  const uploads=[],messages=[]; let saved,refreshed=false;
  const c=vm.createContext({crypto:require('node:crypto').webcrypto,Date,encodeURIComponent,
    document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]},
    SB_URL:'https://example.test',SB_KEY:'test',hdrs:()=>({}),
    uploadToS3:async(file,key)=>{uploads.push({file,key}); if(mode==='upload-error')throw Error('failed');return 'https://audio.test/'+key;},
    sbWriteSongRecord:async(method,url,body)=>{saved=body;return {res:{ok:true}};},
    fetch:async()=>({ok:true,json:async()=>[{slug:'burning-love',mp3_url:mode==='stale'?'old.mp3':saved.mp3_url}]}),
    renderTable(){},populateArtistList(){},showMsg:(el,msg)=>messages.push(msg),toast(){},
    _fillEditForm(){refreshed=true;},
  });
  vm.runInContext("let editTarget={slug:'burning-love',mp3_url:'old.mp3'}; const editFiles={mp3:{name:'Gleich zurück.mp3'}}; let albumsData=[],allSongs=[],editSongList=[];",c);
  vm.runInContext(source.slice(source.indexOf('let editSavePending = false;'),source.indexOf('/* ── SAVE SONG ── */')),c);
  await c.saveEdit();
  assert.equal(uploads[0].file.name,'Gleich zurück.mp3');
  assert.match(uploads[0].key,/^songs\/burning-love-.+\/Gleich zurück\.mp3$/);
  assert.equal(decodeURIComponent(uploads[0].key.split('/').pop()),'Gleich zurück.mp3');
  assert.equal(vm.runInContext('editSavePending',c),false);
  assert.equal(nodes.editSaveBtn.disabled,false);
  if(mode==='ok'){
    assert.equal(saved.mp3_url,'https://audio.test/'+uploads[0].key);
    assert(refreshed);
    await c.saveEdit();
    assert.notEqual(uploads[0].key,uploads[1].key);
  }else{
    assert(!refreshed);
    assert(messages.some(m=>m.includes(mode==='stale'?'nicht im Song bestätigt':'Upload-Fehler')));
  }
}
(async()=>{for(const mode of ['ok','stale','upload-error'])await run(mode);console.log('MP3 replacement checks passed; inline scripts parse.');})().catch(e=>{console.error(e);process.exitCode=1;});
