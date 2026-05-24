// ============================================
// XpressNotes - Rich Text + Image Attachments
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    // DOM Elements
    const noteEditor = document.getElementById('noteEditor');
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
    const imageUploadInput = document.getElementById('imageUploadInput');

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
    let savedSelection = null; // save caret before opening colour palette

    // Create overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.querySelector('.app-wrapper').appendChild(overlay);

    // ============================================
    // Utility Functions
    // ============================================

    const showToast = (message, icon = 'check-circle') => {
        toastMessage.textContent = message;
        toast.querySelector('i').className = `fa-solid fa-${icon}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    };

    const updateCounts = () => {
        const text = noteEditor.innerText || '';
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
        const cleaned = (tmp.innerText || '').replace(/\n/g, ' ').trim();
        return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ============================================
    // Selection helpers (preserve caret for colour pickers)
    // ============================================

    const saveCurrentSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedSelection = sel.getRangeAt(0).cloneRange();
        }
    };

    const restoreSelection = () => {
        if (!savedSelection) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
        noteEditor.focus();
    };

    // ============================================
    // Formatting Toolbar
    // ============================================

    // Basic commands (bold, italic, underline, lists, heading blocks)
    document.querySelectorAll('.fmt-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // don't blur editor
            const cmd = btn.dataset.cmd;
            const val = btn.dataset.val || null;
            document.execCommand(cmd, false, val);
            updateCounts();
            updateActiveStates();
        });
    });

    // Track active states (bold/italic/underline highlights)
    const updateActiveStates = () => {
        document.querySelectorAll('.fmt-btn[data-cmd]').forEach(btn => {
            const cmd = btn.dataset.cmd;
            if (['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'].includes(cmd)) {
                btn.classList.toggle('active', document.queryCommandState(cmd));
            }
        });
    };

    noteEditor.addEventListener('keyup', updateActiveStates);
    noteEditor.addEventListener('mouseup', updateActiveStates);

    // ── Text Color ──
    const textColorBtn = document.getElementById('textColorBtn');
    const textColorPalette = document.getElementById('textColorPalette');
    const textColorIndicator = document.getElementById('textColorIndicator');
    const textColorCustom = document.getElementById('textColorCustom');

    let activeTextColor = '#1A1A1A';

    textColorBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        saveCurrentSelection();
        textColorPalette.classList.toggle('open');
        highlightPalette.classList.remove('open');
    });

    textColorPalette.querySelectorAll('.swatch[data-color]').forEach(swatch => {
        swatch.addEventListener('mousedown', (e) => {
            e.preventDefault();
            restoreSelection();
            activeTextColor = swatch.dataset.color;
            document.execCommand('foreColor', false, activeTextColor);
            textColorIndicator.style.background = activeTextColor;
            textColorPalette.classList.remove('open');
            updateCounts();
        });
    });

    textColorCustom.addEventListener('input', () => {
        restoreSelection();
        activeTextColor = textColorCustom.value;
        document.execCommand('foreColor', false, activeTextColor);
        textColorIndicator.style.background = activeTextColor;
        updateCounts();
    });

    // ── Highlight Color ──
    const highlightBtn = document.getElementById('highlightBtn');
    const highlightPalette = document.getElementById('highlightPalette');
    const highlightIndicator = document.getElementById('highlightIndicator');
    const highlightCustom = document.getElementById('highlightCustom');

    let activeHighlight = '#FEF08A';

    highlightBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        saveCurrentSelection();
        highlightPalette.classList.toggle('open');
        textColorPalette.classList.remove('open');
    });

    highlightPalette.querySelectorAll('.swatch[data-color]').forEach(swatch => {
        swatch.addEventListener('mousedown', (e) => {
            e.preventDefault();
            restoreSelection();
            const color = swatch.dataset.color;
            if (color === 'transparent') {
                document.execCommand('hiliteColor', false, 'transparent');
                highlightIndicator.style.background = '#FEF08A';
            } else {
                activeHighlight = color;
                document.execCommand('hiliteColor', false, color);
                highlightIndicator.style.background = color;
            }
            highlightPalette.classList.remove('open');
            updateCounts();
        });
    });

    highlightCustom.addEventListener('input', () => {
        restoreSelection();
        activeHighlight = highlightCustom.value;
        document.execCommand('hiliteColor', false, activeHighlight);
        highlightIndicator.style.background = activeHighlight;
        updateCounts();
    });

    // Close palettes when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.color-picker-wrap')) {
            textColorPalette.classList.remove('open');
            highlightPalette.classList.remove('open');
        }
    });

    // ============================================
    // Image Handling
    // ============================================

    /**
     * Upload an image File to Supabase Storage and insert an <img> into the editor.
     * Falls back to base64 inline if Supabase Storage isn't configured / user not logged in.
     */
    const insertImageFile = async (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const toastId = showToast('Uploading image…', 'spinner');

        // Try to upload to Supabase Storage
        if (currentUser) {
            const ext = file.name.split('.').pop() || 'png';
            const path = `${currentUser.id}/${Date.now()}.${ext}`;
            const { data, error } = await supabaseClient.storage
                .from('note-images') // ← your bucket name
                .upload(path, file, { cacheControl: '3600', upsert: false });

            if (!error) {
                const { data: urlData } = supabaseClient.storage
                    .from('note-images')
                    .getPublicUrl(path);
                insertImageUrl(urlData.publicUrl);
                showToast('Image attached!', 'check-circle');
                return;
            }
            // If bucket not set up yet, fall back to base64
            console.warn('Storage upload failed, falling back to base64:', error.message);
        }

        // Fallback: embed as base64
        const reader = new FileReader();
        reader.onload = (ev) => {
            insertImageUrl(ev.target.result);
            showToast('Image attached (embedded)', 'check-circle');
        };
        reader.readAsDataURL(file);
    };

    const insertImageUrl = (src) => {
        noteEditor.focus();
        const img = document.createElement('img');
        img.src = src;
        img.className = 'note-image';
        img.alt = 'Attached image';
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.margin = '8px 0';
        img.style.display = 'block';

        // Insert at cursor position or append
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.collapse(false);
            range.insertNode(img);
            // Move cursor after image
            range.setStartAfter(img);
            range.setEndAfter(img);
            sel.removeAllRanges();
            sel.addRange(range);
            // Insert a newline after image so user can keep typing
            document.execCommand('insertParagraph', false);
        } else {
            noteEditor.appendChild(img);
        }
        updateCounts();
    };

    // File input change
    imageUploadInput.addEventListener('change', async () => {
        const files = Array.from(imageUploadInput.files);
        for (const file of files) {
            await insertImageFile(file);
        }
        imageUploadInput.value = ''; // reset so same file can be picked again
    });

    // Paste handler – catches screenshots pasted from clipboard
    noteEditor.addEventListener('paste', async (e) => {
        const items = Array.from(e.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        if (imageItems.length === 0) return; // let default paste handle text

        e.preventDefault();
        for (const item of imageItems) {
            const file = item.getAsFile();
            if (file) await insertImageFile(file);
        }
    });

    // Drag-and-drop images onto the editor
    noteEditor.addEventListener('dragover', (e) => e.preventDefault());
    noteEditor.addEventListener('drop', async (e) => {
        const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        e.preventDefault();
        for (const file of files) {
            await insertImageFile(file);
        }
    });

    // Paste hint button – just a tooltip trigger, no action needed
    document.getElementById('pasteHintBtn').addEventListener('click', () => {
        showToast('Paste a screenshot with Ctrl+V (or Cmd+V) inside the editor!', 'circle-info');
    });

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
            noteEditor.contentEditable = 'true';
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
            noteEditor.contentEditable = 'false';
            noteTitle.disabled = true;
            noteEditor.innerHTML = '';
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
    // Sidebar Toggle
    // ============================================

    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    };

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
            content: note.content, // HTML string
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
                    <button class="note-item-delete" data-id="${note.id}" title="Delete note">
                        <i class="fa-solid fa-trash-can" data-id="${note.id}"></i>
                    </button>
                </li>
            `).join('');
        }
    };

    const saveNote = async () => {
        const content = noteEditor.innerHTML.trim();
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
            noteEditor.innerHTML = '';
            noteTitle.value = '';
            updateBreadcrumb('New Note');
            updateCounts();
        }
        await loadSavedNotes();
        showToast('Note deleted');
    };

    const deleteAllNotes = async () => {
        if (!confirm('Delete all notes? This cannot be undone.')) return;
        if (!currentUser) return;
        const { error } = await supabaseClient.from('notes').delete().eq('user_id', currentUser.id);
        if (error) { showToast('Error deleting all'); return; }
        activeNoteId = null;
        noteEditor.innerHTML = '';
        noteTitle.value = '';
        updateBreadcrumb('New Note');
        updateCounts();
        await loadSavedNotes();
        showToast('All notes deleted');
    };

    const loadNoteIntoEditor = async (id) => {
        const savedNotes = await getNotes();
        const note = savedNotes.find(n => n.id === id);
        if (note) {
            activeNoteId = id;
            noteTitle.value = note.title;
            noteEditor.innerHTML = note.content || '';
            updateBreadcrumb(note.title);
            updateCounts();
            await loadSavedNotes();
            closeSidebar();
            noteEditor.focus();
        }
    };

    const createNewNote = () => {
        activeNoteId = null;
        noteTitle.value = '';
        noteEditor.innerHTML = '';
        updateBreadcrumb('New Note');
        updateCounts();
        loadSavedNotes();
        noteTitle.focus();
        closeSidebar();
    };

    // ============================================
    // Event Listeners
    // ============================================

    saveBtn.addEventListener('click', saveNote);

    clearBtn.addEventListener('click', () => {
        noteEditor.innerHTML = '';
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
        const noteItem = e.target.closest('.note-item');
        if (noteItem) await loadNoteIntoEditor(noteItem.getAttribute('data-id'));
    });

    noteEditor.addEventListener('input', updateCounts);

    noteTitle.addEventListener('input', () => updateBreadcrumb(noteTitle.value || 'New Note'));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); }
    });

    // ── Modal Open/Close ──
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
        const isDark = body.classList.contains('dark-mode');
        themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    const loadTheme = () => {
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.classList.remove('dark-mode');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    };

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
