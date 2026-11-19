/* Read every PostgREST page instead of silently stopping at the server row cap. */
window.hjFetchAllRowsResponse = async function(value, options = {}) {
  const pageSize = 500;
  const rows = [];
  const headers = new Headers(options.headers || {});
  const prefer = (headers.get('Prefer') || '').split(',').filter(p => !p.trim().startsWith('count='));
  prefer.push('count=exact');
  headers.set('Prefer', prefer.join(','));
  for (;;) {
    const url = new URL(value, window.location.href);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(rows.length));
    const response = await fetch(url.href, {...options, headers, cache:'no-store'});
    if (!response.ok) return response; // Never publish an incomplete successful result.
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Expected an array of database rows');
    rows.push(...page);
    const totalMatch = (response.headers.get('Content-Range') || '').match(/\/(\d+)$/);
    if (!page.length || (totalMatch && rows.length >= Number(totalMatch[1]))) break;
  }
  return new Response(JSON.stringify(rows), {status:200, headers:{'Content-Type':'application/json'}});
};
