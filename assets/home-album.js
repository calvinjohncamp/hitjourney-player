/* Gilt für das Home-Grid, seine Wiedergabekette und das Album Home. */
window.HJHome = (() => {
  const settings = new Set(['headerLogo', 'about', 'landing', 'landingPages', 'subpages', 'overlayLibrary', 'albumPromotions']);
  const separateRows = new Set(['language', 'heading', 'spacer', 'silbertablett', 'slideshow', 'vinylPromotion']);
  const singleCardRows = new Set(['span-4', 'lyrics21', '4x1', 'free-full', 'span-2', '2x1', '2x1-full']);
  const specialSlugs = new Set(['kurs-nordwest', 'songwriters-picks']);
  const navigation = new Set(['album', 'link', 'subpage']);

  async function loadLayout(url, headers) {
    try {
      const response = await fetch(url + '/rest/v1/home_layout?select=*&order=row_order.asc,id.asc', {headers, cache:'no-store'});
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (error) {
      console.warn('[hitjourney] Home-Layout konnte nicht geladen werden:', error);
    }
    return null;
  }

  function rowsForGrid(rows) {
    const hasNormalVinyl = rows.some(row => Number(row?.row_order) >= 0 && row?.cells?.[0]?.type === 'vinylPromotion');
    return rows.filter(row => {
      const type = row?.cells?.[0]?.type;
      return row && !settings.has(type) && !(type === 'vinylPromotion' && Number(row.row_order) < 0 && hasNormalVinyl);
    });
  }

  function cardsForRow(cells) {
    const type = cells[0]?.type;
    if (!type || type === 'empty' || separateRows.has(type)) return [];
    if (singleCardRows.has(type)) return cells[0].imageUrl ? [cells[0]] : [];
    if (type === 'trio-a') return cells.slice(0, 3).filter(cell => cell?.imageUrl);
    return cells.filter(cell => cell?.imageUrl && cell.type !== 'hidden');
  }

  function resolveAlbumKey(slug, albums, playlistMap) {
    const raw = String(slug || '').trim();
    if (!raw) return null;
    const norm = raw.toLowerCase();
    if (albums[raw]) return raw;
    if (albums[norm]) return norm;
    const info = playlistMap[raw] || playlistMap[norm];
    if (info && albums[info.key]) return info.key;
    return Object.keys(albums).find(key => String(albums[key]?.slug || '').toLowerCase() === norm) || null;
  }

  function albumTarget(cell) {
    return cell.albumSlug || cell.album_slug || cell.playlist_slug || cell.playlistSlug || cell.slug;
  }

  function cardAlbumKey(cell, albums, playlistMap) {
    const target = albumTarget(cell);
    if (cell.fn === 'play' || cell.fn === 'link' || cell.fn === 'subpage') return null;
    if (cell.fn !== 'album' && specialSlugs.has(String(target || '').toLowerCase())) return null;
    return resolveAlbumKey(target, albums, playlistMap);
  }

  function chainSlug(cell, albumKey) {
    if (!cell.slug || navigation.has(cell.fn) || albumKey || specialSlugs.has(String(cell.slug).toLowerCase())) return '';
    return cell.slug;
  }

  function normalizeSlug(value) {
    return String(value || '').toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
  }

  function resolveSong(slug, songs) {
    if (!slug) return null;
    const normalized = normalizeSlug(slug);
    return songs.find(song => song.slug === slug)
      || songs.find(song => normalizeSlug(song.slug) === normalized)
      || songs.find(song => normalizeSlug(song.title) === normalized)
      || null;
  }

  function applyAlbum(albums, home, rows, songs, playlistMap) {
    if (!home || rows === null) return;
    const album = albums.home = {...home, songs:[]};
    for (const row of rowsForGrid(rows)) {
      for (const cell of cardsForRow(row.cells || [])) {
        const song = resolveSong(chainSlug(cell, cardAlbumKey(cell, albums, playlistMap)), songs);
        if (song?.mp3) album.songs.push({...song, _position:album.songs.length + 1});
      }
    }
    album.meta = album.songs.length + ' Songs';
  }

  return {loadLayout, rowsForGrid, cardsForRow, resolveAlbumKey, albumTarget, cardAlbumKey, chainSlug, normalizeSlug, resolveSong, applyAlbum};
})();
