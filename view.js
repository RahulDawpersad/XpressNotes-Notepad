// ============================================
// XpressNotes - Public Read-Only Note Viewer
// Loads a single note by its share_token via the
// Supabase anon key. Requires the "Public can view
// shared notes" RLS policy (see supabase_share_migration.sql).
// ============================================

document.addEventListener('DOMContentLoaded', async function () {
    // Same project as main.js - anon key is safe to expose client-side.
    const supabaseUrl = 'https://hchlauwjnjekoxfkwznp.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjaGxhdXdqbmpla294Zmt3em5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTA0NTUsImV4cCI6MjA4Nzc4NjQ1NX0.KEAXVXG8ML28Cix-A7SlGfvfeoVIekpJxhDhyRGrXwk';
    const { createClient } = supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const app = document.getElementById('viewerApp');

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const renderError = (title, message) => {
        app.innerHTML = `
            <div class="viewer-error">
                <i class="fa-solid fa-lock"></i>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(message)}</p>
            </div>`;
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get('n');

    if (!token) {
        renderError('No note specified', 'This link is missing its note reference.');
        return;
    }

    const { data, error } = await supabaseClient
        .from('notes')
        .select('title, content, created_at')
        .eq('share_token', token)
        .eq('is_shared', true)
        .single();

    if (error || !data) {
        renderError('This note is not available', 'It may have been unshared, or the link is incorrect.');
        return;
    }

    const date = new Date(data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = new Date(data.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    app.innerHTML = `
        <div class="viewer-badge"><i class="fa-solid fa-eye"></i> Shared Note · View Only</div>
        <h1 class="viewer-title">${escapeHtml(data.title || 'Untitled Note')}</h1>
        <div class="viewer-meta">
            <span><i class="fa-regular fa-calendar"></i> ${date}</span>
            <span><i class="fa-regular fa-clock"></i> ${time}</span>
        </div>
        <div class="viewer-content">${data.content || '<p style="color:#9CA3AF;font-style:italic;">This note is empty</p>'}</div>
        <div class="viewer-footer">
            Shared via <a href="index.html"><i class="fa-solid fa-feather-pointed"></i> XpressNotes</a>
        </div>`;

    // Re-highlight any embedded code blocks
    if (window.hljs) {
        app.querySelectorAll('.code-block-wrapper code').forEach(el => {
            try { window.hljs.highlightElement(el); } catch (e) { /* ignore */ }
        });
    }

    // Wire "Copy" buttons on embedded code blocks
    app.querySelectorAll('.code-copy-btn').forEach(btn => {
        const codeEl = btn.closest('.code-block-wrapper')?.querySelector('code');
        if (!codeEl) return;
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(codeEl.textContent);
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
                setTimeout(() => { btn.innerHTML = original; }, 1500);
            } catch { /* ignore */ }
        });
    });
});
