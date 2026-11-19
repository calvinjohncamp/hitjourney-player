// Verify fresh iframe documents while keeping clean public URLs. No production writes.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.HJ_TEST_URL || 'http://127.0.0.1:8787';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();
  const requests=[];
  await page.route('**/dj.html*', async route=>{
   const url=new URL(route.request().url());
   if(route.request().frame().parentFrame()) requests.push(url);
   await route.fulfill({contentType:'text/html',body:'<!doctype html><script src="/assets/focus-entry.js?v=5"></script><body><div id="revision">'+requests.length+'</div></body>'});
  });
  await page.goto(origin+'/focus.html?page='+encodeURIComponent('/dj.html?keep=yes#album'));
  let frame=await (await page.waitForSelector('iframe.hj-focus-frame')).contentFrame();
  await frame.locator('#revision').waitFor();
  await page.waitForFunction(()=>location.pathname==='/dj.html');
  assert(requests[0].searchParams.has('__hj_load'));
  assert.equal(new URL(frame.url()).searchParams.get('keep'),'yes');
  assert.equal(new URL(frame.url()).searchParams.has('__hj_load'),false);
  assert.equal(new URL(page.url()).hash,'#album');
  await page.reload();
  frame=await (await page.waitForSelector('iframe.hj-focus-frame')).contentFrame();
  await frame.locator('#revision').waitFor();
  assert.equal(requests.length,2);
  assert.notEqual(requests[0].searchParams.get('__hj_load'),requests[1].searchParams.get('__hj_load'));
  assert.equal(await frame.locator('#revision').textContent(),'2');
  assert.equal(new URL(frame.url()).searchParams.has('__hj_load'),false);
  console.log('PASS: host reload requests a fresh iframe document; public URL/query/hash remain clean');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
