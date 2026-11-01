// Real browser regression; data requests are mocked and never write to production.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HJ_TEST_URL || 'http://127.0.0.1:8787';
for (const name of ['index.html','dj.html','404.html','focus.html']) {
  const html=readFileSync(path.join(__dirname,'..',name),'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1]);
}
assert.equal(readFileSync(path.join(__dirname,'../404.html'),'utf8'),readFileSync(path.join(__dirname,'../index.html'),'utf8'));
async function appFrame(page, file='') {
  await page.goto(origin+'/'+file);
  const frame=await (await page.waitForSelector('iframe.hj-focus-frame')).contentFrame();
  await frame.waitForFunction(()=>!!window.HJFocus);
  return frame;
}
async function contextFor(browser, options={}) {
  const context=await browser.newContext(options);
  context.setDefaultTimeout(10000);
  await context.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin)) return route.continue();
    for(const name of ['logo-hitjourney.png','logo-making-waves.png']) {
      if(url.includes(name)) return route.fulfill({path:path.join(__dirname,'..',name),contentType:'image/png'});
    }
    if(url.includes('/rest/v1/')) return route.fulfill({json:[]});
    return route.abort();
  });
  return context;
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const context=await contextFor(browser,{viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    let app=await appFrame(page);
    await app.evaluate(()=>{
      window.homeClicks=0;
      document.getElementById('logoHome').addEventListener('click',()=>window.homeClicks++);
      window.originalAudio=document.querySelector('audio');
      window.preservedMarker={};
    });
    await app.locator('#logoHome .hj-focus-dot').click();
    await page.waitForFunction(()=>HJFocus.state().fullscreen && !HJFocus.state().pending);
    assert.equal(await app.evaluate(()=>window.homeClicks),0);
    assert.equal(await app.locator('.hj-focus-dot').evaluate(button=>getComputedStyle(button).outlineStyle),'none');
    // Both grips change the actual iframe viewport, including responsive media queries.
    const grip=page.locator('.hj-focus-grip[data-side="right"]');
    let box=await grip.boundingBox();
    await page.mouse.move(box.x+box.width/2,500);
    await page.mouse.down();
    await page.mouse.move(1000,500,{steps:12}); // 560px viewport centered at x=720.
    await page.mouse.up();
    await app.waitForFunction(()=>Math.abs(innerWidth-560)<2 && matchMedia('(max-width:700px)').matches);
    assert.equal(await page.locator('.hj-focus-viewport').evaluate(el=>Math.round(el.getBoundingClientRect().x)),440);
    assert.equal(await page.locator('.hj-focus-stage').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 18, 20)');
    assert.equal(await app.evaluate(()=>window.originalAudio===document.querySelector('audio') && !!window.preservedMarker),true);
    const left=page.locator('.hj-focus-grip[data-side="left"]');
    box=await left.boundingBox();
    await page.mouse.move(box.x+box.width/2,500);
    await page.mouse.down();
    await page.mouse.move(300,500,{steps:12}); // 840px.
    await page.mouse.up();
    await app.waitForFunction(()=>Math.abs(innerWidth-840)<2);
    await left.focus();
    await page.keyboard.press('Home');
    await app.waitForFunction(()=>innerWidth===320);
    await page.keyboard.press('ArrowRight');
    await app.waitForFunction(()=>innerWidth===340);
    await page.keyboard.press('End');
    await app.waitForFunction(()=>innerWidth===1412);
    await app.evaluate(()=>showAbout());
    assert.equal(await page.evaluate(()=>HJFocus.state().active),true);
    await page.locator('.hj-focus-exit').focus();
    await page.locator('.hj-focus-exit').click();
    await app.waitForFunction(()=>innerWidth===1440 && !HJFocus.state().active);
    await app.evaluate(()=>showHome());
    await app.locator('#logoHome .hj-focus-dot').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>HJFocus.state().fullscreen && !HJFocus.state().pending);
    await app.evaluate(()=>HJFocus.navigate('dj.html'));
    await app.waitForURL(origin+'/dj.html');
    await app.waitForFunction(()=>!!window.HJFocus);
    assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
    await left.focus();
    await page.keyboard.press('Home');
    await app.waitForFunction(()=>innerWidth===320);
    assert.equal(await app.locator('#mobileBrand').isVisible(),true);
    await app.locator('.mobile-hj-logo .hj-focus-dot').click();
    await page.waitForFunction(()=>!HJFocus.state().active);
    await app.waitForFunction(()=>innerWidth===1440);
    await app.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(()=>HJFocus.state().fullscreen && !HJFocus.state().pending);
    await app.waitForFunction(()=>innerWidth===320);
    await page.evaluate(()=>document.exitFullscreen());
    await page.waitForFunction(()=>!HJFocus.state().active);
    assert.equal(await app.locator('.hj-focus-dot').first().getAttribute('aria-pressed'),'false');
    await app.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(()=>HJFocus.state().fullscreen && !HJFocus.state().pending);
    await app.evaluate(()=>goHome());
    await app.waitForURL(origin+'/');
    await app.waitForFunction(()=>!!window.HJFocus);
    assert.equal(await app.evaluate(()=>innerWidth),320);
    await page.goBack();
    await app.waitForURL(origin+'/dj.html');
    await app.waitForFunction(()=>!!window.HJFocus);
    await page.goForward();
    await app.waitForURL(origin+'/');
    await app.waitForFunction(()=>!!window.HJFocus);
    assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hj-focus-panel')).opacity==='0');
    await page.screenshot({path:'/tmp/hitjourney-focus-resized.png'});
    console.log('PASS: unmarked dot; real fullscreen; continuous resizing on both sides; keyboard resizing; responsive DJ; DOM/audio preserved; navigation and Back/Forward; browser exit');
    for(const file of ['404.html','dj.html']) {
      app=await appFrame(page,file);
      await app.locator(file==='dj.html'?'.hj-logo-vert .hj-focus-dot':'#logoHome .hj-focus-dot').click();
      await page.waitForFunction(()=>HJFocus.state().fullscreen && !HJFocus.state().pending);
      await page.locator('.hj-focus-exit').focus();
    await page.locator('.hj-focus-exit').click();
      await page.waitForFunction(()=>!HJFocus.state().active);
    }
    console.log('PASS: direct DJ entry and 404 fallback');
    await context.close();
    const mobile=await contextFor(browser,{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.addInitScript(()=>{
      Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});
      Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{value:undefined});
    });
    const touch=await mobile.newPage();
    app=await appFrame(touch,'dj.html');
    await app.locator('.mobile-hj-logo .hj-focus-dot').tap();
    await touch.waitForFunction(()=>HJFocus.state().active && !HJFocus.state().pending);
    assert.match(await touch.locator('.hj-focus-panel').textContent(),/nicht verfügbar/);
    await app.waitForFunction(()=>innerWidth===370);
    await touch.keyboard.press('Escape');
    await touch.waitForFunction(()=>!HJFocus.state().active);
    await app.locator('.mobile-hj-logo').tap({position:{x:20,y:5}});
    await app.waitForURL(origin+'/');
    console.log('PASS: mobile dot/Home separation, unsupported fullscreen fallback, Escape');
    await mobile.close();
    const denied=await contextFor(browser,{viewport:{width:1440,height:1000}});
    await denied.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Denied'));});
    const blocked=await denied.newPage();
    app=await appFrame(blocked);
    await app.locator('#logoHome .hj-focus-dot').click();
    await blocked.waitForFunction(()=>HJFocus.state().active && !HJFocus.state().pending);
    assert.match(await blocked.locator('.hj-focus-panel').textContent(),/erlaubt kein Vollbild/);
    await blocked.locator('.hj-focus-exit').focus();
    await blocked.locator('.hj-focus-exit').click();
    await blocked.waitForFunction(()=>!HJFocus.state().active);
    await denied.close();
    console.log('PASS: API rejection recovery, inline syntax, 404 parity');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
