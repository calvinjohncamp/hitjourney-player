const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
for(const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(m[1]);
const calls=[];
const node=()=>({dataset:{},appendChild(){},addEventListener(type,fn){this[type]=fn;}});
const c=vm.createContext({document:{createElement:node},ALBUMS:{'out-there':{}},PLAYLIST_MAP:{},
  appendHomeOverlaysToCard(){},isStandaloneHomeAudioTeaser:()=>false,
  HJChain:{startHomeFrom:el=>calls.push(['chain',el.dataset.chainSlug])},
  showAlbum:key=>calls.push(['album',key]),playSongBySlug:slug=>calls.push(['song',slug]),
  setTimeout:fn=>fn(),window:{open:u=>calls.push(['link',u])},showArchive(){}});
function load(start,end){vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))),c);}
load('function resolveAlbumKey(', '/* ── Play song or album');
load('function buildHomeCard(', 'function normalizeTeaserSlug(');
load('function playSongOrAlbum(', '/* ── Play a single song');
const song=c.buildHomeCard({fn:'play',slug:'out-there',albumSlug:'out-there',type:'2x1-full'});
assert.equal(song.dataset.album,undefined);assert.equal(song.dataset.chainHome,'1');
song.click();assert.deepEqual(calls.pop(),['chain','out-there']);
const album=c.buildHomeCard({fn:'album',slug:'out-there',type:'2x1-full'});
assert.equal(album.dataset.album,'out-there');assert.equal(album.dataset.chainHome,undefined);
album.click();assert.deepEqual(calls.pop(),['album','out-there']);
for(const fn of ['play','album']){
 c.playSongOrAlbum({fn,slug:'out-there'});
 assert.deepEqual(calls.pop(),[fn==='play'?'song':'album','out-there']);
}
c.playSongOrAlbum({fn:'album',slug:'missing'});assert.equal(calls.length,0);
const link=c.buildHomeCard({fn:'link',slug:'out-there',url:'https://example.com'});
assert.equal(link.dataset.album,undefined);link.click();assert.deepEqual(calls.pop(),['link','https://example.com']);
console.log('PASS: same-name song and album honor Admin action in home cards and shared playback; scripts parse.');
