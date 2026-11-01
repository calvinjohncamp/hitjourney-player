// Browser regression: local HTTP only; no production writes.
// PLAYWRIGHT_MODULE may point to an existing Playwright install.
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HJ_TEST_URL || 'http://127.0.0.1:8787';
for (const file of ['index.html','dj.html','404.html']) {
  const html = readFileSync(path.join(__dirname,'..',file),'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new vm.Script(match[1]);
  assert(html.includes('assets/focus.js'));
}
assert.equal(readFileSync(path.join(__dirname,'../404.html'),'utf8'),readFileSync(path.join(__dirname,'../index.html'),'utf8'));
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      if (url.includes('logo-hitjourney.png')) return route.fulfill({path:path.join(__dirname,'../logo-hitjourney.png'),contentType:'image/png'});
      if (url.includes('logo-making-waves.png')) return route.fulfill({path:path.join(__dirname,'../logo-making-waves.png'),contentType:'image/png'});
      if (url.includes('/rest/v1/')) return route.fulfill({json:[]});
      return route.abort();
    });
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => !!window.HJFocus);
    // Entry must keep the existing DOM/player and must not invoke Home.
    await page.evaluate(() => { window.homeClicks=0; document.getElementById('logoHome').addEventListener('click',()=>window.homeClicks++); window.originalAudio=document.querySelector('audio'); });
    await page.locator('#logoHome .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().active && !HJFocus.state().pending);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement),true);
    assert.equal(await page.evaluate(() => window.homeClicks),0);
    await page.screenshot({path:'/tmp/hitjourney-focus-desktop.png'});
    assert.equal(await page.evaluate(() => window.originalAudio===document.querySelector('audio')),true);
    await page.evaluate(() => showAbout());
    assert.equal(await page.evaluate(() => HJFocus.state().active),true);
    await page.locator('.hj-focus-exit').click();
    await page.waitForFunction(() => !HJFocus.state().active);
    await page.evaluate(() => showHome());
    await page.locator('#logoHome .hj-focus-dot').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HJFocus.state().active && !HJFocus.state().pending);
    await page.evaluate(() => HJFocus.navigate('dj.html'));
    const frame = await (await page.waitForSelector('iframe.hj-focus-frame')).contentFrame();
    await frame.waitForFunction(() => !!window.HJFocus);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement),true);
    assert.equal(await frame.evaluate(() => HJFocus.state().active),true);
    await page.locator('.hj-focus-exit').click();
    await page.waitForFunction(() => !HJFocus.state().active);
    await frame.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().fullscreen && !HJFocus.state().pending);
    await frame.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(() => !HJFocus.state().active);
    assert.equal(await frame.locator('.hj-focus-panel').isVisible(),false);
    await frame.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().fullscreen && !HJFocus.state().pending);
    // Browser-initiated fullscreen exit (the event used for native Escape).
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !HJFocus.state().active);
    assert.equal(await frame.locator('.hj-focus-dot').first().getAttribute('aria-pressed'),'false');
    await frame.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().fullscreen && !HJFocus.state().pending);
    await frame.evaluate(() => goHome());
    await frame.waitForURL(origin+'/');
    await frame.waitForFunction(() => !!window.HJFocus);
    assert.equal(await frame.evaluate(() => HJFocus.state().active),true);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement),true);
    await page.goBack();
    await frame.waitForURL(origin+'/dj.html');
    await frame.waitForFunction(() => !!window.HJFocus);
    assert.equal(await frame.evaluate(() => HJFocus.state().active),true);
    await page.goForward();
    await frame.waitForURL(origin+'/');
    await frame.waitForFunction(() => !!window.HJFocus);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement),true);
    console.log('PASS: real fullscreen, logo/Home separation, keyboard, SPA and DJ → Home navigation with Back/Forward, browser exit synchronization');
    await page.goto(origin+'/404.html');
    await page.waitForFunction(() => !!window.HJFocus);
    await page.locator('#logoHome .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().fullscreen && !HJFocus.state().pending);
    await page.locator('#logoHome .hj-focus-dot').click();
    await page.waitForFunction(() => !HJFocus.state().active);
    await page.goto(origin+'/dj.html');
    await page.waitForFunction(() => !!window.HJFocus);
    await page.locator('.hj-logo-vert .hj-focus-dot').click();
    await page.waitForFunction(() => HJFocus.state().fullscreen && !HJFocus.state().pending);
    await page.locator('.hj-focus-exit').click();
    await page.waitForFunction(() => !HJFocus.state().active);
    console.log('PASS: direct DJ entry and 404 fallback');
    await context.close();
    // Unsupported mobile API: honest fallback, touch event separation and Escape.
    const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.route('**/*',route=>{
      const url=route.request().url();
      if(url.startsWith(origin)) return route.continue();
      if(url.includes('logo-hitjourney.png')) return route.fulfill({path:path.join(__dirname,'../logo-hitjourney.png'),contentType:'image/png'});
      if(url.includes('/rest/v1/')) return route.fulfill({json:[]});
      return route.abort();
    });
    await mobile.addInitScript(() => {
      Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});
      Object.defineProperty(Element.prototype,'webkitRequestFullscreen',{value:undefined});
    });
    mobile.setDefaultTimeout(10000);
    const touch = await mobile.newPage();
    await touch.goto(origin+'/dj.html');
    await touch.waitForFunction(() => !!window.HJFocus);
    await touch.locator('.mobile-hj-logo .hj-focus-dot').tap();
    await touch.waitForFunction(() => HJFocus.state().active && !HJFocus.state().pending);
    assert.equal(new URL(touch.url()).pathname,'/dj.html');
    assert.match(await touch.locator('.hj-focus-panel').textContent(),/nicht verfügbar/);
    await touch.screenshot({path:'/tmp/hitjourney-focus-mobile.png'});
    await touch.keyboard.press('Escape');
    await touch.waitForFunction(() => !HJFocus.state().active);
    await touch.locator('.mobile-hj-logo').tap({position:{x:20,y:5}});
    await touch.waitForURL(origin+'/');
    console.log('PASS: mobile dot vs. Home, unsupported fullscreen fallback and Escape');
    await mobile.close();
    // Explicit rejection also keeps a usable exit and reports the actual state.
    const denied = await browser.newPage();
    denied.setDefaultTimeout(10000);
    await denied.route('**/*',route=>{
      const url=route.request().url();
      if(url.startsWith(origin)) return route.continue();
      if(url.includes('logo-hitjourney.png')) return route.fulfill({path:path.join(__dirname,'../logo-hitjourney.png'),contentType:'image/png'});
      if(url.includes('/rest/v1/')) return route.fulfill({json:[]});
      return route.abort();
    });
    await denied.addInitScript(() => {Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Denied'));});
    await denied.goto(origin);
    await denied.waitForFunction(() => !!window.HJFocus);
    await denied.locator('#logoHome .hj-focus-dot').click();
    await denied.waitForFunction(() => HJFocus.state().active && !HJFocus.state().pending);
    assert.match(await denied.locator('.hj-focus-panel').textContent(),/erlaubt kein Vollbild/);
    await denied.locator('.hj-focus-exit').click();
    await denied.waitForFunction(() => !HJFocus.state().active);
    console.log('PASS: fullscreen rejection and recovery; inline syntax and 404 parity');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
