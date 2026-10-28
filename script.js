(() => {
'use strict';
const $ = s => document.querySelector(s);
const KEY = 'smartLinkHub.v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- Sample data ---------- */
const SECTIONS = [['edu','🎓','Education'],['dev','💻','Development Tools'],['ai','🤖','AI Tools'],['social','📱','Social Media'],['work','💼','Work & Productivity'],['fun','🎬','Entertainment'],['other','📂','Other Websites']];
const SAMPLES = [
  ['Google','https://www.google.com','Search the web and find answers fast.','work',0,0],
  ['YouTube','https://www.youtube.com','Watch videos, tutorials and music.','fun',1,0],
  ['GitHub','https://github.com','Host code and collaborate on projects.','dev',1,1],
  ['ChatGPT','https://chatgpt.com','AI assistant for writing, ideas and code.','ai',0,0],
  ['Instagram','https://www.instagram.com','Share photos and follow friends.','social',0,0],
  ['LinkedIn','https://www.linkedin.com','Professional network and job search.','social',0,0],
  ['Wikipedia','https://www.wikipedia.org','Free encyclopedia for quick research.','edu',0,0],
  ['Stack Overflow','https://stackoverflow.com','Programming questions and answers.','dev',0,0],
  ['Notion','https://www.notion.so','Notes, tasks and docs in one workspace.','work',0,0]
];
const seed = () => { const t = Date.now(); return {
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', sort: 'recent',
  sections: SECTIONS.map(([id, icon, name]) => ({id, icon, name})),
  sites: SAMPLES.map(([name, url, desc, sec, fav, pin], i) => ({id: uid() + i, name, url, desc, sec, fav: !!fav, pin: !!pin, added: t - i * 3600000, visits: 0, last: 0}))
}; };

/* ---------- State ---------- */
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.sites) && Array.isArray(d.sections)) return d; } catch {} return seed(); };
let S = load();
let ui = {view: 'all', q: ''};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Could not save. Browser storage is full or blocked.'); } };
const FALLBACK = {id: 'other', icon: '📂', name: 'Other Websites'};
const secOf = id => S.sections.find(s => s.id === id) || S.sections.find(s => s.id === 'other') || FALLBACK;
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const countIn = id => S.sites.filter(s => s.sec === id).length;

function normUrl(v) {
  v = v.trim(); if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = 'https://' + v;
  let u; try { u = new URL(v); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!u.hostname.includes('.') && u.hostname !== 'localhost') return null;
  return u.href;
}
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200); }
function ask(msg, ok = 'Delete', title = 'Are you sure?') {
  return new Promise(res => {
    $('#cTitle').textContent = title; $('#cMsg').textContent = msg; $('#cOk').textContent = ok;
    const d = $('#confirmDlg'); d.returnValue = ''; d.onclose = () => res(d.returnValue === 'ok'); d.showModal();
  });
}

/* ---------- Filtering & sorting ---------- */
const matches = s => { const q = ui.q.trim().toLowerCase(); return !q || (s.name + ' ' + s.url + ' ' + s.desc).toLowerCase().includes(q); };
function visible() {
  const v = ui.view; let l = S.sites;
  if (v === 'fav') l = l.filter(s => s.fav);
  else if (v.startsWith('sec:')) l = l.filter(s => s.sec === v.slice(4));
  l = l.filter(matches);
  const by = v === 'recent' ? 'recent' : S.sort;
  const cmp = {recent: (a, b) => b.added - a.added, az: (a, b) => a.name.localeCompare(b.name), za: (a, b) => b.name.localeCompare(a.name)}[by] || ((a, b) => b.added - a.added);
  return [...l].sort((a, b) => v === 'recent' ? cmp(a, b) : (b.pin - a.pin) || cmp(a, b));
}

/* ---------- Rendering ---------- */
const card = s => { const sc = secOf(s.sec); return `
<article class="card${s.pin ? ' pinned' : ''}" draggable="true" data-id="${s.id}">
  <div class="t2">
    <img class="ico" data-l="${esc((s.name[0] || '?').toUpperCase())}" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(s.url))}&sz=64" alt="" loading="lazy">
    <div class="t"><h3 title="${esc(s.name)}">${esc(s.name)}</h3><span class="host">${esc(host(s.url))}</span></div>
    <button class="ib${s.pin ? ' on' : ''}" data-a="pin" title="${s.pin ? 'Unpin' : 'Pin to top'}" aria-label="${s.pin ? 'Unpin' : 'Pin to top'}">📌</button>
    <button class="ib${s.fav ? ' on' : ''}" data-a="fav" title="${s.fav ? 'Remove from favorites' : 'Add to favorites'}" aria-label="Toggle favorite">${s.fav ? '★' : '☆'}</button>
  </div>
  <p class="d">${s.desc ? esc(s.desc) : '<em>No description</em>'}</p>
  <span class="chip">${esc(sc.icon)} ${esc(sc.name)}</span>
  <div class="acts">
    <a class="btn primary sm" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-a="open">Open Website</a>
    <button class="btn sm" data-a="edit">Edit</button>
    <button class="btn sm danger" data-a="del">Delete</button>
  </div>
</article>`; };

function renderSide() {
  const item = (v, ic, l, c) => `<button class="nav${ui.view === v ? ' act' : ''}" data-v="${v}"><span>${ic}</span><span class="l">${l}</span><b>${c}</b></button>`;
  $('#navTop').innerHTML = item('all', '🏠', 'All Websites', S.sites.length) + item('fav', '⭐', 'Favorites', S.sites.filter(s => s.fav).length) + item('recent', '🕘', 'Recently Added', '');
  $('#secs').innerHTML = S.sections.map(x => `
    <div class="srow" data-sec="${x.id}">
      ${item('sec:' + x.id, esc(x.icon), esc(x.name), countIn(x.id))}
      <span class="sa"><button class="ib" data-sa="ren" data-id="${x.id}" title="Rename section" aria-label="Rename ${esc(x.name)}">✎</button>${x.id === 'other' ? '' : `<button class="ib" data-sa="del" data-id="${x.id}" title="Delete section" aria-label="Delete ${esc(x.name)}">🗑</button>`}</span>
    </div>`).join('');
  $('#navBot').innerHTML = item('settings', '⚙️', 'Settings', '');
}

function emptyState(icon, h, p, btn) {
  return `<div class="empty"><div class="big">${icon}</div><h2>${h}</h2><p>${p}</p>${btn ? '<button class="btn primary" data-s="add">＋ Add Website</button>' : ''}</div>`;
}

function renderMain() {
  const v = ui.view, c = $('#content');
  $('#sortWrap').hidden = v === 'settings' || v === 'recent';
  $('#sort').value = S.sort || 'recent';
  if (v === 'settings') { $('#title').textContent = 'Settings'; $('#sub').textContent = 'Appearance and your data'; c.innerHTML = settingsHtml(); return; }
  const l = visible();
  const sec = v.startsWith('sec:') ? S.sections.find(x => x.id === v.slice(4)) : null;
  $('#title').textContent = v === 'fav' ? '⭐ Favorites' : v === 'recent' ? '🕘 Recently Added' : sec ? sec.icon + ' ' + sec.name : 'All Websites';
  $('#sub').textContent = `${l.length} of ${S.sites.length} saved website${S.sites.length === 1 ? '' : 's'}` + (ui.q.trim() ? ` matching “${ui.q.trim()}”` : '');
  let h = '';
  if (v === 'recent') {
    const rv = S.sites.filter(s => s.last && matches(s)).sort((a, b) => b.last - a.last).slice(0, 6);
    h += '<h2 class="sh">Recently visited</h2>' + (rv.length ? `<div class="grid">${rv.map(card).join('')}</div>` : '<p class="muted">Websites you open from here will appear in this list.</p>');
    h += '<h2 class="sh">Recently added</h2>';
  }
  if (!l.length) {
    h += !S.sites.length ? emptyState('🔗', 'No websites saved yet', 'Add your first website to start building your hub.', true)
      : ui.q.trim() ? emptyState('🔍', 'No matches found', 'Try a different name, URL or keyword.')
      : v === 'fav' ? emptyState('⭐', 'No favorites yet', 'Tap the star on any website to keep it here.')
      : emptyState('📂', 'This section is empty', 'Add a website, or drag a card onto this section in the sidebar.', true);
  } else h += `<div class="grid">${l.map(card).join('')}</div>`;
  c.innerHTML = h;
  c.querySelectorAll('img.ico').forEach(i => i.onerror = () => { i.outerHTML = `<span class="ico ph">${i.dataset.l}</span>`; });
}

function settingsHtml() {
  const n = S.sites.length;
  return `
  <section class="panel"><h2>Appearance</h2><div class="row">
    <button class="btn" data-s="light">☀️ Light mode</button><button class="btn" data-s="dark">🌙 Dark mode</button></div></section>
  <section class="panel"><h2>Your data</h2>
    <p class="muted">${n} website${n === 1 ? '' : 's'} in ${S.sections.length} sections, saved in this browser.</p>
    <div class="row">
      <button class="btn" data-s="export">Export JSON</button><button class="btn" data-s="import">Import JSON</button>
      <button class="btn" data-s="sample">Restore sample data</button><button class="btn danger" data-s="clear">Delete all websites</button></div>
    <div class="stats">${S.sections.map(x => `<span class="chip">${esc(x.icon)} ${esc(x.name)}: ${countIn(x.id)}</span>`).join('')}</div></section>`;
}

function render() { renderSide(); renderMain(); document.documentElement.dataset.theme = S.theme; $('#themeBtn').textContent = S.theme === 'dark' ? '☀️' : '🌙'; }

/* ---------- Website dialog ---------- */
let editing = null;
function siteForm(s) {
  editing = s || null;
  $('#siteForm').reset(); $('#eName').textContent = $('#eUrl').textContent = '';
  $('#siteTitle').textContent = s ? 'Edit website' : 'Add website';
  $('#fSec').innerHTML = S.sections.map(x => `<option value="${x.id}">${esc(x.icon)} ${esc(x.name)}</option>`).join('');
  $('#fSec').value = s ? s.sec : ui.view.startsWith('sec:') ? ui.view.slice(4) : (S.sections.some(x => x.id === 'other') ? 'other' : S.sections[0].id);
  $('#fName').value = s ? s.name : ''; $('#fUrl').value = s ? s.url : ''; $('#fDesc').value = s ? s.desc : '';
  $('#fFav').checked = s ? s.fav : ui.view === 'fav'; $('#fPin').checked = s ? s.pin : false;
  $('#siteDlg').showModal(); $('#fName').focus();
}
$('#siteForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#fName').value.trim(), url = normUrl($('#fUrl').value);
  $('#eName').textContent = name ? '' : 'Enter a website name.';
  $('#eUrl').textContent = url ? '' : 'Enter a valid web address, such as example.com or https://example.com.';
  if (!name || !url) return;
  const o = {name, url, desc: $('#fDesc').value.trim(), sec: $('#fSec').value, fav: $('#fFav').checked, pin: $('#fPin').checked};
  const was = editing;
  if (was) Object.assign(was, o); else S.sites.unshift({id: uid(), ...o, added: Date.now(), visits: 0, last: 0});
  save(); $('#siteDlg').close(); render(); toast(was ? 'Changes saved' : 'Website added');
});

/* ---------- Section dialog ---------- */
let secEditing = null;
function secForm(x) {
  secEditing = x || null; $('#secForm').reset(); $('#eSec').textContent = '';
  $('#secTitle').textContent = x ? 'Rename section' : 'Create section';
  $('#sIcon').value = x ? x.icon : '📁'; $('#sName').value = x ? x.name : '';
  $('#secDlg').showModal(); $('#sName').focus();
}
$('#secForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#sName').value.trim(), icon = $('#sIcon').value.trim() || '📁';
  const dup = S.sections.some(x => x !== secEditing && x.name.toLowerCase() === name.toLowerCase());
  $('#eSec').textContent = !name ? 'Enter a section name.' : dup ? 'A section with this name already exists.' : '';
  if (!name || dup) return;
  const was = secEditing;
  if (was) { was.name = name; was.icon = icon; }
  else { const x = {id: uid(), name, icon}; S.sections.push(x); ui.view = 'sec:' + x.id; }
  save(); $('#secDlg').close(); render(); toast(was ? 'Section renamed' : 'Section created');
});
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());

/* ---------- Events ---------- */
$('#addBtn').onclick = () => siteForm();
$('#newSec').onclick = () => secForm();
$('#settingsBtn').onclick = () => { ui.view = 'settings'; render(); };
$('#themeBtn').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); render(); };
$('#menuBtn').onclick = () => document.body.classList.toggle('open');
$('#scrim').onclick = () => document.body.classList.remove('open');
$('#search').addEventListener('input', e => { ui.q = e.target.value; if (ui.view === 'settings') { ui.view = 'all'; renderSide(); } renderMain(); });
$('#sort').onchange = e => { S.sort = e.target.value; save(); renderMain(); };

$('#side').addEventListener('click', async e => {
  const sa = e.target.closest('[data-sa]');
  if (sa) {
    const x = S.sections.find(s => s.id === sa.dataset.id); if (!x) return;
    if (sa.dataset.sa === 'ren') return secForm(x);
    const n = countIn(x.id);
    if (await ask(`Delete “${x.name}”? ${n ? `Its ${n} website${n === 1 ? '' : 's'} will move to Other Websites.` : 'This section is empty.'}`, 'Delete section', 'Delete section?')) {
      S.sites.forEach(s => { if (s.sec === x.id) s.sec = 'other'; });
      S.sections = S.sections.filter(s => s !== x);
      if (ui.view === 'sec:' + x.id) ui.view = 'all';
      save(); render(); toast('Section deleted');
    }
    return;
  }
  const nv = e.target.closest('[data-v]');
  if (nv) { ui.view = nv.dataset.v; document.body.classList.remove('open'); render(); }
});

$('#content').addEventListener('click', async e => {
  const st = e.target.closest('[data-s]');
  if (st) return settingsAction(st.dataset.s);
  const b = e.target.closest('[data-a]'); if (!b) return;
  const s = S.sites.find(x => x.id === b.closest('.card')?.dataset.id); if (!s) return;
  const a = b.dataset.a;
  if (a === 'open') { s.visits++; s.last = Date.now(); save(); return; }
  if (a === 'edit') return siteForm(s);
  if (a === 'del') {
    if (await ask(`Delete “${s.name}” from your hub? This cannot be undone.`, 'Delete website', 'Delete website?')) { S.sites = S.sites.filter(x => x !== s); save(); render(); toast('Website deleted'); }
    return;
  }
  if (a === 'fav') { s.fav = !s.fav; toast(s.fav ? 'Added to favorites' : 'Removed from favorites'); }
  if (a === 'pin') { s.pin = !s.pin; toast(s.pin ? 'Pinned to top' : 'Unpinned'); }
  save(); render();
});

/* Drag a card onto a section to move it */
let dragId = null;
$('#content').addEventListener('dragstart', e => { const c = e.target.closest('.card'); if (!c) return; dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.setData('text/plain', dragId); });
$('#content').addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.drag,.over').forEach(n => n.classList.remove('drag', 'over')); });
$('#secs').addEventListener('dragover', e => { const r = e.target.closest('.srow'); if (r && dragId) { e.preventDefault(); r.classList.add('over'); } });
$('#secs').addEventListener('dragleave', e => e.target.closest('.srow')?.classList.remove('over'));
$('#secs').addEventListener('drop', e => {
  const r = e.target.closest('.srow'); if (!r || !dragId) return; e.preventDefault();
  const s = S.sites.find(x => x.id === dragId); if (!s) return;
  s.sec = r.dataset.sec; save(); render(); toast(`Moved to ${secOf(s.sec).name}`);
});

/* ---------- Settings actions, import / export ---------- */
async function settingsAction(a) {
  if (a === 'add') return siteForm();
  if (a === 'light' || a === 'dark') { S.theme = a; save(); return render(); }
  if (a === 'export') {
    const blob = new Blob([JSON.stringify({sections: S.sections, sites: S.sites}, null, 2)], {type: 'application/json'});
    const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'smart-link-hub.json'; l.click(); URL.revokeObjectURL(l.href);
    return toast('Exported smart-link-hub.json');
  }
  if (a === 'import') return $('#file').click();
  if (a === 'sample' && await ask('This replaces all your websites and sections with the sample set.', 'Restore samples', 'Restore sample data?')) { const t = S.theme; S = seed(); S.theme = t; ui.view = 'all'; save(); render(); toast('Sample data restored'); }
  if (a === 'clear' && await ask('Every saved website will be removed. Your sections stay.', 'Delete all', 'Delete all websites?')) { S.sites = []; save(); render(); toast('All websites deleted'); }
}
$('#file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const sites = Array.isArray(d) ? d : d.sites;
    if (!Array.isArray(sites)) throw 0;
    (d.sections || []).forEach(x => { if (x && x.id && x.name && !S.sections.some(y => y.id === x.id)) S.sections.push({id: String(x.id), name: String(x.name), icon: String(x.icon || '📁')}); });
    let n = 0;
    sites.forEach(x => {
      const url = x && normUrl(String(x.url || '')); if (!url || !x.name || S.sites.some(y => y.url === url)) return;
      S.sites.push({id: uid() + n, name: String(x.name), url, desc: String(x.desc || ''), sec: S.sections.some(y => y.id === x.sec) ? x.sec : 'other', fav: !!x.fav, pin: !!x.pin, added: Number(x.added) || Date.now(), visits: Number(x.visits) || 0, last: Number(x.last) || 0}); n++;
    });
    save(); render(); toast(`Imported ${n} website${n === 1 ? '' : 's'}`);
  } catch { toast('Import failed. Choose a valid Smart Link Hub JSON file.'); }
});

$('#yr').textContent = new Date().getFullYear();
if (!localStorage.getItem(KEY)) save();
render();
})();
