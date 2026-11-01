const assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.HJ_TEST_URL||'http://127.0.0.1:8787';
async function geometry(app){
 return app.locator('#mainHeader').evaluate(async header=>{
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const hit=header.querySelector('.hj-branding-left img').getBoundingClientRect();
  const dj=header.querySelector('.hj-dj-logo').getBoundingClientRect();
  const art=header.querySelector('.hj-dj-logo-image'),style=getComputedStyle(art),hr=header.getBoundingClientRect();
  return {width:innerWidth,hit:{x:hit.x,right:hit.right,y:hit.y,w:hit.width,h:hit.height},dj:{x:dj.x,right:dj.right,bottom:dj.bottom,w:dj.width,h:dj.height},center:hr.x+hr.width/2,ratio:parseFloat(style.width)/parseFloat(style.height),overflow:document.documentElement.scrollWidth>innerWidth,touch:parseFloat(getComputedStyle(header.querySelector('.hj-dj-logo'),'::after').minHeight)};
 });
}
function check(g,ratio){
 assert(Math.abs(g.dj.x+g.dj.w/2-g.center)<1,'Mr. DJ must remain horizontally centered');
 assert(g.dj.w<=g.hit.w*.61+1 && g.dj.h<=g.hit.h*.71+1,'Mr. DJ must remain smaller than HitJourney');
 assert(Math.abs(g.ratio-ratio)<.04,'Artwork aspect ratio must be preserved');
 assert(Math.abs(g.dj.bottom-(g.hit.y+g.hit.h*230/294))<1,'Baseline alignment must survive resizing');
 assert(g.hit.right<=g.dj.x-20,'Branding must not overlap');
 assert(!g.overflow,'No horizontal overflow');assert(g.touch>=44,'Touch target must stay usable');
}
(async()=>{
 for(const [name,type]of[['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(12000);
   let config={type:'headerLogo',src:'/assets/mr-dj-logo.png',color:'#5A6D77',width:79,rotation:0,ratio:5079/1129,djAlign:'bottom',wavesAlign:'bottom'};
   await context.route('**/*',route=>{
    const req=route.request(),url=req.url();assert.equal(req.method(),'GET','Resizing must never write settings');
    if(url.startsWith(origin))return route.continue();
    if(url.includes('/rest/v1/'))return route.fulfill({json:new URL(url).searchParams.get('row_order')==='eq.-7'?[{id:'test-header',cells:[config]}]:[]});
    for(const image of ['logo-hitjourney.png','logo-making-waves.png'])if(url.includes(image))return route.fulfill({path:path.join(__dirname,'..',image),contentType:'image/png'});
    return route.abort();
   });
   const page=await context.newPage();await page.goto(origin);
   const app=await(await page.waitForSelector('.hj-focus-frame')).contentFrame();
   await app.waitForFunction(()=>document.querySelector('.hj-dj-logo feFlood')?.getAttribute('flood-color')==='#5A6D77');
   await app.waitForFunction(()=>[...document.querySelectorAll('#mainHeader img')].every(i=>i.complete&&i.naturalWidth>0));
   let desktopRatio,previous=Infinity;const sizes=[];
   for(const [width,height]of[[1440,1000],[1180,820],[1024,1366],[834,1194],[820,1180],[768,1024],[430,932],[414,896],[390,844],[375,812],[320,740]]){
    await page.setViewportSize({width,height});const g=await geometry(app);check(g,config.ratio);
    if(!desktopRatio)desktopRatio=g.dj.w/g.hit.w;
    assert(Math.abs(g.dj.w/g.hit.w-desktopRatio)<.015,'Relative logo size must remain proportional');
    assert(g.dj.w<=previous+1,'Logo must get no larger on narrower portrait widths');previous=g.dj.w;
    sizes.push([width,Math.round(g.hit.w*10)/10,Math.round(g.dj.w*10)/10]);
    if(width===834||width===390)await app.locator('#mainHeader').screenshot({path:'/tmp/hj-responsive-'+name+'-'+width+'.png'});
   }
   assert(sizes.find(x=>x[0]===834)[2]<sizes[0][2]);
   assert(sizes.find(x=>x[0]===390)[2]<sizes.find(x=>x[0]===834)[2]);
   // Same-width height breakpoint and returning to desktop must restore the preference.
   await page.setViewportSize({width:1440,height:600});let g=await geometry(app);check(g,config.ratio);const short=g.dj.w;
   await page.setViewportSize({width:1440,height:1000});g=await geometry(app);check(g,config.ratio);assert(g.dj.w>short+10);assert(Math.abs(g.dj.w-79)<1);
   for(const [ratio,rotation]of[[5079/1129,30],[1,45],[.3,90],[12,-30]]){
    config={...config,width:240,ratio,rotation};
    await app.evaluate(()=>dispatchEvent(new Event('focus')));
    await app.waitForFunction(rotation=>document.getElementById('mainHeader').style.getPropertyValue('--dj-logo-angle')===rotation+'deg',config.rotation);
    for(const [width,height]of[[1440,1000],[834,1194],[390,844]]){await page.setViewportSize({width,height});check(await geometry(app),ratio);}
   }
   // Focus drag changes the iframe viewport; it must also shrink the logo.
   config={...config,width:79,rotation:0,ratio:5079/1129};
   await page.setViewportSize({width:1440,height:1000});await app.evaluate(()=>dispatchEvent(new Event('focus')));await app.waitForFunction(()=>document.getElementById('mainHeader').style.getPropertyValue('--dj-logo-angle')==='0deg');
   await app.locator('#logoHome .hj-focus-dot').click();await page.waitForFunction(()=>HJFocus.state().active&&!HJFocus.state().pending);
   const grip=page.locator('.hj-focus-grip[data-side=right]'),box=await grip.boundingBox();
   await page.mouse.move(box.x+7,400);await page.mouse.down();await page.mouse.move(1000,400,{steps:8});await page.mouse.up();
   await app.waitForFunction(()=>innerWidth===560);check(await geometry(app),config.ratio);
   await app.locator('#mainHeader .hj-dj-logo').click();await app.waitForURL(origin+'/dj.html');assert.equal(await page.evaluate(()=>HJFocus.state().active),true);
   console.log('PASS '+name+': [viewport, HitJourney width, Mr. DJ width] '+JSON.stringify(sizes));
   console.log('PASS '+name+': proportion, centering, baseline, hierarchy, aspect ratio, rotation/custom shapes, height breakpoint, desktop restoration, touch target and focus resize/link');
   await context.close();
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
