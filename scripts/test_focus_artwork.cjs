// Local browser regression with mocked artwork/data; no production writes.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.HJ_TEST_URL||'http://127.0.0.1:8787';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup(browser,options={}){
 const context=await browser.newContext(options);context.setDefaultTimeout(10000);
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin))return route.continue();
  if(url.startsWith('https://art.example/')){
   if(url.includes('missing'))return route.fulfill({status:404,body:''});
   if(url.includes('slow'))await pause(450);
   return route.fulfill({path:path.join(__dirname,'../logo-hitjourney.png'),contentType:'image/png'});
  }
  if(url.includes('/rest/v1/'))return route.fulfill({json:[]});
  for(const name of ['logo-hitjourney.png','logo-making-waves.png'])if(url.includes(name))return route.fulfill({path:path.join(__dirname,'..',name),contentType:'image/png'});
  return route.abort();
 });
 const page=await context.newPage();await page.goto(origin+'/dj.html');
 const app=await(await page.waitForSelector('.hj-focus-frame')).contentFrame();await app.waitForFunction(()=>!!window.HJFocus);
 await app.evaluate(()=>{
  DECKS.A.song={slug:'test-a',title:'Test A',cover:'https://art.example/cover.png',lyrics:'https://art.example/lyrics.png'};
  DECKS.B.song={slug:'test-b',title:'Test B',cover:'https://art.example/cover-b.png',lyrics:'https://art.example/lyrics-b.png'};
 });
 return {context,page,app};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const {context,page,app}=await setup(browser,{viewport:{width:1440,height:1000}});
  await app.locator('.hj-logo-vert .hj-focus-dot').click();
  await page.waitForFunction(()=>HJFocus.state().fullscreen&&!HJFocus.state().pending);
  const grip=page.locator('.hj-focus-grip[data-side=right]');
  let box=await grip.boundingBox();
  await page.mouse.move(box.x+7,500);await page.mouse.down();await page.mouse.move(1000,500,{steps:8});await page.mouse.up();
  await app.waitForFunction(()=>innerWidth===560);
  await page.mouse.move(720,400);
  // Normal work in the middle must not refresh the visibility timer.
  for(let n=0;n<4;n++){await page.mouse.move(710+n*5,400+n*2);await pause(700);}
  const hidden=()=>page.waitForFunction(()=>getComputedStyle(document.querySelector('.hj-focus-grip'),'::after').opacity==='0');
  const visible=()=>page.waitForFunction(()=>getComputedStyle(document.querySelector('.hj-focus-grip'),'::after').opacity==='1');
  await hidden();
  await page.mouse.move(940,400); // approach from inside the iframe, 60px from its right edge
  await visible();
  box=await grip.boundingBox();await page.mouse.move(box.x+7,500);
  await visible();await hidden(); // hover must not keep the bar visible indefinitely
  await page.mouse.move(1200,450);await page.mouse.move(1060,450); // approach through the dark margin
  await visible();
  await page.mouse.move(720,450);await hidden();
  await page.mouse.move(500,450); // left edge from inside the iframe
  await visible();
  console.log('PASS: handles hide after 3s during central work and stationary hover; proximity from iframe and dark margins reveals them on either side');
  // Restore a desktop viewport for the desktop artwork overlay.
  await page.locator('.hj-focus-exit').focus();await page.locator('.hj-focus-exit').click();
  await page.waitForFunction(()=>!HJFocus.state().active);
  const red=app.locator('.deck-red-btn[data-deck=A]');
  await red.click();
  let content=app.locator('#lyricsOverlay .dj-artwork-content');
  await content.locator('img[alt=Cover]').waitFor();
  await content.click();await content.locator('img[alt=Lyrics]').waitFor();
  assert.equal(await app.locator('#lyricsOverlay').evaluate(e=>e.classList.contains('expanded')),true);
  await content.click();await content.locator('img[alt=Cover]').waitFor();
  await content.click();await content.locator('img[alt=Lyrics]').waitFor();
  await app.locator('.lyrics-close').click();await red.click();
  await content.locator('img[alt=Cover]').waitFor(); // every fresh opening starts at cover
  await app.evaluate(()=>DECKS.A.song.lyrics='https://art.example/slow-lyrics.png');
  await content.click();await content.click();
  await content.locator('img[alt=Cover]').waitFor();await pause(650);
  assert.equal(await content.locator('img').getAttribute('alt'),'Cover');
  await app.locator('.lyrics-close').click();
  await app.evaluate(()=>{DECKS.A.song={slug:'missing',title:'',cover:'https://art.example/missing-cover.png',lyrics:'https://art.example/missing-lyrics.png'}});
  await red.click();await content.getByText('Kein Cover gefunden').waitFor();
  await content.click();await content.getByText('Kein Lyrics-Sheet gefunden').waitFor();
  await content.click();await content.getByText('Kein Cover gefunden').waitFor();
  await app.locator('.lyrics-close').click();
  assert.equal(await app.evaluate(()=>DECKS.A.playing),false);
  console.log('PASS: desktop Cover → Lyrics → Cover, expansion and close/reopen, failed artwork, stale-load cancellation, playback unchanged');
  await context.close();
  const mobile=await setup(browser,{viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await mobile.app.locator('.deck-red-btn[data-deck=A]').tap();
  content=mobile.app.locator('#lyricsOverlay .dj-artwork-content');
  await content.locator('img[alt=Cover]').waitFor();await content.tap();
  await content.locator('img[alt=Lyrics]').waitFor();await content.tap();
  await content.locator('img[alt=Cover]').waitFor();
  assert.equal(await mobile.app.locator('#lyricsOverlay').evaluate(e=>e.classList.contains('lyrics-fixed')),true);
  await mobile.app.locator('.lyrics-close').tap();
  await mobile.app.evaluate(()=>cycleMobileStage());
  const stage=mobile.app.locator('#mobileStage');
  await stage.locator('img[alt=Cover]').waitFor();await stage.tap();
  await stage.locator('img[alt=Lyrics]').waitFor();await stage.tap();
  await stage.locator('img[alt=Cover]').waitFor();
  assert.equal(await stage.evaluate(e=>e.classList.contains('show')),true);
  await mobile.app.evaluate(()=>{DECKS.A.song={...DECKS.B.song};cycleMobileStage()});
  await stage.locator('img[alt=Cover]').waitFor();
  assert.match(await stage.locator('img').getAttribute('src'),/cover-b/);
  await mobile.app.evaluate(()=>hideMobileStage());await mobile.app.evaluate(()=>cycleMobileStage());
  await stage.locator('img[alt=Cover]').waitFor();
  console.log('PASS: touch overlay and mobile stage alternate indefinitely; close and song change reset to cover');
  await mobile.context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
