// ============================================
// XpressNotes - Modern Notepad App with Supabase
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
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getCurrentTime = () => {
        const date = new Date();
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    };

    const updateCounts = () => {
        const text = notepad.value;
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
        const cleaned = content.replace(/\n/g, ' ').trim();
        return cleaned.length > maxLength
            ? cleaned.substring(0, maxLength) + '...'
            : cleaned;
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

    const updateUIForAuth = async (isLoggedIn) => {
        if (isLoggedIn) {
            if (currentUser) {
                userEmail.textContent = currentUser.email;
            }
            signInOpenBtn.style.display = 'none';
            signUpOpenBtn.style.display = 'none';
            userProfile.style.display = 'flex';
            signOutBtn.style.display = 'block';
            newNoteBtn.style.display = 'block';
            deleteAllBtn.style.display = 'block';
            savedNotesList.style.display = 'block';
            notepad.disabled = false;
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
            notepad.disabled = true;
            noteTitle.disabled = true;
            notepad.value = '';
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

        if (error) {
            console.error(error);
            showToast('Error loading notes');
            return [];
        }

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

            savedNotesList.innerHTML = savedNotes
                .map(
                    (note) => `
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
        `
                )
                .join('');
        }
    };

    const saveNote = async () => {
        const content = notepad.value.trim();
        const title = noteTitle.value.trim() || 'Untitled Note';

        if (!content && !title) {
            showToast('Please write something first');
            return;
        }

        if (!currentUser) {
            showToast('Please login first');
            return;
        }

        const noteData = { title, content, user_id: currentUser.id };
        let response;

        if (activeNoteId) {
            // Update
            response = await supabaseClient.from('notes').update(noteData).eq('id', activeNoteId);
            if (!response.error) showToast('Note updated');
        } else {
            // Create
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
        if (error) {
            showToast('Error deleting');
            return;
        }

        if (activeNoteId === id) {
            activeNoteId = null;
            notepad.value = '';
            noteTitle.value = '';
            updateBreadcrumb('New Note');
            updateCounts();
        }

        await loadSavedNotes();
        showToast('Note deleted');
    };

    const deleteAllNotes = async () => {
        if (confirm('Are you sure you want to delete all notes? This cannot be undone.')) {
            if (!currentUser) return;

            const { error } = await supabaseClient.from('notes').delete().eq('user_id', currentUser.id);
            if (error) {
                showToast('Error deleting all');
            } else {
                activeNoteId = null;
                notepad.value = '';
                noteTitle.value = '';
                updateBreadcrumb('New Note');
                updateCounts();
                await loadSavedNotes();
                showToast('All notes deleted');
            }
        }
    };

    const loadNoteIntoEditor = async (id) => {
        const savedNotes = await getNotes();
        const note = savedNotes.find(n => n.id === id);
        if (note) {
            activeNoteId = id;
            noteTitle.value = note.title;
            notepad.value = note.content;
            updateBreadcrumb(note.title);
            updateCounts();
            await loadSavedNotes();
            closeSidebar();
        }
    };

    const createNewNote = () => {
        activeNoteId = null;
        noteTitle.value = '';
        notepad.value = '';
        updateBreadcrumb('New Note');
        updateCounts();
        loadSavedNotes(); // Refresh active state
        noteTitle.focus();
        closeSidebar();
    };

    // ============================================
    // Event Listeners
    // ============================================

    saveBtn.addEventListener('click', saveNote);

    clearBtn.addEventListener('click', () => {
        notepad.value = '';
        noteTitle.value = '';
        activeNoteId = null;
        updateBreadcrumb('New Note');
        updateCounts();
        loadSavedNotes();
    });

    newNoteBtn.addEventListener('click', createNewNote);

    deleteAllBtn.addEventListener('click', deleteAllNotes);

    // Click on note list items
    savedNotesList.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.note-item-delete');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            await deleteNote(id);
            return;
        }

        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            const id = noteItem.getAttribute('data-id');
            await loadNoteIntoEditor(id);
        }
    });

    // Live character/word count
    notepad.addEventListener('input', updateCounts);

    // Live breadcrumb update
    noteTitle.addEventListener('input', () => {
        updateBreadcrumb(noteTitle.value || 'New Note');
    });

    // Keyboard shortcut: Ctrl/Cmd + S to save
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveNote();
        }
    });

    // Modal Open/Close
    signInOpenBtn.addEventListener('click', () => {
        signInModal.style.display = 'block';
    });

    signUpOpenBtn.addEventListener('click', () => {
        signUpModal.style.display = 'block';
    });

    closeSignIn.addEventListener('click', () => {
        signInModal.style.display = 'none';
    });

    closeSignUp.addEventListener('click', () => {
        signUpModal.style.display = 'none';
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === signInModal) signInModal.style.display = 'none';
        if (e.target === signUpModal) signUpModal.style.display = 'none';
    });

    // Auth Submit
    signInSubmit.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: signInEmail.value,
            password: signInPassword.value,
        });
        if (error) {
            showToast(error.message);
        } else {
            showToast('Logged in');
            const { data: { user } } = await supabaseClient.auth.getUser();
            currentUser = user;
            await updateUIForAuth(true);
            await loadSavedNotes();
            signInModal.style.display = 'none';
            signInEmail.value = '';
            signInPassword.value = '';
        }
    });

    signUpSubmit.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signUp({
            email: signUpEmail.value,
            password: signUpPassword.value,
        });
        if (error) {
            showToast(error.message);
        } else {
            showToast('Check your email for confirmation');
            signUpModal.style.display = 'none';
            signUpEmail.value = '';
            signUpPassword.value = '';
        }
    });

    signOutBtn.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            showToast(error.message);
        } else {
            currentUser = null;
            showToast('Logged out');
            await updateUIForAuth(false);
        }
    });

    // ============================================
    // Theme Toggle
    // ============================================

    themeBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        themeBtn.innerHTML = isDarkMode
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
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
    // Initialize
    // ============================================

    loadTheme();
    const session = await checkSession();
    await updateUIForAuth(!!session);
    if (session) await loadSavedNotes();
    updateCounts();
    noteTitle.focus();
});
