// ============================================
// XpressNotes - Modern Notepad App with Supabase
// + Text Highlighting & Image Attachment
// + Auto Code Snippet Detection on Paste
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
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignUpBtn = document.getElementById('googleSignUpBtn');
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

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            currentUser = user;
            await updateUIForAuth(true);
            await loadSavedNotes();
            signInModal.style.display = 'none';
            signUpModal.style.display = 'none';
            showToast('Logged in');
        }
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            await updateUIForAuth(false);
        }
    });

    /**
     * Masks an email address for privacy-friendly display.
     * e.g. "jonathan.smith@gmail.com" -> "jo*******@gmail.com"
     */
    const maskEmail = (email) => {
        if (!email || !email.includes('@')) return email || '';
        const [local, domain] = email.split('@');
        if (local.length <= 2) {
            return `${local[0]}*@${domain}`;
        }
        const visible = local.slice(0, 2);
        const stars = '*'.repeat(Math.min(local.length - 2, 6));
        return `${visible}${stars}@${domain}`;
    };

    /**
     * Populates the sidebar profile chip (avatar initial, display name,
     * masked email) for the given Supabase user.
     */
    const renderUserProfile = (user) => {
        const email = user.email || '';
        const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (email.includes('@') ? email.split('@')[0] : 'Account');

        const avatarEl = document.getElementById('profileAvatar');
        const nameEl = document.getElementById('userDisplayName');

        if (avatarEl) avatarEl.textContent = displayName.charAt(0);
        if (nameEl) nameEl.textContent = displayName;
        if (userEmail) {
            userEmail.textContent = maskEmail(email);
            userEmail.title = email; // full address available on hover for the user themselves
        }
    };

    const updateUIForAuth = async (isLoggedIn) => {
        if (isLoggedIn) {
            if (currentUser) renderUserProfile(currentUser);
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
            shareToken: note.share_token || null,
            isShared: !!note.is_shared,
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
                    <button class="note-item-share${note.isShared ? ' shared' : ''}" data-id="${note.id}" title="${note.isShared ? 'Shared · manage link' : 'Share this note'}">
                        <i class="fa-solid fa-share-nodes" data-id="${note.id}"></i>
                    </button>
                    <button class="note-item-delete" data-id="${note.id}" title="Delete note">
                        <i class="fa-solid fa-trash-can" data-id="${note.id}"></i>
                    </button>
                </li>`).join('');
        }
    };

    const saveNote = async () => {
        // Get content as HTML (preserves highlights + images + code blocks)
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
            // Load rich HTML content (highlights + images + code blocks restore automatically)
            notepad.innerHTML = note.content || '';
            // Re-attach remove listeners on any images in loaded note
            notepad.querySelectorAll('.note-image-wrapper').forEach(attachImageRemoveListener);
            // Re-attach copy listeners + re-highlight any code blocks in loaded note
            notepad.querySelectorAll('.code-block-wrapper').forEach(attachCodeBlockListeners);
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
        const shareIconBtn = e.target.closest('.note-item-share');
        if (shareIconBtn) { openShareModal(shareIconBtn.getAttribute('data-id')); return; }
        const deleteBtn = e.target.closest('.note-item-delete');
        if (deleteBtn) { await deleteNote(deleteBtn.getAttribute('data-id')); return; }
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

    const signInWithGoogle = async () => {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        if (error) showToast('Google sign-in error: ' + error.message);
        // No further action needed here — the browser redirects to Google,
        // then back to this page, and onAuthStateChange below picks up the session.
    };

    if (googleSignInBtn) googleSignInBtn.addEventListener('click', signInWithGoogle);
    if (googleSignUpBtn) googleSignUpBtn.addEventListener('click', signInWithGoogle);

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
        { label: 'Yellow', value: '#FFF176' },
        { label: 'Lime', value: '#CCFF90' },
        { label: 'Cyan', value: '#80DEEA' },
        { label: 'Pink', value: '#F48FB1' },
        { label: 'Peach', value: '#FFCC80' },
        { label: 'Lavender', value: '#CE93D8' },
        { label: 'Remove', value: 'none' },
    ];

    const TEXT_COLORS = [
        { label: 'Red', value: '#EF4444' },
        { label: 'Orange', value: '#F97316' },
        { label: 'Yellow', value: '#EAB308' },
        { label: 'Green', value: '#22C55E' },
        { label: 'Blue', value: '#3B82F6' },
        { label: 'Purple', value: '#A855F7' },
        { label: 'Default', value: 'none' },
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

        let top = rect.top + window.scrollY - tbH - 10;
        let left = rect.left + window.scrollX + rect.width / 2 - tbW / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tbW - 8));
        if (top < 8) top = rect.bottom + window.scrollY + 10;

        hlToolbar.style.top = top + 'px';
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

            const type = btn.dataset.type;
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
    imgInput.type = 'file';
    imgInput.accept = 'image/*';
    imgInput.style.display = 'none';
    document.body.appendChild(imgInput);

    // Inject "Image" button into topbar before Save
    const attachImgBtn = document.createElement('button');
    attachImgBtn.className = 'topbar-btn';
    attachImgBtn.id = 'attachImgBtn';
    attachImgBtn.title = 'Attach Image / Paste Screenshot';
    attachImgBtn.innerHTML = '<i class="fa-solid fa-image"></i><span>Image</span>';
    attachImgBtn.addEventListener('click', () => {
        if (!currentUser) { showToast('Please sign in first'); return; }
        imgInput.click();
    });
    saveBtn.parentElement.insertBefore(attachImgBtn, saveBtn);

    const fileToDataUrl = (file) => new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
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
        img.src = dataUrl;
        img.className = 'note-image';
        img.alt = 'Attached image';

        const rmBtn = document.createElement('button');
        rmBtn.className = 'note-image-remove';
        rmBtn.title = 'Remove image';
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
    // CODE SNIPPET DETECTION + INSERTION
    // Detects pasted code (any language) and renders
    // it as a syntax-highlighted snippet block, similar
    // to how chat apps like Grok display code.
    // ============================================

    const LANGUAGE_LABELS = {
        html: 'HTML', css: 'CSS', javascript: 'JavaScript', typescript: 'TypeScript',
        python: 'Python', json: 'JSON', java: 'Java', cpp: 'C++', csharp: 'C#',
        php: 'PHP', sql: 'SQL', bash: 'Shell', xml: 'XML', yaml: 'YAML',
        plaintext: 'Code'
    };

    // Heuristic scoring to decide if pasted plain text is "code" vs normal prose
    const isLikelyCode = (text) => {
        if (!text) return false;
        const trimmed = text.trim();
        if (trimmed.length < 3) return false;

        let score = 0;
        const lines = trimmed.split('\n');

        // Strong single-shot signals
        if (/<!DOCTYPE\s+html/i.test(trimmed)) score += 3;
        if (/<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/i.test(trimmed)) score += 2; // html-ish tags
        if (/^\s*(function|const|let|var|def|class|import|export|public|private|static|void|return|if\s*\(|for\s*\(|while\s*\(|package|#include|namespace)\b/m.test(trimmed)) score += 2;
        if (/=>|===|!==|::|->/.test(trimmed)) score += 1;
        if (/[{};]\s*$/m.test(trimmed)) score += 1;
        if (/^\s{2,}\S/m.test(trimmed) && lines.length > 1) score += 1; // indentation across multiple lines
        if (/^\s*[.#]?[\w-]+\s*\{[\s\S]*\}/m.test(trimmed) && /:\s*[^;{}]+;/.test(trimmed)) score += 2; // css rule
        if (/#!\//.test(trimmed) || /^\s*\$\s+\S/m.test(trimmed)) score += 2; // shebang / shell prompt
        if (/SELECT\s+.+\s+FROM\s+/i.test(trimmed)) score += 2;

        const braceCount = (trimmed.match(/[{}]/g) || []).length;
        if (braceCount >= 2) score += 1;

        const semicolonEndedLines = lines.filter(l => /;\s*$/.test(l.trim())).length;
        if (semicolonEndedLines >= 2) score += 1;

        // Penalize things that look like normal prose (lots of sentence punctuation, few code symbols)
        const looksLikeProse = /[.!?]\s/.test(trimmed) && !/[{}();]/.test(trimmed);
        if (looksLikeProse) score -= 2;

        return score >= 3;
    };

    // Best-effort language detection for the label + hljs class
    const detectLanguage = (text) => {
        const t = text.trim();
        if (/<!DOCTYPE\s+html/i.test(t) || /<html[\s>]/i.test(t) || (/<\/?(div|span|body|head|script|style|meta|link|section|header|footer|button|input)\b/i.test(t))) return 'html';
        if (/^\s*[.#]?[\w-]+\s*\{[\s\S]*\}/m.test(t) && /:\s*[^;{}]+;/.test(t) && !/\b(function|const|let|var|def |class )\b/.test(t)) return 'css';
        if (/^\s*(def |import |elif |print\()/m.test(t) && !/;\s*$/m.test(t)) return 'python';
        if (/#include\s*<|std::|int\s+main\s*\(/.test(t)) return 'cpp';
        if (/\bpublic\s+class\b|System\.out\.println/.test(t)) return 'java';
        if (/^\s*<\?php/.test(t)) return 'php';
        if (/SELECT\s+.+\s+FROM\s+/i.test(t)) return 'sql';
        if (/^\s*\{[\s\S]*\}\s*$/.test(t) && /"[\w-]+"\s*:/.test(t)) return 'json';
        if (/^#!\/bin\/(ba)?sh/.test(t) || /^\s*\$\s+\S/m.test(t)) return 'bash';
        if (/\b(function|const|let|var|=>|console\.log|require\(|import .* from)\b/.test(t)) return 'javascript';
        return 'plaintext';
    };

    const attachCodeBlockListeners = (wrapper) => {
    const btn = wrapper.querySelector('.code-copy-btn');
    const codeEl = wrapper.querySelector('code');

    if (btn && codeEl && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', async (e) => {
            console.log('Copy button clicked');
            e.preventDefault();
            e.stopPropagation();

            const textToCopy = codeEl.textContent;
            let copied = false;

            // Primary: Clipboard API (requires HTTPS or localhost)
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    copied = true;
                } catch (err) {
                    console.warn('Clipboard API failed, trying fallback:', err);
                }
            }

            // Fallback: hidden textarea + execCommand (works over HTTP too)
            if (!copied) {
                try {
                    const tempTextarea = document.createElement('textarea');
                    tempTextarea.value = textToCopy;
                    tempTextarea.style.position = 'fixed';
                    tempTextarea.style.left = '-9999px';
                    tempTextarea.style.top = '0';
                    document.body.appendChild(tempTextarea);
                    tempTextarea.focus();
                    tempTextarea.select();
                    copied = document.execCommand('copy');
                    document.body.removeChild(tempTextarea);
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                }
            }

            if (copied) {
                btn.classList.add('copied');
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1500);
            } else {
                console.error('Copy failed: no clipboard method available. isSecureContext =', window.isSecureContext);
                showToast('Could not copy — try selecting the code manually');
            }
        });
    }

    // Fix: mark as highlighted so we never re-run hljs on the same node
    if (window.hljs && codeEl && !codeEl.dataset.highlighted) {
        try {
            window.hljs.highlightElement(codeEl);
            codeEl.dataset.highlighted = 'true';
        } catch (err) {
            console.warn('Highlight failed', err);
        }
    }
};

    const insertCodeBlock = (code, lang) => {
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
        wrapper.className = 'code-block-wrapper';

        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.contentEditable = 'false';

        const langLabel = document.createElement('span');
        langLabel.className = 'code-lang';
        langLabel.textContent = LANGUAGE_LABELS[lang] || 'Code';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.type = 'button';
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';

        header.appendChild(langLabel);
        header.appendChild(copyBtn);

        const pre = document.createElement('pre');
        const codeEl = document.createElement('code');
        codeEl.className = `language-${lang}`;
        codeEl.textContent = code;
        pre.appendChild(codeEl);

        wrapper.appendChild(header);
        wrapper.appendChild(pre);
        attachCodeBlockListeners(wrapper);

        range.insertNode(wrapper);

        // Add an empty paragraph after the block so the user can keep typing below it
        const spacer = document.createElement('div');
        spacer.innerHTML = '<br>';
        wrapper.after(spacer);

        // Move cursor into the spacer after the code block
        const newRange = document.createRange();
        newRange.setStart(spacer, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        updateCounts();
    };

    // ============================================
    // PASTE HANDLER
    // 1) Images -> inline attachment
    // 2) Detected code -> syntax-highlighted snippet block
    // 3) Everything else -> strips inline styles/colors AND
    //    embedded <style> blocks / class attributes (Google
    //    Docs & Word paste) so text is always visible in
    //    both light and dark mode.
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

        const plainText = e.clipboardData.getData('text/plain');

        // Handle detected code -> render as snippet block
        if (plainText && isLikelyCode(plainText)) {
            e.preventDefault();
            const lang = detectLanguage(plainText);
            insertCodeBlock(plainText.replace(/\r\n/g, '\n'), lang);
            showToast(`${LANGUAGE_LABELS[lang] || 'Code'} snippet pasted`);
            return;
        }

        // Strip inline styles/colors from pasted HTML
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        if (html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;

            // Remove any embedded stylesheet blocks (Google Docs / Word paste)
            tmp.querySelectorAll('style').forEach(el => el.remove());

            // Remove all inline style attributes
            tmp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

            // Remove class attributes that could reference the removed stylesheet
            tmp.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));

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
            document.execCommand('insertText', false, plainText);
        }
        updateCounts();
    });

    // ============================================
    // SHARE FEATURE (public read-only link + WhatsApp)
    // ============================================

    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    const shareModalTitle = document.getElementById('shareModalTitle');
    const shareLinkRow = document.getElementById('shareLinkRow');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const shareCopyBtn = document.getElementById('shareCopyBtn');
    const shareWhatsappBtn = document.getElementById('shareWhatsappBtn');
    const shareRevokeBtn = document.getElementById('shareRevokeBtn');
    const shareStartBtn = document.getElementById('shareStartBtn');
    const shareStatus = document.getElementById('shareStatus');

    let shareModalNoteId = null;

    const getShareBaseUrl = () => {
        const path = window.location.pathname;
        const dir = path.substring(0, path.lastIndexOf('/') + 1);
        return `${window.location.origin}${dir}`;
    };

    const getShareUrl = (token) => `${getShareBaseUrl()}view.html?n=${token}`;

    const renderShareModal = (note) => {
        shareModalTitle.textContent = `Share "${note.title || 'Untitled Note'}"`;
        if (note.isShared && note.shareToken) {
            const url = getShareUrl(note.shareToken);
            shareLinkInput.value = url;
            shareLinkRow.style.display = 'flex';
            shareWhatsappBtn.style.display = 'flex';
            shareRevokeBtn.style.display = 'inline-block';
            shareStartBtn.style.display = 'none';
            shareStatus.innerHTML = '<i class="fa-solid fa-circle"></i> This link is live — anyone with it can view this note (read-only).';
            shareStatus.classList.add('is-live');
            shareWhatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(`Check out this note: ${note.title || 'Untitled Note'}\n${url}`)}`;
        } else {
            shareLinkRow.style.display = 'none';
            shareWhatsappBtn.style.display = 'none';
            shareRevokeBtn.style.display = 'none';
            shareStartBtn.style.display = 'inline-block';
            shareStatus.innerHTML = '<i class="fa-regular fa-eye-slash"></i> Not shared yet. Generate a link to share this note.';
            shareStatus.classList.remove('is-live');
        }
    };

    const fetchNoteForShare = async (id) => {
        const { data, error } = await supabaseClient
            .from('notes')
            .select('id, title, share_token, is_shared')
            .eq('id', id)
            .single();
        if (error || !data) { showToast('Could not load note'); return null; }
        return { id: data.id, title: data.title, shareToken: data.share_token, isShared: !!data.is_shared };
    };

    const openShareModal = async (id) => {
        if (!currentUser) { showToast('Please sign in first'); return; }
        if (!id) { showToast('Save this note before sharing it'); return; }
        const note = await fetchNoteForShare(id);
        if (!note) return;
        shareModalNoteId = id;
        renderShareModal(note);
        shareModal.style.display = 'block';
    };

    const generateShareLink = async () => {
        if (!shareModalNoteId) return;
        const token = (crypto.randomUUID && crypto.randomUUID()) ||
            `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { error } = await supabaseClient
            .from('notes')
            .update({ share_token: token, is_shared: true })
            .eq('id', shareModalNoteId);
        if (error) { showToast('Error: ' + error.message); return; }
        showToast('Share link created');
        const note = await fetchNoteForShare(shareModalNoteId);
        if (note) renderShareModal(note);
        await loadSavedNotes();
    };

    const revokeShareLink = async () => {
        if (!shareModalNoteId) return;
        const { error } = await supabaseClient
            .from('notes')
            .update({ share_token: null, is_shared: false })
            .eq('id', shareModalNoteId);
        if (error) { showToast('Error: ' + error.message); return; }
        showToast('Link revoked');
        const note = await fetchNoteForShare(shareModalNoteId);
        if (note) renderShareModal(note);
        await loadSavedNotes();
    };

    if (shareStartBtn) shareStartBtn.addEventListener('click', generateShareLink);
    if (shareRevokeBtn) shareRevokeBtn.addEventListener('click', revokeShareLink);

    if (shareCopyBtn) shareCopyBtn.addEventListener('click', async () => {
        const flashCopied = () => {
            const original = shareCopyBtn.innerHTML;
            shareCopyBtn.classList.add('copied');
            shareCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                shareCopyBtn.classList.remove('copied');
                shareCopyBtn.innerHTML = original;
            }, 1500);
        };
        try {
            await navigator.clipboard.writeText(shareLinkInput.value);
            showToast('Link copied to clipboard');
            flashCopied();
        } catch {
            shareLinkInput.select();
            document.execCommand('copy');
            showToast('Link copied to clipboard');
            flashCopied();
        }
    });

    if (closeShareModal) closeShareModal.addEventListener('click', () => { shareModal.style.display = 'none'; shareModalNoteId = null; });
    window.addEventListener('click', (e) => {
        if (e.target === shareModal) { shareModal.style.display = 'none'; shareModalNoteId = null; }
    });

    // Topbar Share button — shares whichever note is currently open in the editor
    const shareCurrentBtn = document.createElement('button');
    shareCurrentBtn.className = 'topbar-btn';
    shareCurrentBtn.id = 'shareBtn';
    shareCurrentBtn.title = 'Share this note';
    shareCurrentBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i><span>Share</span>';
    shareCurrentBtn.addEventListener('click', async () => {
        if (!activeNoteId) { showToast('Save this note first, then share it'); return; }
        await openShareModal(activeNoteId);
    });
    saveBtn.parentElement.insertBefore(shareCurrentBtn, saveBtn);

    // ============================================
    // PDF GENERATION
    // ============================================

    // Get the PDF button element
    const pdfBtn = document.getElementById('pdfBtn');

    // Function to generate and download PDF
    const generatePDF = () => {
        const title = noteTitle.value.trim() || 'Untitled Note';
        const content = notepad.innerHTML;
        const date = getCurrentDate();
        const time = getCurrentTime();

        // Store current theme
        const isDarkMode = body.classList.contains('dark-mode');

        // Create a temporary iframe for PDF generation
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        // Get computed styles from the current theme
        const computedStyle = getComputedStyle(body);
        const bgColor = computedStyle.getPropertyValue('--bg-primary').trim() || (isDarkMode ? '#0F0F0F' : '#FAFAFA');
        const textColor = computedStyle.getPropertyValue('--text-primary').trim() || (isDarkMode ? '#F0F0F0' : '#1A1A1A');
        const accentColor = computedStyle.getPropertyValue('--accent').trim() || '#20B2AA';

        // Write the PDF content to the iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(title)}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: ${bgColor};
                    color: ${textColor};
                    padding: 60px 80px;
                    line-height: 1.8;
                    font-size: 15px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                }
                
                .pdf-header {
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid ${accentColor};
                }
                
                .pdf-title {
                    font-size: 36px;
                    font-weight: 700;
                    color: ${textColor};
                    margin-bottom: 12px;
                    letter-spacing: -0.5px;
                    line-height: 1.2;
                }
                
                .pdf-meta {
                    display: flex;
                    gap: 20px;
                    color: #6B7280;
                    font-size: 13px;
                    font-weight: 400;
                }
                
                .pdf-meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .pdf-meta-item i {
                    color: ${accentColor};
                }
                
                .pdf-content {
                    font-size: 15px;
                    line-height: 1.8;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                
                .pdf-content mark,
                .pdf-content [style*="background-color"] {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                }
                
                .pdf-content [style*="color"] {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                }
                
                .pdf-content .note-image-wrapper {
                    position: relative;
                    display: block;
                    max-width: 100%;
                    margin: 24px 0;
                    page-break-inside: avoid;
                }
                
                .pdf-content .note-image {
                    display: block;
                    max-width: 100%;
                    max-height: 600px;
                    object-fit: contain;
                    border-radius: 8px;
                    border: 1px solid #E5E7EB;
                }
                
                .pdf-content .note-image-remove {
                    display: none !important;
                }

                .pdf-content .code-block-wrapper {
                    margin: 20px 0;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid #383838;
                    background: #1e1e1e;
                    page-break-inside: avoid;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .pdf-content .code-block-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 14px;
                    background: #262626;
                    border-bottom: 1px solid #383838;
                }

                .pdf-content .code-lang {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    color: #9CA3AF;
                }

                .pdf-content .code-copy-btn {
                    display: none !important;
                }

                .pdf-content .code-block-wrapper pre {
                    margin: 0;
                    padding: 16px;
                    overflow-x: auto;
                }

                .pdf-content .code-block-wrapper code {
                    font-family: 'JetBrains Mono', 'Fira Code', Consolas, Menlo, monospace;
                    font-size: 12.5px;
                    line-height: 1.6;
                    color: #e6e6e6;
                    white-space: pre-wrap;
                }
                
                .pdf-footer {
                    margin-top: 60px;
                    padding-top: 20px;
                    border-top: 1px solid #E5E7EB;
                    text-align: center;
                    color: #9CA3AF;
                    font-size: 11px;
                }
                
                .pdf-watermark {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                
                .pdf-watermark i {
                    color: ${accentColor};
                }
                
                @media print {
                    body {
                        padding: 0;
                        background: white !important;
                        color: black !important;
                    }
                    
                    .pdf-header {
                        border-bottom-color: #E5E7EB !important;
                    }
                    
                    .pdf-title {
                        color: #1A1A1A !important;
                    }
                    
                    .pdf-content {
                        color: #1A1A1A !important;
                    }
                    
                    .pdf-content > *:not(.code-block-wrapper):not(.code-block-wrapper *) {
                        color: inherit !important;
                    }
                    
                    .pdf-content mark,
                    .pdf-content [style*="background-color"] {
                        color: #111 !important;
                    }
                    
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                }
            </style>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
        </head>
        <body>
            <div class="pdf-header">
                <h1 class="pdf-title">${escapeHtml(title)}</h1>
                <div class="pdf-meta">
                    <div class="pdf-meta-item">
                        <i class="fa-regular fa-calendar"></i>
                        <span>${date}</span>
                    </div>
                    <div class="pdf-meta-item">
                        <i class="fa-regular fa-clock"></i>
                        <span>${time}</span>
                    </div>
                    <div class="pdf-meta-item">
                        <i class="fa-solid fa-feather-pointed"></i>
                        <span>XpressNotes</span>
                    </div>
                </div>
            </div>
            <div class="pdf-content">
                ${content || '<p style="color: #9CA3AF; font-style: italic;">No content</p>'}
            </div>
            <div class="pdf-footer">
                <div class="pdf-watermark">
                    <i class="fa-solid fa-feather-pointed"></i>
                    <span>Created with XpressNotes</span>
                </div>
            </div>
        </body>
        </html>
    `);

        iframeDoc.close();

        // Wait for images to load
        const images = iframeDoc.querySelectorAll('img');
        let loadedImages = 0;
        const totalImages = images.length;

        const printWhenReady = () => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up after print dialog closes
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };

        if (totalImages === 0) {
            setTimeout(printWhenReady, 500);
        } else {
            images.forEach(img => {
                if (img.complete) {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        setTimeout(printWhenReady, 500);
                    }
                } else {
                    img.onload = () => {
                        loadedImages++;
                        if (loadedImages === totalImages) {
                            setTimeout(printWhenReady, 500);
                        }
                    };
                    img.onerror = () => {
                        loadedImages++;
                        if (loadedImages === totalImages) {
                            setTimeout(printWhenReady, 500);
                        }
                    };
                }
            });
        }
    };

    // Add event listener for PDF button
    pdfBtn.addEventListener('click', () => {
        generatePDF();
    });

    // Add keyboard shortcut Ctrl+Shift+P for PDF
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
            e.preventDefault();
            generatePDF();
        }
    });

    // Also add a PDF option in the context menu for saved notes
    savedNotesList.addEventListener('contextmenu', async (e) => {
        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            e.preventDefault();
            const noteId = noteItem.getAttribute('data-id');

            // Load the note temporarily, generate PDF, then restore current note
            const savedNotes = await getNotes();
            const note = savedNotes.find(n => n.id === noteId);

            if (note) {
                // Store current state
                const currentContent = notepad.innerHTML;
                const currentTitle = noteTitle.value;
                const currentActiveNoteId = activeNoteId;

                // Load the selected note
                activeNoteId = noteId;
                noteTitle.value = note.title;
                notepad.innerHTML = note.content || '';

                // Generate PDF
                setTimeout(() => {
                    generatePDF();

                    // Restore previous state after a short delay
                    setTimeout(() => {
                        activeNoteId = currentActiveNoteId;
                        noteTitle.value = currentTitle;
                        notepad.innerHTML = currentContent;
                        if (currentActiveNoteId) {
                            updateBreadcrumb(currentTitle || 'New Note');
                        } else {
                            updateBreadcrumb('New Note');
                        }
                        updateCounts();
                    }, 1500);
                }, 300);
            }
        }
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
