// Verify all alignment combinations, including legacy settings and rotated logos.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.HJ_TEST_URL||'http://127.0.0.1:8787';
const near=(a,b,message)=>assert(Math.abs(a-b)<1,message+': '+a+' vs '+b);
const measure=(frame,selector)=>frame.locator(selector).evaluate(async header=>{
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const parent=header.getBoundingClientRect();
 const rect=selector=>{const r=header.querySelector(selector).getBoundingClientRect();return {x:r.x-parent.x,y:r.y-parent.y,width:r.width,height:r.height,bottom:r.bottom-parent.y}};
 return {hit:rect('.hj-branding-left img'),dj:rect('.hj-dj-logo'),waves:rect('.hj-branding-right img'),height:header.getBoundingClientRect().height};
});
function verify(rects,djAlign,wavesAlign){
 for(const [name,align]of[['dj',djAlign],['waves',wavesAlign]]){
  const actual=rects[name],reference=rects.hit;
  if(align==='top')near(actual.y,reference.y,name+' top');
  if(align==='center')near(actual.y+actual.height/2,reference.y+reference.height/2,name+' center');
  if(align==='bottom')near(actual.bottom,reference.bottom,name+' bottom');
 }
}
(async()=>{
 for(const [name,type]of[['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true});
  let row={id:'header-test',cells:[{type:'headerLogo',src:'/assets/mr-dj-logo.png',color:'#C90018',width:91,rotation:0,ratio:5079/1129}]};
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(12000);
   await context.route('**/*',route=>{
    const request=route.request(),url=request.url();
    if(url.startsWith(origin))return route.continue();
    if(url.includes('/rest/v1/')){
     if(request.method()!=='GET'){
      const body=request.postDataJSON();assert.equal(body.row_order,-7);row={...row,cells:body.cells};return route.fulfill({json:[row]});
     }
     if(new URL(url).searchParams.get('row_order')==='eq.-7')return route.fulfill({json:[row]});
     return route.fulfill({json:[]});
    }
    for(const image of ['logo-hitjourney.png','logo-making-waves.png'])if(url.includes(image))return route.fulfill({path:path.join(__dirname,'..',image),contentType:'image/png'});
    return route.abort();
   });
   const page=await context.newPage();await page.goto(origin+'/admin.html');
   await page.waitForFunction(()=>document.getElementById('hjLogoHex')?.value==='#C90018'&&!document.getElementById('hjLogoReset').disabled);
   assert.equal(await page.locator('#hjLogoDjAlign').inputValue(),'center');
   assert.equal(await page.locator('#hjLogoWavesAlign').inputValue(),'center');
   await page.locator('#hjLogowidth').fill('180');await page.locator('#hjLogorotation').fill('30');
   for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    await page.waitForFunction(()=>[...document.querySelectorAll('#hjLogoPreview img')].every(img=>img.complete&&img.naturalWidth>0));
    const fixed=(await measure(page,'#hjLogoPreview'));
    for(const dj of ['top','center','bottom'])for(const waves of ['top','center','bottom']){
     await page.locator('#hjLogoDjAlign').selectOption(dj);await page.locator('#hjLogoWavesAlign').selectOption(waves);
     const values=await measure(page,'#hjLogoPreview');verify(values,dj,waves);
     near(values.hit.x,fixed.hit.x,'HitJourney horizontal position is fixed');
     near(values.hit.y,fixed.hit.y,'HitJourney vertical position is fixed');
     near(values.height,fixed.height,'Header height is fixed across alignment choices');
    }
   }
   await page.locator('#hjLogoSave').click();
   await page.waitForFunction(()=>document.getElementById('hjLogoStatus').textContent.includes('auf der Website aktiv'));
   assert.equal(row.cells[0].djAlign,'bottom');assert.equal(row.cells[0].wavesAlign,'bottom');
   await page.reload();await page.waitForFunction(()=>document.getElementById('hjLogoDjAlign')?.value==='bottom');
   assert.equal(await page.locator('#hjLogoWavesAlign').inputValue(),'bottom');
   await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/hj-alignment-admin-'+name+'.png'});
   const site=await context.newPage();await site.goto(origin);
   const app=await(await site.waitForSelector('.hj-focus-frame')).contentFrame();
   await app.waitForFunction(()=>document.querySelector('#mainHeader .hj-dj-logo feFlood')?.getAttribute('flood-color')==='#C90018');
   await app.waitForFunction(()=>[...document.querySelectorAll('#mainHeader img')].every(img=>img.complete&&img.naturalWidth>0));
   verify(await measure(app,'#mainHeader'),'bottom','bottom');
   await app.locator('#mainHeader .hj-dj-logo').screenshot({path:'/tmp/hj-alignment-visible-'+name+'.png'});
   await app.locator('#logoHome .hj-focus-dot').click();
   await site.waitForFunction(()=>HJFocus.state().active&&!HJFocus.state().pending);
   await app.locator('#mainHeader .hj-dj-logo').click();await app.waitForURL(origin+'/dj.html');
   assert.equal(await site.evaluate(()=>HJFocus.state().active),true);
   console.log('PASS '+name+': legacy settings; all 9 combinations on desktop/mobile; HitJourney fixed; save/reload; matching public layout; visible logo screenshot; DJ link retains focus');
   await context.close();
  }finally{await browser.close()}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
