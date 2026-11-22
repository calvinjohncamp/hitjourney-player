const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const origin = 'https://hitjourney.test';
const project = path.resolve(__dirname, '..');
const songs = Array.from({ length: 4 }, (_, i) => ({
  slug: 'test-song-' + (i + 1),
  title: 'Test Song ' + (i + 1),
  artist: 'Test Artist',
  cover_url: origin + '/icon-20260608.png',
  lyrics21_url: origin + '/favicon-20260608.png'
}));
const legacySong = {
  type: '1x1', fn: 'play', slug: songs[0].slug,
  imageUrl: songs[0].cover_url, alt: songs[0].title
};

async function assignSong(page, cell, song) {
  await cell.getByText('Inhalt wählen', { exact: true }).click();
  const list = page.locator('#htmSrcSong');
  await list.getByPlaceholder('Song suchen …').fill(song.title);
  assert.equal(await list.locator('#htmSelectedSong').isVisible(), false);
  await list.locator('#htmSongList').getByText(song.title, { exact: true }).click();
  await page.locator('#motifConfirmModal').getByRole('button', { name: '✓ Übernehmen' }).click();
  await page.locator('#htmStep2Next').click();
  await page.locator('#htmStep3').getByRole('button', { name: 'Speichern ✓' }).click();
  await page.locator('#homeTileModal').waitFor({ state: 'hidden' });
}

(async () => {
  const browser = await chromium.launch();
  let rows = [{
    id: 'legacy-row', row_order: 0,
    cells: [legacySong, { type: 'empty' }, { type: 'empty' }, { type: 'empty' }]
  }];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    context.setDefaultTimeout(5000);
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname === '/rest/v1/home_layout') {
        if (request.method() === 'POST') rows = request.postDataJSON();
        else assert.equal(request.method(), 'GET');
        return route.fulfill({ json: url.searchParams.get('row_order')?.startsWith('eq.-') ? [] : rows });
      }
      if (url.pathname === '/rest/v1/songs') return route.fulfill({ json: songs });
      if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
      if (url.origin === origin) {
        const file = path.join(project, url.pathname === '/' ? 'index.html' : url.pathname);
        if (existsSync(file)) return route.fulfill({ path: file });
      }
      return route.abort();
    });

    const page = await context.newPage();
    await page.goto(origin + '/admin.html#home');
    const editor = page.locator('#homeEditorWrap');
    const legacy = editor.locator('[data-row-id="legacy-row"].he-row');
    await legacy.getByRole('button', { name: 'Bearbeiten', exact: true }).first().click();
    assert.equal(await legacy.getByText('Inhalt wählen', { exact: true }).count(), 3);
    await assignSong(page, legacy.locator('.he-cell').nth(1), songs[1]);

    const layouts = [
      { key: '4x1x1', types: ['1x1', '1x1', '1x1', '1x1'] },
      { key: '3x1x1', types: ['1x1-third', '1x1-third', '1x1-third'] },
      { key: '2x1x1', types: ['1x1-big', '1x1-big'] },
      { key: '1x2x1-full', types: ['2x1-full'] },
      { key: '1x4x1', types: ['4x1'] },
      { key: '2x2x1-half', types: ['2x1-half', '2x1-half'] },
      { key: '3x1x15', types: ['trio-a', 'trio-b', 'trio-c'] },
      { key: '1x2x1-plus2', types: ['1x1', '2x1-half', '1x1'] }
    ];
    for (const { key, types } of layouts) {
      await editor.locator('.he-add-bar.bottom button').click();
      await page.getByRole('button', { name: 'Standard (vier Zellen)' }).click();
      const row = editor.locator('.he-row').last();
      const cells = row.locator('.he-cell');
      await cells.nth(2).getByText('Format wählen', { exact: true }).click();
      await page.locator(`#layoutPickerModal [data-layout="${key}"]`).click();
      if (key === '1x2x1-plus2') {
        await page.locator('#arrangementModal [data-arm="center"]').click();
        await page.locator('#armOkBtn').click();
      }
      await cells.first().getByText('Inhalt wählen', { exact: true }).waitFor();
      assert.equal(await row.getByText('Inhalt wählen', { exact: true }).count(), types.length, key);
      if (types.length === 1) {
        const grid = await row.locator('.he-row-grid').boundingBox();
        assert((await cells.first().boundingBox()).width > grid.width - 25, key + ' must span the row in edit mode');
      }
      for (const [i] of types.entries()) await assignSong(page, cells.nth(i), songs[i]);
    }

    await page.locator('#homeSaveBtn').click();
    await page.getByText('Home sicher gespeichert ✓', { exact: true }).waitFor();
    assert.deepEqual(rows[0].cells.slice(0, 2).map(cell => cell.slug), songs.slice(0, 2).map(song => song.slug));
    for (const [i, { types }] of layouts.entries()) {
      const cells = rows[i + 1].cells;
      assert.deepEqual(cells.slice(0, types.length).map(cell => cell.type), types);
      assert.deepEqual(cells.slice(0, types.length).map(cell => cell.slug), songs.slice(0, types.length).map(song => song.slug));
      assert(cells.slice(types.length).every(cell => cell.type === 'hidden'));
    }
    await page.reload();
    await legacy.locator('.he-cell-img').nth(1).waitFor();

    const publicPage = await context.newPage();
    await publicPage.goto(origin);
    const app = await (await publicPage.waitForSelector('.hj-focus-frame')).contentFrame();
    const cards = app.locator('#homeGrid [data-chain-slug]');
    await cards.nth(1).waitFor();
    await app.evaluate(() => {
      window.testPlayback = [];
      HJChain.startHomeFrom = card => window.testPlayback.push(card.dataset.chainSlug);
    });
    for (const i of [0, 1, 0]) await cards.nth(i).click();
    assert.deepEqual(await app.evaluate(() => window.testPlayback), [songs[0].slug, songs[1].slug, songs[0].slug]);
    console.log('Home tile layouts passed: existing four-tile row, song selection in every layout, save/reload, and public playback targets.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
