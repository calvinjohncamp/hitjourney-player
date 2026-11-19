const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../assets/data-loader.js'),'utf8');
async function test(total, cap, counts, failAt){
 const calls=[];
 const context={window:{location:{href:'https://example.test/'}},URL,Headers,Response,fetch:async(url,options)=>{
  const u=new URL(url),offset=Number(u.searchParams.get('offset'));
  calls.push({offset,options});
  if(offset===failAt)return new Response('Denied',{status:403});
  const n=Math.min(Number(u.searchParams.get('limit')),cap,total-offset);
  return new Response(JSON.stringify(Array.from({length:Math.max(0,n)},(_,i)=>({id:offset+i}))),{headers:counts?{'Content-Range':offset+'-'+(offset+n-1)+'/'+total}:{}});
 }};
 vm.runInNewContext(source,context);
 const response=await context.window.hjFetchAllRowsResponse('https://example.test/rest/v1/playlist_tracks?order=id',{headers:{apikey:'test',Prefer:'return=representation'}});
 if(failAt!==undefined){assert.equal(response.status,403);return;}
 const rows=await response.json();
 assert.deepEqual(rows.map(r=>r.id),Array.from({length:total},(_,i)=>i));
 assert(calls.every(c=>c.options.cache==='no-store'&&c.options.headers.get('apikey')==='test'));
 assert(calls[0].options.headers.get('Prefer').includes('return=representation'));
}
(async()=>{
 await test(1035,1000,true);await test(1035,100,true);await test(1035,100,false);
 await test(0,1000,true);await test(1000,1000,true);await test(1035,1000,true,500);
 console.log('PASS: all rows across server caps; missing counts; empty/exact pages; headers; failed pages do not return partial success');
})().catch(e=>{console.error(e);process.exitCode=1;});
