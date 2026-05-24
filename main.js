/* ============================================
   XpressNotes - Main JS
   Features: Notes CRUD, Auth, Highlights, Images
   ============================================ */

// ── Supabase (optional – only if configured) ──────────────────────────────
// Named sbClient to avoid collision with the global `supabase` declared by the CDN script
let sbClient = null;
try {
  const SUPA_URL = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
  const SUPA_KEY = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
  if (SUPA_URL && SUPA_KEY) {
    sbClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  }
} catch (_) {}

// ── DOM refs ──────────────────────────────────────────────────────────────
const sidebar          = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarCloseBtn  = document.getElementById('sidebarCloseBtn');
const newNoteBtn       = document.getElementById('newNoteBtn');
const savedNotesList   = document.getElementById('savedNotesList');
const noNotesMessage   = document.getElementById('noNotesMessage');
const noteCount        = document.getElementById('noteCount');
const deleteAllBtn     = document.getElementById('deleteAllBtn');
const noteTitle        = document.getElementById('noteTitle');
const notepad          = document.getElementById('notepad');
const charCountEl      = document.getElementById('charCount');
const wordCountEl      = document.getElementById('wordCount');
const saveBtn          = document.getElementById('saveBtn');
const clearBtn         = document.getElementById('clearBtn');
const themeBtn         = document.getElementById('themeBtn');
const breadcrumbCurrent= document.getElementById('breadcrumbCurrent');
const toast            = document.getElementById('toast');
const toastMessage     = document.getElementById('toastMessage');

// Auth
const signInOpenBtn  = document.getElementById('signInOpenBtn');
const signUpOpenBtn  = document.getElementById('signUpOpenBtn');
const signInModal    = document.getElementById('signInModal');
const signUpModal    = document.getElementById('signUpModal');
const closeSignIn    = document.getElementById('closeSignIn');
const closeSignUp    = document.getElementById('closeSignUp');
const signInEmail    = document.getElementById('signInEmail');
const signInPassword = document.getElementById('signInPassword');
const signInSubmit   = document.getElementById('signInSubmit');
const signUpEmail    = document.getElementById('signUpEmail');
const signUpPassword = document.getElementById('signUpPassword');
const signUpSubmit   = document.getElementById('signUpSubmit');
const userProfile    = document.getElementById('userProfile');
const userEmailEl    = document.getElementById('userEmail');
const signOutBtn     = document.getElementById('signOutBtn');
const authSection    = document.getElementById('authSection');

// ── State ─────────────────────────────────────────────────────────────────
let notes       = JSON.parse(localStorage.getItem('xpressnotes') || '[]');
let activeNoteId = null;
let isDark       = localStorage.getItem('theme') === 'dark';

// ── Theme ─────────────────────────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('dark-mode', isDark);
  themeBtn.innerHTML = isDark
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}
themeBtn.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  applyTheme();
});
applyTheme();

// ── Sidebar toggle ────────────────────────────────────────────────────────
let overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

sidebarToggleBtn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
sidebarCloseBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ── Helpers ───────────────────────────────────────────────────────────────
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function showToast(msg, isError = false) {
  toastMessage.textContent = msg;
  toast.style.background = isError ? 'var(--danger)' : '';
  toast.querySelector('i').style.color = isError ? '#fff' : '';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Count helpers (works on contenteditable) ──────────────────────────────
function getPlainText() {
  return notepad.innerText || '';
}

function updateCounts() {
  const text = getPlainText();
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  charCountEl.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
  wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

notepad.addEventListener('input', updateCounts);

// ── Render notes list ─────────────────────────────────────────────────────
function renderNotesList() {
  savedNotesList.innerHTML = '';
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  if (sorted.length === 0) {
    noNotesMessage.style.display = 'flex';
    deleteAllBtn.classList.remove('visible');
    noteCount.textContent = '0';
    return;
  }

  noNotesMessage.style.display = 'none';
  deleteAllBtn.classList.add('visible');
  noteCount.textContent = sorted.length;

  sorted.forEach(note => {
    const li = document.createElement('li');
    li.className = 'note-item' + (note.id === activeNoteId ? ' active' : '');
    li.dataset.id = note.id;

    // Strip HTML tags for preview
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content || '';
    const preview = (tmp.innerText || '').trim().slice(0, 60) || 'No content';

    li.innerHTML = `
      <div class="note-item-content">
        <div class="note-item-title">${note.title || 'Untitled Note'}</div>
        <div class="note-item-preview">${preview}</div>
        <div class="note-item-date">${formatDate(note.updatedAt)}</div>
      </div>
      <button class="note-item-delete" title="Delete note" data-id="${note.id}">
        <i class="fa-solid fa-trash"></i>
      </button>`;

    li.addEventListener('click', e => {
      if (e.target.closest('.note-item-delete')) return;
      loadNote(note.id);
      if (window.innerWidth <= 768) closeSidebar();
    });

    li.querySelector('.note-item-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteNote(note.id);
    });

    savedNotesList.appendChild(li);
  });
}

// ── Load / Save / Delete ──────────────────────────────────────────────────
function loadNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  activeNoteId = id;
  noteTitle.value = note.title || '';
  notepad.innerHTML = note.content || '';
  breadcrumbCurrent.textContent = note.title || 'Untitled Note';
  updateCounts();
  renderNotesList();
}

function saveCurrentNote() {
  const title   = noteTitle.value.trim() || 'Untitled Note';
  const content = notepad.innerHTML; // rich HTML with highlights & images

  if (activeNoteId) {
    const idx = notes.findIndex(n => n.id === activeNoteId);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], title, content, updatedAt: Date.now() };
    }
  } else {
    const newNote = { id: generateId(), title, content, createdAt: Date.now(), updatedAt: Date.now() };
    notes.push(newNote);
    activeNoteId = newNote.id;
  }

  localStorage.setItem('xpressnotes', JSON.stringify(notes));
  breadcrumbCurrent.textContent = title;
  renderNotesList();
  showToast('Note saved!');
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem('xpressnotes', JSON.stringify(notes));

  if (activeNoteId === id) {
    activeNoteId = null;
    noteTitle.value = '';
    notepad.innerHTML = '';
    breadcrumbCurrent.textContent = 'New Note';
    updateCounts();
  }
  renderNotesList();
  showToast('Note deleted');
}

function newNote() {
  activeNoteId = null;
  noteTitle.value = '';
  notepad.innerHTML = '';
  breadcrumbCurrent.textContent = 'New Note';
  updateCounts();
  renderNotesList();
  noteTitle.focus();
  if (window.innerWidth <= 768) closeSidebar();
}

saveBtn.addEventListener('click', saveCurrentNote);
newNoteBtn.addEventListener('click', newNote);

clearBtn.addEventListener('click', () => {
  if (notepad.innerHTML.trim() === '' && noteTitle.value.trim() === '') return;
  notepad.innerHTML = '';
  noteTitle.value = '';
  updateCounts();
  showToast('Cleared');
});

deleteAllBtn.addEventListener('click', () => {
  if (!confirm('Delete all notes? This cannot be undone.')) return;
  notes = [];
  localStorage.setItem('xpressnotes', JSON.stringify(notes));
  activeNoteId = null;
  noteTitle.value = '';
  notepad.innerHTML = '';
  breadcrumbCurrent.textContent = 'New Note';
  updateCounts();
  renderNotesList();
  showToast('All notes deleted');
});

// Ctrl+S shortcut
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentNote();
  }
});

// ── ─────────────────────────────────────────────────────────────────────
//   HIGHLIGHT TOOLBAR
// ── ─────────────────────────────────────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { label: 'Yellow',  value: '#FFF176' },
  { label: 'Lime',    value: '#CCFF90' },
  { label: 'Cyan',    value: '#80DEEA' },
  { label: 'Pink',    value: '#F48FB1' },
  { label: 'Peach',   value: '#FFCC80' },
  { label: 'Lavender',value: '#CE93D8' },
  { label: 'None',    value: 'none'    },
];

// Build toolbar element
const hlToolbar = document.createElement('div');
hlToolbar.id = 'hl-toolbar';
hlToolbar.innerHTML = `
  <span class="hl-label"><i class="fa-solid fa-highlighter"></i></span>
  ${HIGHLIGHT_COLORS.map(c => `
    <button class="hl-swatch ${c.value === 'none' ? 'hl-swatch-none' : ''}"
      title="${c.label}"
      data-color="${c.value}"
      style="${c.value !== 'none' ? `background:${c.value}` : ''}">
      ${c.value === 'none' ? '<i class="fa-solid fa-xmark"></i>' : ''}
    </button>`).join('')}
`;
document.body.appendChild(hlToolbar);

let savedRange = null;

function getSelectionRange() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  // Must be inside notepad
  if (!notepad.contains(range.commonAncestorContainer)) return null;
  return range;
}

function positionToolbar(range) {
  const rect = range.getBoundingClientRect();
  const tbRect = hlToolbar.getBoundingClientRect();
  let top  = rect.top + window.scrollY - tbRect.height - 10;
  let left = rect.left + window.scrollX + rect.width / 2 - tbRect.width / 2;

  // Keep within viewport
  left = Math.max(8, Math.min(left, window.innerWidth - tbRect.width - 8));
  if (top < 8) top = rect.bottom + window.scrollY + 10;

  hlToolbar.style.top  = top + 'px';
  hlToolbar.style.left = left + 'px';
}

notepad.addEventListener('mouseup', () => {
  setTimeout(() => {
    const range = getSelectionRange();
    if (range) {
      savedRange = range.cloneRange();
      hlToolbar.classList.add('visible');
      positionToolbar(range);
    } else {
      hlToolbar.classList.remove('visible');
    }
  }, 10);
});

notepad.addEventListener('keyup', () => {
  const range = getSelectionRange();
  if (range) {
    savedRange = range.cloneRange();
    hlToolbar.classList.add('visible');
    positionToolbar(range);
  } else {
    hlToolbar.classList.remove('visible');
  }
});

document.addEventListener('mousedown', e => {
  if (!hlToolbar.contains(e.target) && e.target !== notepad) {
    hlToolbar.classList.remove('visible');
  }
});

hlToolbar.addEventListener('mousedown', e => e.preventDefault()); // keep selection alive

hlToolbar.querySelectorAll('.hl-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    const color = btn.dataset.color;
    applyHighlight(color);
    hlToolbar.classList.remove('visible');
  });
});

function applyHighlight(color) {
  if (!savedRange) return;

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);

  if (color === 'none') {
    // Remove highlights within selection
    document.execCommand('removeFormat', false, null);
  } else {
    document.execCommand('hiliteColor', false, color);
  }

  // Clear selection
  sel.removeAllRanges();
  savedRange = null;
  updateCounts();
}

// ── ─────────────────────────────────────────────────────────────────────
//   IMAGE ATTACHMENT
// ── ─────────────────────────────────────────────────────────────────────

// Hidden file input
const imgInput = document.createElement('input');
imgInput.type   = 'file';
imgInput.accept = 'image/*';
imgInput.style.display = 'none';
document.body.appendChild(imgInput);

// The attach button is injected into the topbar
function buildAttachBtn() {
  const btn = document.createElement('button');
  btn.className = 'topbar-btn';
  btn.id        = 'attachImgBtn';
  btn.title     = 'Attach Image / Screenshot';
  btn.innerHTML = '<i class="fa-solid fa-image"></i><span>Image</span>';
  btn.addEventListener('click', () => imgInput.click());

  // Insert before Save button
  const topbarRight = document.querySelector('.topbar-right');
  topbarRight.insertBefore(btn, saveBtn);
}
buildAttachBtn();

function insertImageAtCursor(dataUrl) {
  notepad.focus();
  const sel = window.getSelection();
  let range;

  if (sel && sel.rangeCount > 0 && notepad.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0);
    range.deleteContents();
  } else {
    range = document.createRange();
    range.selectNodeContents(notepad);
    range.collapse(false);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'note-image-wrapper';

  const img = document.createElement('img');
  img.src = dataUrl;
  img.className = 'note-image';
  img.alt = 'Attached image';

  // Remove button
  const rmBtn = document.createElement('button');
  rmBtn.className = 'note-image-remove';
  rmBtn.title = 'Remove image';
  rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  rmBtn.addEventListener('click', () => wrapper.remove());

  wrapper.appendChild(img);
  wrapper.appendChild(rmBtn);

  range.insertNode(wrapper);

  // Move cursor after image
  const newRange = document.createRange();
  newRange.setStartAfter(wrapper);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  updateCounts();
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

imgInput.addEventListener('change', async () => {
  const file = imgInput.files[0];
  if (!file) return;
  try {
    const dataUrl = await fileToDataUrl(file);
    insertImageAtCursor(dataUrl);
    showToast('Image attached!');
  } catch {
    showToast('Failed to load image', true);
  }
  imgInput.value = '';
});

// Paste image from clipboard (screenshots!)
notepad.addEventListener('paste', async e => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      try {
        const file   = item.getAsFile();
        const dataUrl = await fileToDataUrl(file);
        insertImageAtCursor(dataUrl);
        showToast('Screenshot pasted!');
      } catch {
        showToast('Failed to paste image', true);
      }
      return;
    }
  }
  // Default paste behaviour for text
});

// ── ─────────────────────────────────────────────────────────────────────
//   AUTH (Supabase – gracefully no-ops if not configured)
// ── ─────────────────────────────────────────────────────────────────────
function showAuth(user) {
  if (user) {
    signInOpenBtn.style.display  = 'none';
    signUpOpenBtn.style.display  = 'none';
    userProfile.style.display    = 'flex';
    userEmailEl.textContent      = user.email;
    signOutBtn.style.display     = 'block';
  } else {
    signInOpenBtn.style.display  = 'block';
    signUpOpenBtn.style.display  = 'block';
    userProfile.style.display    = 'none';
    signOutBtn.style.display     = 'none';
  }
}

if (sbClient) {
  sbClient.auth.getSession().then(({ data }) => showAuth(data?.session?.user || null));
  sbClient.auth.onAuthStateChange((_, session) => showAuth(session?.user || null));
}

signInOpenBtn?.addEventListener('click', () => { signInModal.style.display = 'flex'; });
signUpOpenBtn?.addEventListener('click', () => { signUpModal.style.display = 'flex'; });
closeSignIn?.addEventListener('click',   () => { signInModal.style.display = 'none'; });
closeSignUp?.addEventListener('click',   () => { signUpModal.style.display = 'none'; });

window.addEventListener('click', e => {
  if (e.target === signInModal) signInModal.style.display = 'none';
  if (e.target === signUpModal) signUpModal.style.display = 'none';
});

signInSubmit?.addEventListener('click', async () => {
  if (!sbClient) return showToast('Supabase not configured', true);
  const { error } = await sbClient.auth.signInWithPassword({
    email: signInEmail.value, password: signInPassword.value
  });
  if (error) showToast(error.message, true);
  else { signInModal.style.display = 'none'; showToast('Signed in!'); }
});

signUpSubmit?.addEventListener('click', async () => {
  if (!sbClient) return showToast('Supabase not configured', true);
  const { error } = await sbClient.auth.signUp({
    email: signUpEmail.value, password: signUpPassword.value
  });
  if (error) showToast(error.message, true);
  else { signUpModal.style.display = 'none'; showToast('Account created! Check your email.'); }
});

signOutBtn?.addEventListener('click', async () => {
  if (!sbClient) return;
  await sbClient.auth.signOut();
  showToast('Signed out');
});

// ── Init ──────────────────────────────────────────────────────────────────
renderNotesList();
updateCounts();
