'use strict';
const slides = [...document.querySelectorAll('.slide')];
const $ = (selector) => document.querySelector(selector);
const FULL_ROUTE = slides.map((_, i) => i);
const SHORT_ROUTE = [0, 1, 3, 5, 6, 8, 9, 11];
const DEFAULT_GAME = 'https://lethe-nine.vercel.app/?demo=play';
const prompts = {
  sentence: 'can you still hear the person who said it?',
  song: 'where were you when that song became yours?',
  place: 'what is the first detail that comes back?',
  photo: 'what happened just outside the photograph?',
};
const closingPrompts = {
  sentence: 'return to the voice you imagined. what would grow around those words?',
  song: 'return to the song you imagined. who or where would it connect to?',
  place: 'return to the place you imagined. what would keep it close?',
  photo: 'return to the photograph you imagined. what other moments belong beside it?',
};
const notesData = [
  { title:'A life becomes a garden', fullTime:'0:00–0:15', shortTime:'0:00–0:15', asset:'garden.png',
    full:'Before I show you the garden, I want to give you a place in it. Lethe is my response to “Your Life as a World.” It turns the fragments of a life into flowers and relationships.',
    short:'For “Your Life as a World,” I built Lethe: a garden where memories become flowers.',
    cue:'Stand still for the opening. Look at the audience. Let the picture settle before speaking.' },
  { title:'A memory of your own', fullTime:'0:15–0:40', shortTime:'0:15–0:30',
    full:'Take a moment to think of a memory. You can keep it private. Perhaps it is something someone said, or a place you can still walk through in your mind. What kind of fragment is it? Keep that moment with you while we explore.',
    short:'Think of one memory. Keep it to yourself. Is it a sentence, a song, a place, or a photograph?',
    cue:'Leave five seconds for thought. Choose a kind if someone volunteers one. Never ask for a personal story.' },
  { title:'A fragment takes root', fullTime:'0:40–1:05', asset:'planting.png, bloom.png, first-thread.png',
    full:'A memory begins as a seed. Its words become a flower, with a shape that belongs to that memory. When it opens, it can find other moments that share a person or a place. Growing the world begins with one fragment.',
    cue:'Click “show the planting” twice, leaving time to see each real capture. This is a visual preview. Show the actual bloom in the live garden or recording.' },
  { title:'Grandma Mei’s words', fullTime:'1:05–1:40', shortTime:'0:30–0:50', asset:'memory.png',
    full:'Here is one fragment from the fictional example life. Grandma Mei said, “You don’t have to be brave all the time.” A kitchen, a song, and these words might live in separate places on a phone. In this garden, you can see what they share. You can see Grandma Mei across them.',
    short:'In this fictional life, Grandma Mei said, “You don’t have to be brave all the time.” Her kitchen and music share the same person, so threads join them.',
    cue:'Read the quote warmly. Pause. Move your gaze from the flower to the audience rather than reading every label.' },
  { title:'What the fragments share', fullTime:'1:40–2:05', asset:'reveal.png',
    full:'These threads make relationships visible. Shared people and places help memories hold each other up. Tending one sends some of that care to its neighbors. A new memory can strengthen a connection that was already part of the life.',
    cue:'Click “show the connection.” Point to the real thread. Speak about shared names, not physical closeness.' },
  { title:'One light and your choice', fullTime:'2:05–2:35', shortTime:'0:50–1:10',
    full:'There is one light left in this episode. Would you tend Grandma Mei’s words, letting care reach her connected memories? Or would you tend the library rooftop, a place that matters on its own? Raise a hand for the one you would choose. I will carry your choice into the garden.',
    short:'One light remains. Grandma Mei’s words, or the library rooftop? Raise a hand. Let’s take your choice into the garden.',
    cue:'Ask once, then stop talking. Select the room’s choice. Accept either answer without praising one as correct. No tally or personal data is recorded.' },
  { title:'The living garden', fullTime:'2:35–4:05', shortTime:'1:10–2:10', asset:'first-thread.png',
    full:'Let’s see what that choice does. I will tend the memory you chose, plant a related fragment, and let a season pass. Watch the light reach its neighbors. Then watch the garden change.',
    short:'Watch where the care travels. I’ll plant a fragment, then let a season pass.',
    cue:'Open the verified game. In the short route allow 60 seconds for real actions and silence. In the showcase allow 90 seconds. If using the rehearsed film, explain that it follows its own fixed choice. Never pretend the film responds to the room.' },
  { title:'A season passes', fullTime:'4:05–4:30', asset:'garden.png, dusk.png',
    full:'The garden changes. Some flowers keep their color. Some become outlines. Care and connection affect what remains, and the spaces that grow quiet become part of the world too.',
    cue:'Use the real outcome you just saw. The dusk button compares reference captures; it does not simulate the audience’s decision.' },
  { title:'The quiet space', fullTime:'4:30–4:45', shortTime:'2:10–2:25', asset:'loss.png',
    full:'A lost flower leaves a seed. Its original words remain, and we can return to it. For now, I leave the space quiet.',
    short:'A seed remains. Its words are still there. We can return later. For now, leave this space quiet.',
    cue:'Hold four seconds of silence. If the room kept the rooftop alive, discuss another actual lost seed or loss in general. Do not claim their rooftop disappeared.' },
  { title:'What holds this life', fullTime:'4:45–5:10', shortTime:'2:25–2:45', asset:'reveal.png',
    full:'When the camera rises, the world becomes a portrait. You can see the people and places that hold the memories together. Another person might care for different moments. Their attention would give this same life another shape.',
    short:'The garden reveals the people and places holding this life together. A different choice can leave a different shape.',
    cue:'Reveal the names only after the picture settles. Keep your voice quieter than at the opening.' },
  { title:'A world you can make your own', fullTime:'5:10–5:35',
    full:'The example life is fictional. You can plant your own memories too. Flowers keep a stable identity, and shared names form relationships. Your personal garden lives in this browser. Planting works with local tagging, with an optional provider for better suggestions.',
    cue:'Keep this brief. Answer implementation questions afterward. Do not claim provider-enabled tagging keeps every word on the device.' },
  { title:'What will you carry', fullTime:'5:35–6:00', shortTime:'2:45–3:00', asset:'dusk.png',
    full:'Return to the memory you imagined at the beginning. What would you grow around it? You cannot keep every moment in bloom. What you tend gives the garden its shape. Try Lethe. If it stays with you, I would appreciate your vote.',
    short:'You cannot keep every moment in bloom. What you tend gives the garden its shape. Try Lethe. I would appreciate your vote.',
    cue:'End on the audience’s own imagined memory. Say the voting invitation once. Hold the final view.' },
];

const state = { memory:null, choice:null, plantingStep:0 };
let mode = new URLSearchParams(location.search).get('route') === 'short' ? 'short' : 'full';
let route = mode === 'short' ? SHORT_ROUTE : FULL_ROUTE;
let index = 0;
let gameURL = DEFAULT_GAME;
let voteURL = '';
let speakerWindow = null;
let movieURL = null;
const beganAt = performance.now();
try {
  const links = JSON.parse(localStorage.getItem('lethe.presentation.links') || '{}');
  gameURL = validURL(links.game) || DEFAULT_GAME;
  voteURL = validURL(links.vote) || '';
} catch { /* links work even when browser storage is unavailable */ }

function validURL(value) {
  if (!value || typeof value !== 'string') return '';
  try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function fit() { $('#stage').style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`; }
function currentSpeech() { return notesData[index][mode === 'short' ? 'short' : 'full'] || notesData[index].full; }
function renderNotes(target) {
  target.replaceChildren();
  const doc = target.ownerDocument, data = notesData[index];
  const heading = doc.createElement('h3'); heading.textContent = `${data.title} · ${mode === 'short' ? data.shortTime || data.fullTime : data.fullTime}`; target.append(heading);
  const speech = doc.createElement('p'); speech.textContent = currentSpeech(); target.append(speech);
  const cue = doc.createElement('p'); cue.className = 'cue'; cue.textContent = data.cue; target.append(cue);
  if (state.choice) { const choice = doc.createElement('p'); choice.className='cue'; choice.textContent=`Room choice: ${state.choice === 'mei' ? 'Grandma Mei’s words' : 'the library rooftop'}. Carry it into the actual game.`; target.append(choice); }
  if (data.asset) { const source = doc.createElement('p'); source.className='source'; source.textContent=`Visual: real Lethe reference captures, assets/${data.asset}.`; target.append(source); }
}
function show(next, updateHash = true) {
  const candidate = Math.max(0, Math.min(slides.length - 1, Number.isFinite(next) ? next : 0));
  index = route.includes(candidate) ? candidate : route.find(i => i >= candidate) ?? route.at(-1);
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
    slide.classList.toggle('route-skipped', !route.includes(i));
    slide.setAttribute('aria-hidden', String(i !== index)); slide.inert = i !== index;
  });
  $('#position').textContent = `${route.indexOf(index)+1} / ${route.length}`;
  $('#short-route').setAttribute('aria-pressed', String(mode === 'short'));
  $('#full-route').setAttribute('aria-pressed', String(mode === 'full'));
  renderNotes($('#notes')); refreshSpeaker();
  if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}#${index+1}`);
}
function next() { show(route[Math.min(route.length-1, route.indexOf(index)+1)]); }
function previous() { show(route[Math.max(0, route.indexOf(index)-1)]); }
function setRoute(value) { mode = value; route = mode === 'short' ? SHORT_ROUTE : FULL_ROUTE; show(index); }
function setMemory(kind) {
  state.memory = kind;
  document.querySelectorAll('[data-memory]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.memory === kind)));
  $('#private-prompt').textContent = prompts[kind];
  $('#personal-return').textContent = closingPrompts[kind];
  refreshSpeaker();
}
function setChoice(choice) {
  state.choice = choice;
  document.querySelectorAll('[data-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.choice === choice)));
  const phrase = choice === 'mei' ? 'grandma mei’s words' : 'the library rooftop';
  $('#choice-response').textContent = `the room chose ${phrase}. let’s see what that care changes.`;
  $('#live-choice').textContent = `our choice: ${phrase}. carry it into the garden, then let a season pass.`;
  $('#game-cue').textContent = `our choice: ${phrase} · tend it in the live garden`;
  $('#season-line').textContent = choice === 'rooftop' ? 'a place can stay with us. other moments settle into dusk.' : 'care reaches what is connected. some moments settle into dusk.';
  renderNotes($('#notes')); refreshSpeaker();
}
function toggleReveal(button, target) {
  const showContent = target.hidden;
  target.hidden = !showContent;
  button.setAttribute('aria-expanded', String(showContent));
}
function applyLinkElements() {
  $('#demo-url').value = gameURL; $('#vote-url').value = voteURL;
  $('#game-new-tab').href = gameURL;
  $('#site-link').href = gameURL;
  const url = new URL(gameURL); $('#site-link').textContent = `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
  $('#vote-link').hidden = !voteURL;
  if (voteURL) $('#vote-link').href = voteURL;
}
function openLinks() { $('#links-dialog').hidden=false; $('#notes').hidden=true; $('#notes-toggle').setAttribute('aria-expanded','false'); $('#demo-url').focus(); }
function closeLinks() { $('#links-dialog').hidden=true; $('#links-toggle').focus(); }
function applyLinks() {
  const game = validURL($('#demo-url').value.trim());
  const rawVote = $('#vote-url').value.trim();
  const vote = validURL(rawVote);
  if (!game || (rawVote && !vote)) { $('#link-status').textContent='use a complete http or https address for each link.'; return; }
  gameURL = game; voteURL = vote; applyLinkElements();
  try {localStorage.setItem('lethe.presentation.links', JSON.stringify({game:gameURL,vote:voteURL}));} catch { /* visit only */ }
  $('#link-status').textContent=''; closeLinks();
}
function openGame() {
  closeFilm(); $('#notes').hidden=true; $('#notes-toggle').setAttribute('aria-expanded','false');
  $('#game-overlay').hidden=false;
  $('#game-frame').src=gameURL;
  $('#game-close').focus();
}
function closeGame() {
  $('#game-overlay').hidden=true;
  // Unload the embedded page so its audio and GPU work do not continue behind the talk.
  $('#game-frame').src='about:blank';
}
function loadFilm() { $('#film-file').click(); }
function closeFilm() { $('#film').pause(); $('#film-overlay').hidden=true; }
function openFilm(file) {
  if (!file || !file.type.startsWith('video/')) return;
  closeGame(); closeFilm();
  if (movieURL) URL.revokeObjectURL(movieURL);
  movieURL=URL.createObjectURL(file); $('#film').src=movieURL; $('#film-overlay').hidden=false;
  $('#film').play().catch(()=>{}); $('#film-close').focus();
}
async function fullscreen() {
  try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { $('#fullscreen').textContent='use F11'; }
}
function toggleNotes() { const visible=$('#notes').hidden; $('#notes').hidden=!visible; $('#notes-toggle').setAttribute('aria-expanded',String(visible)); }
function resetChoices() {
  state.memory=null; state.choice=null; state.plantingStep=0;
  document.querySelectorAll('[data-memory],[data-choice]').forEach(button=>button.setAttribute('aria-pressed','false'));
  $('#private-prompt').textContent='someone’s voice. a familiar room. one ordinary moment.';
  $('#personal-return').textContent='what would your garden carry?';
  $('#choice-response').textContent='both choices belong to the same life.';
  $('#live-choice').textContent='choose what to tend. plant a fragment. let a season pass.';
  $('#game-cue').textContent='carry the audience’s choice into the garden';
  $('#season-line').textContent='some moments keep their color. others settle into dusk.';
    $('#season-slide').classList.remove('settled'); $('#season-reveal').setAttribute('aria-pressed','false'); $('#season-reveal').textContent='let dusk settle';
  $('#connections-explanation').hidden=true; $('#connections-reveal').setAttribute('aria-expanded','false');
  $('#portrait-labels').hidden=true; $('#portrait-reveal').setAttribute('aria-expanded','false');
  $('#planting-image').src='assets/planting.png'; $('#planting-image').alt='A waiting seed with possible connections before planting';
  $('#planting-caption').textContent='a waiting seed, with the threads it could join'; $('#planting-reveal').textContent='show the planting';
  show(index);
}
function refreshSpeaker() {
  if (!speakerWindow || speakerWindow.closed) return;
  try {
    renderNotes(speakerWindow.document.querySelector('#speaker-notes'));
    const nextIndex=route[Math.min(route.length-1,route.indexOf(index)+1)];
    speakerWindow.document.querySelector('#up-next').textContent=`Next: ${notesData[nextIndex].title}`;
    speakerWindow.document.querySelector('#route-label').textContent=mode === 'short' ? 'Three-minute contest route' : 'Six-minute interactive showcase';
  } catch {speakerWindow=null;}
}
function openSpeaker() {
  speakerWindow=window.open('','lethe-speaker','width=760,height=880');
  if (!speakerWindow) { toggleNotes(); return; }
  const doc=speakerWindow.document;
  doc.open();
  doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lethe speaker view</title><style>body{background:#0b0e14;color:#f2ede3;font:21px/1.6 "Segoe UI",sans-serif;margin:38px}h1{font:36px Georgia,serif}h3{font-size:25px}button{font:18px "Segoe UI";background:none;border:1px solid #657085;padding:10px 18px;color:#f1ce94;margin:0 10px 10px 0;cursor:pointer}p{margin:14px 0}.cue{color:#f1ce94}.source,#up-next,#route-label{color:#aab3c3;font-size:15px}#elapsed{font-size:16px;color:#aab3c3}</style></head><body><h1>lethe</h1><p id="route-label"></p><p id="elapsed"></p><div><button id="back">previous</button><button id="forward">next</button><button id="garden">open garden</button></div><div id="speaker-notes"></div><p id="up-next"></p></body></html>');
  doc.close();
  doc.querySelector('#back').addEventListener('click',previous);
  doc.querySelector('#forward').addEventListener('click',next);
  doc.querySelector('#garden').addEventListener('click',openGame);
  refreshSpeaker(); speakerWindow.focus();
}
setInterval(()=>{
  if(!speakerWindow || speakerWindow.closed)return;
  const seconds=Math.floor((performance.now()-beganAt)/1000);
  try {speakerWindow.document.querySelector('#elapsed').textContent=`Elapsed ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · timing guide, not an automatic advance`;}catch{speakerWindow=null;}
},1000);

document.querySelectorAll('[data-memory]').forEach(button=>button.addEventListener('click',()=>setMemory(button.dataset.memory)));
document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>setChoice(button.dataset.choice)));
document.querySelectorAll('[data-open-game]').forEach(button=>button.addEventListener('click',openGame));
document.querySelectorAll('[data-load-film]').forEach(button=>button.addEventListener('click',loadFilm));
$('#planting-reveal').addEventListener('click',()=>{
  state.plantingStep=(state.plantingStep+1)%3;
  const captures=[['planting.png','a waiting seed, with the threads it could join'],['bloom.png','the flower opens from its seed'],['first-thread.png','its first thread finds a neighboring memory']];
  const capture=captures[state.plantingStep]; $('#planting-image').src=`assets/${capture[0]}`; $('#planting-image').alt=capture[1]; $('#planting-caption').textContent=capture[1];
  $('#planting-reveal').textContent=state.plantingStep===2?'return to the seed':'show the next moment';
});
$('#connections-reveal').addEventListener('click',()=>toggleReveal($('#connections-reveal'),$('#connections-explanation')));
$('#portrait-reveal').addEventListener('click',()=>toggleReveal($('#portrait-reveal'),$('#portrait-labels')));
$('#season-reveal').addEventListener('click',()=>{const settled=$('#season-slide').classList.toggle('settled');$('#season-reveal').setAttribute('aria-pressed',String(settled));$('#season-reveal').textContent=settled?'return to the opening view':'let dusk settle';});
$('#previous').addEventListener('click',previous);$('#next').addEventListener('click',next);
$('#short-route').addEventListener('click',()=>setRoute('short'));$('#full-route').addEventListener('click',()=>setRoute('full'));
$('#fullscreen').addEventListener('click',fullscreen);$('#speaker').addEventListener('click',openSpeaker);$('#notes-toggle').addEventListener('click',toggleNotes);
$('#links-toggle').addEventListener('click',openLinks);$('#apply-links').addEventListener('click',applyLinks);$('#links-close').addEventListener('click',closeLinks);$('#reset-choices').addEventListener('click',resetChoices);
$('#game-close').addEventListener('click',closeGame);$('#film-close').addEventListener('click',closeFilm);
$('#film-file').addEventListener('change',event=>{openFilm(event.target.files[0]);event.target.value='';});
$('#links-dialog').addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=[...$('#links-dialog').querySelectorAll('input,button')],first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
document.addEventListener('fullscreenchange',()=>document.body.classList.toggle('hide-controls',!!document.fullscreenElement));
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='escape'){
    if(!$('#links-dialog').hidden)closeLinks();
    else if(!$('#game-overlay').hidden)closeGame();
    else if(!$('#film-overlay').hidden)closeFilm();
    else if(!$('#notes').hidden)toggleNotes();
    return;
  }
  if(!$('#links-dialog').hidden||!$('#game-overlay').hidden||!$('#film-overlay').hidden)return;
  if(event.target.closest('input,textarea,select,video'))return;
  if(key===' '&&event.target.closest('button,a'))return;
  if(['arrowright','arrowdown',' ','pagedown'].includes(key)){event.preventDefault();next();}
  else if(['arrowleft','arrowup','pageup'].includes(key)){event.preventDefault();previous();}
  else if(key==='home'){event.preventDefault();show(route[0]);}
  else if(key==='end'){event.preventDefault();show(route.at(-1));}
  else if(key==='f')fullscreen();else if(key==='n')toggleNotes();else if(key==='p')openSpeaker();else if(key==='g')openGame();else if(key==='v')loadFilm();else if(key==='h')document.body.classList.toggle('hide-controls');
});
addEventListener('resize',fit);addEventListener('hashchange',()=>show(Number(location.hash.slice(1))-1,false));
addEventListener('beforeunload',()=>{if(movieURL)URL.revokeObjectURL(movieURL);if(speakerWindow&&!speakerWindow.closed)speakerWindow.close();});
applyLinkElements();fit();show(Number(location.hash.slice(1))-1 || 0);
if(new URLSearchParams(location.search).get('quiet')==='1')document.body.classList.add('hide-controls');
