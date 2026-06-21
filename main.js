// ============================================
// XpressNotes - Modern Notepad App with Supabase
// + Text Highlighting & Image Attachment
// + Export/Save to PDF
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    // DOM Elements
    const notepad = document.getElementById('notepad');
    const noteTitle = document.getElementById('noteTitle');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const themeBtn = document.getElementById('themeBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const savedNotesList = document.getElementById('savedNotesList');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const noNotesMessage = document.getElementById('noNotesMessage');
    const noteCount = document.getElementById('noteCount');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const body = document.body;

    // Auth DOM Elements
    const signInOpenBtn = document.getElementById('signInOpenBtn');
    const signUpOpenBtn = document.getElementById('signUpOpenBtn');
    const userProfile = document.getElementById('userProfile');
    const userEmail = document.getElementById('userEmail');
    const signOutBtn = document.getElementById('signOutBtn');
    const signInModal = document.getElementById('signInModal');
    const signUpModal = document.getElementById('signUpModal');
    const closeSignIn = document.getElementById('closeSignIn');
    const closeSignUp = document.getElementById('closeSignUp');
    const signInEmail = document.getElementById('signInEmail');
    const signInPassword = document.getElementById('signInPassword');
    const signInSubmit = document.getElementById('signInSubmit');
    const signUpEmail = document.getElementById('signUpEmail');
    const signUpPassword = document.getElementById('signUpPassword');
    const signUpSubmit = document.getElementById('signUpSubmit');

    // Supabase Initialization
    const supabaseUrl = 'https://hchlauwjnjekoxfkwznp.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjaGxhdXdqbmpla294Zmt3em5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTA0NTUsImV4cCI6MjA4Nzc4NjQ1NX0.KEAXVXG8ML28Cix-A7SlGfvfeoVIekpJxhDhyRGrXwk';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // State
    let activeNoteId = null;
    let currentUser = null;

    // Create overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.querySelector('.app-wrapper').appendChild(overlay);

    // ============================================
    // Utility Functions
    // ============================================

    const getCurrentDate = () => {
        const date = new Date();
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getCurrentTime = () => {
        const date = new Date();
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    };

    // Works on both textarea and contenteditable
    const getPlainText = () => notepad.innerText || notepad.value || '';

    const updateCounts = () => {
        const text = getPlainText();
        const chars = text.length;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
        wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    };

    const updateBreadcrumb = (title) => {
        breadcrumbCurrent.textContent = title || 'New Note';
    };

    const getPreview = (content, maxLength = 60) => {
        if (!content) return 'Empty note';
        // Strip HTML tags for preview
        const tmp = document.createElement('div');
        tmp.innerHTML = content;
        const cleaned = (tmp.innerText || tmp.textContent || '').replace(/\n/g, ' ').trim();
        return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Safe filename from note title
    const slugifyFilename = (title) => {
        const base = (title || 'Untitled Note').trim() || 'Untitled Note';
        return base
            .replace(/[\\/:*?"<>|]/g, '')   // strip filesystem-illegal chars
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 80) || 'Untitled Note';
    };

    // ============================================
    // Auth Functions
    // ============================================

    const checkSession = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            currentUser = user;
        }
        return session;
    };

    const updateUIForAuth = async (isLoggedIn) => {
        if (isLoggedIn) {
            if (currentUser) userEmail.textContent = currentUser.email;
            signInOpenBtn.style.display = 'none';
            signUpOpenBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            signOutBtn.style.display = 'block';
            newNoteBtn.style.display = 'block';
            deleteAllBtn.style.display = 'block';
            savedNotesList.style.display = 'block';
            notepad.contentEditable = 'true';
            noteTitle.disabled = false;
        } else {
            signInOpenBtn.style.display = 'block';
            signUpOpenBtn.style.display = 'block';
            userProfile.style.display = 'none';
            signOutBtn.style.display = 'none';
            newNoteBtn.style.display = 'none';
            deleteAllBtn.style.display = 'none';
            savedNotesList.style.display = 'none';
            noNotesMessage.style.display = 'flex';
            notepad.contentEditable = 'false';
            noteTitle.disabled = true;
            notepad.innerHTML = '';
            noteTitle.value = '';
            activeNoteId = null;
            updateBreadcrumb('New Note');
            updateCounts();
            savedNotesList.innerHTML = '';
            noteCount.textContent = 0;
            showToast('Please sign in to use notes');
        }
    };

    // ============================================
    // Sidebar Toggle (Mobile)
    // ============================================

    const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.add('active'); };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); };

    sidebarToggleBtn.addEventListener('click', openSidebar);
    sidebarCloseBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // ============================================
    // Notes CRUD with Supabase
    // ============================================

    const getNotes = async () => {
        if (!currentUser) return [];
        const { data, error } = await supabaseClient
            .from('notes')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) { console.error(error); showToast('Error loading notes'); return []; }

        return data.map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            date: new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            time: new Date(note.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }));
    };

    const loadSavedNotes = async () => {
        const savedNotes = await getNotes();
        noteCount.textContent = savedNotes.length;

        if (savedNotes.length === 0) {
            savedNotesList.innerHTML = '';
            noNotesMessage.style.display = 'flex';
            deleteAllBtn.classList.remove('visible');
        } else {
            noNotesMessage.style.display = 'none';
            deleteAllBtn.classList.add('visible');
            savedNotesList.innerHTML = savedNotes.map(note => `
                <li class="note-item${note.id === activeNoteId ? ' active' : ''}" data-id="${note.id}">
                    <div class="note-item-content">
                        <div class="note-item-title">${escapeHtml(note.title)}</div>
                        <div class="note-item-preview">${escapeHtml(getPreview(note.content))}</div>
                        <div class="note-item-date">${note.date}${note.time ? ' · ' + note.time : ''}</div>
                    </div>
                    <button class="note-item-pdf" data-id="${note.id}" title="Export as PDF">
                        <i class="fa-solid fa-file-pdf" data-id="${note.id}"></i>
                    </button>
                    <button class="note-item-delete" data-id="${note.id}" title="Delete note">
                        <i class="fa-solid fa-trash-can" data-id="${note.id}"></i>
                    </button>
                </li>`).join('');
        }
    };

    const saveNote = async () => {
        // Get content as HTML (preserves highlights + images)
        const content = notepad.innerHTML.trim();
        const title = noteTitle.value.trim() || 'Untitled Note';

        if (!content && !title) { showToast('Please write something first'); return; }
        if (!currentUser) { showToast('Please login first'); return; }

        const noteData = { title, content, user_id: currentUser.id };
        let response;

        if (activeNoteId) {
            response = await supabaseClient.from('notes').update(noteData).eq('id', activeNoteId);
            if (!response.error) showToast('Note updated');
        } else {
            response = await supabaseClient.from('notes').insert(noteData).select('id');
            if (!response.error && response.data) {
                activeNoteId = response.data[0].id;
                showToast('Note saved');
            }
        }

        if (response.error) {
            showToast('Error: ' + response.error.message);
        } else {
            await loadSavedNotes();
            updateBreadcrumb(title);
        }
    };

    const deleteNote = async (id) => {
        const { error } = await supabaseClient.from('notes').delete().eq('id', id);
        if (error) { showToast('Error deleting'); return; }
        if (activeNoteId === id) {
            activeNoteId = null;
            notepad.innerHTML = '';
            noteTitle.value = '';
            updateBreadcrumb('New Note');
            updateCounts();
        }
        await loadSavedNotes();
        showToast('Note deleted');
    };

    const deleteAllNotes = async () => {
        if (!confirm('Are you sure you want to delete all notes? This cannot be undone.')) return;
        if (!currentUser) return;
        const { error } = await supabaseClient.from('notes').delete().eq('user_id', currentUser.id);
        if (error) {
            showToast('Error deleting all');
        } else {
            activeNoteId = null;
            notepad.innerHTML = '';
            noteTitle.value = '';
            updateBreadcrumb('New Note');
            updateCounts();
            await loadSavedNotes();
            showToast('All notes deleted');
        }
    };

    const loadNoteIntoEditor = async (id) => {
        const savedNotes = await getNotes();
        const note = savedNotes.find(n => n.id === id);
        if (note) {
            activeNoteId = id;
            noteTitle.value = note.title;
            // Load rich HTML content (highlights + images restore automatically)
            notepad.innerHTML = note.content || '';
            // Re-attach remove listeners on any images in loaded note
            notepad.querySelectorAll('.note-image-wrapper').forEach(attachImageRemoveListener);
            updateBreadcrumb(note.title);
            updateCounts();
            await loadSavedNotes();
            closeSidebar();
        }
    };

    const createNewNote = () => {
        activeNoteId = null;
        noteTitle.value = '';
        notepad.innerHTML = '';
        updateBreadcrumb('New Note');
        updateCounts();
        loadSavedNotes();
        noteTitle.focus();
        closeSidebar();
    };

    // ============================================
    // PDF EXPORT
    // ============================================

    // Builds a clean, light, print-friendly DOM node from a title + HTML content
    // string. Used for both the active editor note and saved sidebar notes.
    const buildPdfElement = (title, contentHtml) => {
        const wrapper = document.createElement('div');
        wrapper.style.background = '#FFFFFF';
        wrapper.style.color = '#1A1A1A';
        wrapper.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        wrapper.style.padding = '8px 4px';
        wrapper.style.width = '680px';

        const titleEl = document.createElement('div');
        titleEl.textContent = title || 'Untitled Note';
        titleEl.style.fontSize = '26px';
        titleEl.style.fontWeight = '700';
        titleEl.style.letterSpacing = '-0.3px';
        titleEl.style.marginBottom = '6px';
        titleEl.style.color = '#1A1A1A';

        const metaEl = document.createElement('div');
        metaEl.textContent = `${getCurrentDate()} · ${getCurrentTime()}`;
        metaEl.style.fontSize = '11px';
        metaEl.style.color = '#9CA3AF';
        metaEl.style.marginBottom = '16px';
        metaEl.style.paddingBottom = '14px';
        metaEl.style.borderBottom = '1px solid #E5E7EB';

        const contentEl = document.createElement('div');
        contentEl.innerHTML = contentHtml || '<p style="color:#9CA3AF;">This note is empty.</p>';
        contentEl.style.fontSize = '14px';
        contentEl.style.lineHeight = '1.75';
        contentEl.style.color = '#1A1A1A';
        contentEl.style.wordBreak = 'break-word';

        // Force every descendant to plain light-mode-safe colors EXCEPT
        // intentional highlight backgrounds and chosen text colors, which
        // were set inline by the toolbar (hiliteColor / foreColor) and
        // should be preserved as-is in the export.
        contentEl.querySelectorAll('*').forEach(el => {
            // Cap image width so it never overflows the PDF page
            if (el.tagName === 'IMG') {
                el.style.maxWidth = '100%';
                el.style.borderRadius = '8px';
            }
            // Remove the little red remove-image button from export
            if (el.classList && el.classList.contains('note-image-remove')) {
                el.remove();
            }
        });

        wrapper.appendChild(titleEl);
        wrapper.appendChild(metaEl);
        wrapper.appendChild(contentEl);
        return wrapper;
    };

    // Renders the given element off-screen, converts to PDF, then cleans up.
    const exportElementToPdf = (element, filename) => {
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '-99999px';
        element.style.zIndex = '-1';
        document.body.appendChild(element);

        const opts = {
            margin: [14, 14, 14, 14],
            filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        return html2pdf().set(opts).from(element).save()
            .then(() => { element.remove(); })
            .catch((err) => { element.remove(); throw err; });
    };

    // Export whatever is currently in the editor (new or loaded note)
    const exportCurrentNoteToPdf = async () => {
        const title = noteTitle.value.trim() || 'Untitled Note';
        const content = notepad.innerHTML.trim();

        if (!content && !noteTitle.value.trim()) {
            showToast('Nothing to export yet');
            return;
        }

        showToast('Generating PDF...');
        try {
            const el = buildPdfElement(title, content);
            await exportElementToPdf(el, slugifyFilename(title));
            showToast('PDF downloaded!');
        } catch (err) {
            console.error(err);
            showToast('Failed to generate PDF');
        }
    };

    // Export a specific saved note (from the sidebar) without loading it into the editor
    const exportSavedNoteToPdf = async (id) => {
        const savedNotes = await getNotes();
        const note = savedNotes.find(n => n.id === id);
        if (!note) { showToast('Note not found'); return; }

        showToast('Generating PDF...');
        try {
            const el = buildPdfElement(note.title, note.content);
            await exportElementToPdf(el, slugifyFilename(note.title));
            showToast('PDF downloaded!');
        } catch (err) {
            console.error(err);
            showToast('Failed to generate PDF');
        }
    };

    // ============================================
    // Event Listeners - Core
    // ============================================

    saveBtn.addEventListener('click', saveNote);

    clearBtn.addEventListener('click', () => {
        notepad.innerHTML = '';
        noteTitle.value = '';
        activeNoteId = null;
        updateBreadcrumb('New Note');
        updateCounts();
        loadSavedNotes();
    });

    newNoteBtn.addEventListener('click', createNewNote);
    deleteAllBtn.addEventListener('click', deleteAllNotes);

    savedNotesList.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.note-item-delete');
        if (deleteBtn) { await deleteNote(deleteBtn.getAttribute('data-id')); return; }
        const pdfBtn = e.target.closest('.note-item-pdf');
        if (pdfBtn) { await exportSavedNoteToPdf(pdfBtn.getAttribute('data-id')); return; }
        const noteItem = e.target.closest('.note-item');
        if (noteItem) await loadNoteIntoEditor(noteItem.getAttribute('data-id'));
    });

    notepad.addEventListener('input', updateCounts);
    noteTitle.addEventListener('input', () => updateBreadcrumb(noteTitle.value || 'New Note'));

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); }
    });

    // Modal Open/Close
    signInOpenBtn.addEventListener('click', () => signInModal.style.display = 'block');
    signUpOpenBtn.addEventListener('click', () => signUpModal.style.display = 'block');
    closeSignIn.addEventListener('click', () => signInModal.style.display = 'none');
    closeSignUp.addEventListener('click', () => signUpModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === signInModal) signInModal.style.display = 'none';
        if (e.target === signUpModal) signUpModal.style.display = 'none';
    });

    signInSubmit.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: signInEmail.value, password: signInPassword.value,
        });
        if (error) { showToast(error.message); return; }
        showToast('Logged in');
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUser = user;
        await updateUIForAuth(true);
        await loadSavedNotes();
        signInModal.style.display = 'none';
        signInEmail.value = '';
        signInPassword.value = '';
    });

    signUpSubmit.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signUp({
            email: signUpEmail.value, password: signUpPassword.value,
        });
        if (error) { showToast(error.message); return; }
        showToast('Check your email for confirmation');
        signUpModal.style.display = 'none';
        signUpEmail.value = '';
        signUpPassword.value = '';
    });

    signOutBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) { showToast(error.message); return; }
        currentUser = null;
        showToast('Logged out');
        await updateUIForAuth(false);
    });

    // ============================================
    // Theme Toggle
    // ============================================

    themeBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        themeBtn.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.classList.remove('dark-mode');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    };

    // ============================================
    // FORMATTING TOOLBAR (Highlight + Text Color)
    // ============================================

    const HIGHLIGHT_COLORS = [
        { label: 'Yellow',   value: '#FFF176' },
        { label: 'Lime',     value: '#CCFF90' },
        { label: 'Cyan',     value: '#80DEEA' },
        { label: 'Pink',     value: '#F48FB1' },
        { label: 'Peach',    value: '#FFCC80' },
        { label: 'Lavender', value: '#CE93D8' },
        { label: 'Remove',   value: 'none'    },
    ];

    const TEXT_COLORS = [
        { label: 'Red',     value: '#EF4444' },
        { label: 'Orange',  value: '#F97316' },
        { label: 'Yellow',  value: '#EAB308' },
        { label: 'Green',   value: '#22C55E' },
        { label: 'Blue',    value: '#3B82F6' },
        { label: 'Purple',  value: '#A855F7' },
        { label: 'Default', value: 'none'    },
    ];

    const hlToolbar = document.createElement('div');
    hlToolbar.id = 'hl-toolbar';
    hlToolbar.innerHTML = `
        <div class="hl-row">
            <span class="hl-label" title="Highlight"><i class="fa-solid fa-highlighter"></i></span>
            ${HIGHLIGHT_COLORS.map(c => `
                <button class="hl-swatch ${c.value === 'none' ? 'hl-swatch-none' : ''}"
                    title="${c.label}" data-type="highlight" data-color="${c.value}"
                    style="${c.value !== 'none' ? `background:${c.value}` : ''}">
                    ${c.value === 'none' ? '<i class="fa-solid fa-xmark"></i>' : ''}
                </button>`).join('')}
        </div>
        <div class="hl-divider"></div>
        <div class="hl-row">
            <span class="hl-label" title="Text Color"><i class="fa-solid fa-font"></i></span>
            ${TEXT_COLORS.map(c => `
                <button class="hl-swatch tc-swatch ${c.value === 'none' ? 'hl-swatch-none' : ''}"
                    title="${c.label}" data-type="textcolor" data-color="${c.value}"
                    style="${c.value !== 'none' ? `background:${c.value}` : ''}">
                    ${c.value === 'none' ? '<i class="fa-solid fa-xmark"></i>' : ''}
                </button>`).join('')}
        </div>`;
    document.body.appendChild(hlToolbar);

    let savedRange = null;

    const getSelectionRange = () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
        const range = sel.getRangeAt(0);
        if (!notepad.contains(range.commonAncestorContainer)) return null;
        return range;
    };

    const positionToolbar = (range) => {
        const rect = range.getBoundingClientRect();
        hlToolbar.style.visibility = 'hidden';
        hlToolbar.style.display = 'flex';
        const tbW = hlToolbar.offsetWidth;
        const tbH = hlToolbar.offsetHeight;
        hlToolbar.style.display = '';
        hlToolbar.style.visibility = '';

        let top  = rect.top + window.scrollY - tbH - 10;
        let left = rect.left + window.scrollX + rect.width / 2 - tbW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tbW - 8));
        if (top < 8) top = rect.bottom + window.scrollY + 10;

        hlToolbar.style.top  = top + 'px';
        hlToolbar.style.left = left + 'px';
    };

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

    document.addEventListener('mousedown', (e) => {
        if (!hlToolbar.contains(e.target) && e.target !== notepad) {
            hlToolbar.classList.remove('visible');
        }
    });

    // Prevent toolbar click from killing the selection
    hlToolbar.addEventListener('mousedown', (e) => e.preventDefault());

    hlToolbar.querySelectorAll('.hl-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!savedRange) return;
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);

            const type  = btn.dataset.type;
            const color = btn.dataset.color;

            if (type === 'highlight') {
                if (color === 'none') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    document.execCommand('hiliteColor', false, color);
                }
            } else if (type === 'textcolor') {
                if (color === 'none') {
                    document.execCommand('removeFormat', false, null);
                } else {
                    document.execCommand('foreColor', false, color);
                }
            }

            sel.removeAllRanges();
            savedRange = null;
            hlToolbar.classList.remove('visible');
            updateCounts();
        });
    });

    // ============================================
    // IMAGE ATTACHMENT
    // ============================================

    // Hidden file input
    const imgInput = document.createElement('input');
    imgInput.type   = 'file';
    imgInput.accept = 'image/*';
    imgInput.style.display = 'none';
    document.body.appendChild(imgInput);

    // Inject "Image" button into topbar before Save
    const attachImgBtn = document.createElement('button');
    attachImgBtn.className = 'topbar-btn';
    attachImgBtn.id        = 'attachImgBtn';
    attachImgBtn.title     = 'Attach Image / Paste Screenshot';
    attachImgBtn.innerHTML = '<i class="fa-solid fa-image"></i><span>Image</span>';
    attachImgBtn.addEventListener('click', () => {
        if (!currentUser) { showToast('Please sign in first'); return; }
        imgInput.click();
    });
    saveBtn.parentElement.insertBefore(attachImgBtn, saveBtn);

    // Inject "Export PDF" button into topbar before Save
    const exportPdfBtn = document.createElement('button');
    exportPdfBtn.className = 'topbar-btn';
    exportPdfBtn.id        = 'exportPdfBtn';
    exportPdfBtn.title     = 'Save / Export Note as PDF';
    exportPdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i><span>PDF</span>';
    exportPdfBtn.addEventListener('click', exportCurrentNoteToPdf);
    saveBtn.parentElement.insertBefore(exportPdfBtn, saveBtn);

    const fileToDataUrl = (file) => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = e => res(e.target.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
    });

    const attachImageRemoveListener = (wrapper) => {
        const btn = wrapper.querySelector('.note-image-remove');
        if (btn) btn.addEventListener('click', () => { wrapper.remove(); updateCounts(); });
    };

    const insertImageAtCursor = (dataUrl) => {
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
        img.src       = dataUrl;
        img.className = 'note-image';
        img.alt       = 'Attached image';

        const rmBtn = document.createElement('button');
        rmBtn.className = 'note-image-remove';
        rmBtn.title     = 'Remove image';
        rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

        wrapper.appendChild(img);
        wrapper.appendChild(rmBtn);
        attachImageRemoveListener(wrapper);

        range.insertNode(wrapper);

        // Move cursor after the image
        const newRange = document.createRange();
        newRange.setStartAfter(wrapper);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        updateCounts();
    };

    imgInput.addEventListener('change', async () => {
        const file = imgInput.files[0];
        if (!file) return;
        try {
            const dataUrl = await fileToDataUrl(file);
            insertImageAtCursor(dataUrl);
            showToast('Image attached!');
        } catch {
            showToast('Failed to load image');
        }
        imgInput.value = '';
    });

    // ============================================
    // PASTE HANDLER
    // Strips inline styles/colors from pasted HTML so
    // text is always visible in both light and dark mode.
    // ============================================
    notepad.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        // Handle image paste first
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                if (!currentUser) { showToast('Please sign in first'); return; }
                try {
                    const dataUrl = await fileToDataUrl(item.getAsFile());
                    insertImageAtCursor(dataUrl);
                    showToast('Screenshot pasted!');
                } catch {
                    showToast('Failed to paste image');
                }
                return;
            }
        }

        // Strip inline styles/colors from pasted HTML
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        if (html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            // Remove all inline style attributes
            tmp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
            // Remove legacy color/bgcolor/face attributes
            tmp.querySelectorAll('[color],[bgcolor],[face]').forEach(el => {
                el.removeAttribute('color');
                el.removeAttribute('bgcolor');
                el.removeAttribute('face');
            });
            // Unwrap <font> tags, keeping their inner content
            tmp.querySelectorAll('font').forEach(el => el.replaceWith(...el.childNodes));
            document.execCommand('insertHTML', false, tmp.innerHTML);
        } else {
            // Fallback: insert as plain text
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }
        updateCounts();
    });

    // ============================================
    // Initialize
    // ============================================

    loadTheme();
    const session = await checkSession();
    await updateUIForAuth(!!session);
    if (session) await loadSavedNotes();
    updateCounts();
    noteTitle.focus();
});
