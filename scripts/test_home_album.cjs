const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const origin = 'https://hitjourney.test';
const project = path.resolve(__dirname, '..');
const art = origin + '/favicon-20260608.png';
const track = (slug, mp3 = slug) => ({slug, title:slug, mp3_url:origin + '/' + mp3 + '.mp3', cover_url:art});
const tile = (slug, fields = {}) => ({type:'1x1', slug, fn:'play', imageUrl:art, ...fields});
const row = (row_order, ...cells) => ({id:String(row_order), row_order, cells});

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    context.setDefaultTimeout(8000);
    await context.addInitScript(() => {
      HTMLMediaElement.prototype.play = async function () {};
      HTMLMediaElement.prototype.load = function () {};
    });

    let songs = ['first', 'second', 'third', 'mix', 'old', 'nav', 'silent'].map(slug => track(slug));
    songs.find(song => song.slug === 'silent').mp3_url = null;
    let rows = [
      row(-5, tile('old', {type:'albumPromotions'})),
      row(0, tile('first', {type:'4x1'}), tile('old')),
      row(1, {type:'slideshow', slides:[tile('mix')]}),
      row(2, tile(' SECOND '), tile('old', {type:'hidden'}), tile('nav', {fn:'album'})),
      row(3, tile('third', {type:'trio-a'}), tile('first', {type:'trio-b'}), tile('silent', {type:'trio-c'}))
    ];
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/rest/v1/home_layout') {
        assert.equal(request.method(), 'GET');
        return route.fulfill({json:rows});
      }
      if (url.pathname === '/rest/v1/songs') return route.fulfill({json:songs});
      if (url.pathname === '/rest/v1/playlists') {
        return route.fulfill({json:[{slug:'home', title:'Home', cover_url:art}, {slug:'nav', title:'Nav'}]});
      }
      if (url.pathname === '/rest/v1/playlist_tracks') {
        const membership = [{playlist_slug:'home', song_slug:'old', position:1}, {playlist_slug:'nav', song_slug:'nav', position:1}];
        return route.fulfill({json:membership.slice(Number(url.searchParams.get('offset') || 0))});
      }
      if (url.origin === origin) {
        const file = path.join(project, url.pathname === '/' ? 'index.html' : url.pathname);
        if (existsSync(file)) return route.fulfill({path:file});
      }
      return route.abort();
    });

    const publicPage = await context.newPage();
    const djPage = await context.newPage();
    async function openApp(page, url) {
      await page.goto(origin + url);
      return page.frameLocator('.hj-focus-frame');
    }
    async function check(expected) {
      const [home, dj] = await Promise.all([openApp(publicPage, '/'), openApp(djPage, '/dj.html')]);
      const [homeState, djState] = await Promise.all([
        home.locator('#hjLoadingOverlay').waitFor({state:'hidden'}).then(() => home.locator('body').evaluate(() => ALBUMS.home)),
        dj.locator('#overlay').waitFor({state:'hidden'}).then(() => dj.locator('body').evaluate(() => ({
          album:ALBUMS.home,
          playback:[DECKS.A.song, DECKS.B.song, ...djQueue].filter(Boolean)
        })))
      ]);
      for (const album of [homeState, djState.album]) {
        assert.equal(album.cover, art);
        assert.equal(album.meta, expected.length + ' Songs');
        assert.deepEqual(album.songs.map(song => song.slug), expected);
        assert.deepEqual(album.songs.map(song => song._position), expected.map((_, i) => i + 1));
      }
      assert.deepEqual(djState.playback.map(song => song.slug), expected);
      const observed = [];
      if (expected.length) {
        await home.locator('#homeGrid [data-chain-home="1"]').first().click();
        await home.locator('#homeGrid [data-chain-home="1"].playing').waitFor();
        for (const _ of expected) {
          observed.push(await home.locator('body').evaluate(() => {
            const current = HJChain.getCurrent();
            current.audio.dispatchEvent(new Event('ended'));
            return current.song.slug;
          }));
        }
      }
      assert.deepEqual(observed, expected);
      if (expected.length) {
        await home.locator('body').evaluate(() => showAlbum('home'));
        const titles = await home.locator('#screenTracklist .tl-track .tl-title').allTextContents();
        assert.deepEqual(titles, expected);
      }
      return djState.album.songs;
    }

    await check(['first', 'second', 'third', 'first']);
    songs = [...songs.filter(song => song.slug !== 'first' && song.slug !== 'second'), track('fourth'), track('second', 'second-new-audio')];
    rows = [
      row(0, tile('third', {type:'2x1-half'}), tile('fourth'), tile('first')),
      row(1, tile('second', {type:'lyrics21', useCover21:true}))
    ];
    const updated = await check(['third', 'fourth', 'second']);
    assert.equal(updated[2].mp3, origin + '/second-new-audio.mp3');

    rows = [row(0, tile('fourth'))];
    await check(['fourth']);
    rows = [];
    await check([]);
    console.log('PASS: Home playback, album and Mr. DJ stay in order across layout and catalog changes.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
