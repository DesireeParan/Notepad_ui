(() => {
    'use strict';

    // ---------- Config ----------
    const STORAGE_KEY = 'notepad.notes.v1';
    const LEGACY_KEY = 'note'; // single-note version of the app
    const TICKER_KEY = 'notepad.ticker.v1';
    const BRAND_KEY = 'notepad.brand.v1';
    const AUTOSAVE_MS = 600;
    const FONT_MIN = 12;
    const FONT_MAX = 64;
    const TOAST_MS = 1800;

    const GIFS = {
        saved: 'assets/dancecat.gif',
        created: 'assets/write.gif',
        undo: 'assets/circle.gif',
        redo: 'assets/cutecat.gif',
        print: 'assets/printer.gif',
        deleted: 'assets/wow.gif',
    };

    // ---------- DOM ----------
    const $ = (id) => document.getElementById(id);
    const els = {
        list: $('notesList'),
        emptyHint: $('emptyHint'),
        search: $('searchInput'),
        title: $('titleInput'),
        content: $('noteContent'),
        stats: $('stats'),
        saveStatus: $('saveStatus'),
        brand: $('brand'),
        brandText: $('brandText'),
        brandInput: $('brandInput'),
        ticker: $('ticker'),
        tickerText: $('tickerText'),
        tickerInput: $('tickerInput'),
        confirm: $('confirmDialog'),
        confirmMsg: $('confirmMsg'),
        toast: $('toast'),
        toastImg: $('toastImg'),
        toastMsg: $('toastMsg'),
        printTitle: $('printTitle'),
        printBody: $('printBody'),
    };

    // ---------- State ----------
    let notes = [];
    let activeId = null;
    let autosaveTimer = null;
    let toastTimer = null;

    const activeNote = () => notes.find((n) => n.id === activeId);

    // ---------- Storage ----------
    function loadNotes() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(stored) && stored.length) return stored;
        } catch { /* fall through to defaults */ }

        // Migrate the old single note, if there is one.
        const legacy = localStorage.getItem(LEGACY_KEY);
        return [createNote(legacy ? 'My first note' : '', legacy || '')];
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
            return true;
        } catch {
            toast('Could not save!', GIFS.deleted);
            return false;
        }
    }

    function createNote(title = '', body = '') {
        return {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title,
            body,
            updated: Date.now(),
        };
    }

    // ---------- Rendering ----------
    function formatDate(ts) {
        const d = new Date(ts);
        const sameDay = d.toDateString() === new Date().toDateString();
        return sameDay
            ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function renderList() {
        const query = els.search.value.trim().toLowerCase();
        const visible = notes
            .filter((n) => !query || (n.title + ' ' + n.body).toLowerCase().includes(query))
            .sort((a, b) => b.updated - a.updated);

        els.list.replaceChildren(
            ...visible.map((note) => {
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'note-item';
                btn.dataset.id = note.id;
                if (note.id === activeId) btn.setAttribute('aria-current', 'true');

                const title = document.createElement('span');
                title.className = 'note-item-title';
                title.textContent = note.title || 'Untitled note';

                const meta = document.createElement('span');
                meta.className = 'note-item-meta';
                meta.textContent = formatDate(note.updated);

                btn.append(title, meta);
                li.append(btn);
                return li;
            })
        );
        els.emptyHint.hidden = visible.length > 0;
    }

    function renderStats() {
        const text = els.content.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        els.stats.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${text.length} chars`;
    }

    function setSaveStatus(dirty) {
        els.saveStatus.textContent = dirty ? 'Unsaved changes...' : 'Saved';
        els.saveStatus.classList.toggle('is-dirty', dirty);
    }

    function showNote(id) {
        flushAutosave();
        activeId = id;
        const note = activeNote();
        els.title.value = note.title;
        els.content.value = note.body;
        renderStats();
        renderList();
        setSaveStatus(false);
    }

    // ---------- Actions ----------
    function commitEdits() {
        const note = activeNote();
        if (!note) return;
        const changed = note.title !== els.title.value || note.body !== els.content.value;
        if (!changed) return;
        note.title = els.title.value;
        note.body = els.content.value;
        note.updated = Date.now();
        persist();
        renderList();
    }

    function scheduleAutosave() {
        setSaveStatus(true);
        renderStats();
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => {
            autosaveTimer = null;
            commitEdits();
            setSaveStatus(false);
        }, AUTOSAVE_MS);
    }

    function flushAutosave() {
        if (autosaveTimer === null) return;
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
        commitEdits();
    }

    function saveNote() {
        clearTimeout(autosaveTimer);
        commitEdits();
        setSaveStatus(false);
        toast('Note saved!', GIFS.saved);
    }

    function newNote() {
        flushAutosave();
        const note = createNote();
        notes.push(note);
        persist();
        els.search.value = '';
        showNote(note.id);
        els.title.focus();
        toast('New note!', GIFS.created);
    }

    // Promise-based replacement for window.confirm() using <dialog>.
    function confirmDialog(message) {
        return new Promise((resolve) => {
            els.confirmMsg.textContent = message;
            els.confirm.addEventListener('close', () => resolve(els.confirm.returnValue === 'ok'), { once: true });
            els.confirm.returnValue = 'cancel';
            els.confirm.showModal();
        });
    }

    async function deleteNote() {
        const note = activeNote();
        if (!note) return;
        const label = note.title || 'Untitled note';
        if (!(await confirmDialog(`"${label}" will be gone for good. This can't be undone.`))) return;
        if (!activeNote()) return;

        clearTimeout(autosaveTimer);
        autosaveTimer = null;
        notes = notes.filter((n) => n.id !== note.id);
        if (!notes.length) notes.push(createNote());
        persist();
        showNote([...notes].sort((a, b) => b.updated - a.updated)[0].id);
        toast('Note deleted', GIFS.deleted);
    }

    function history(command, message, gif) {
        els.content.focus();
        document.execCommand(command);
        toast(message, gif);
    }

    function printNote() {
        els.printTitle.textContent = els.title.value || 'Untitled note';
        els.printBody.textContent = els.content.value;
        toast('Printing!', GIFS.print);
        // Let the toast render before the (blocking) print dialog opens.
        setTimeout(() => window.print(), 300);
    }

    function toast(message, gif) {
        els.toastMsg.textContent = message;
        els.toastImg.src = gif;
        els.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => els.toast.classList.remove('show'), TOAST_MS);
    }

    function zoomEditor(deltaY) {
        const current = parseFloat(getComputedStyle(els.content).fontSize);
        const next = Math.min(FONT_MAX, Math.max(FONT_MIN, current * (deltaY > 0 ? 0.9 : 1.1)));
        els.content.style.fontSize = `${next}px`;
        els.content.style.lineHeight = `${Math.round(next * 1.23)}px`;
        els.content.style.backgroundSize = `100% ${Math.round(next * 1.23)}px`;
    }

    // ---------- Inline-editable text (header name + ticker) ----------
    // Swaps `trigger` for `input` when the trigger is clicked (or Enter/Space on it). Enter/blur saves,
    // Esc cancels, an empty value resets to the default. Persists in localStorage.
    function makeEditable({ display, input, trigger, key, label, onChange }) {
        const fallback = display.textContent;

        const apply = (text) => {
            display.textContent = text;
            if (onChange) onChange(text);
        };

        try {
            const saved = localStorage.getItem(key);
            if (saved) apply(saved);
        } catch { /* keep default */ }

        const start = () => {
            input.value = display.textContent;
            trigger.hidden = true;
            input.hidden = false;
            input.focus();
            input.select();
        };

        const finish = (save) => {
            if (input.hidden) return;
            input.hidden = true;
            trigger.hidden = false;
            trigger.focus();
            if (!save) return;

            const text = input.value.trim() || fallback;
            apply(text);
            try {
                if (text === fallback) localStorage.removeItem(key);
                else localStorage.setItem(key, text);
            } catch { /* non-fatal */ }
            toast(`${label} updated!`, GIFS.saved);
        };

        trigger.addEventListener('click', start);
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                start();
            }
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') finish(true);
            else if (event.key === 'Escape') finish(false);
        });
        input.addEventListener('blur', () => finish(true));
    }

    // ---------- Events ----------
    makeEditable({
        display: els.brandText,
        trigger: els.brand,
        input: els.brandInput,
        key: BRAND_KEY,
        label: 'Name',
        onChange: (text) => { document.title = text; },
    });

    makeEditable({
        display: els.tickerText,
        trigger: els.ticker,
        input: els.tickerInput,
        key: TICKER_KEY,
        label: 'Ticker',
    });

    $('newBtn').addEventListener('click', newNote);
    $('saveBtn').addEventListener('click', saveNote);
    $('undoBtn').addEventListener('click', () => history('undo', 'Undo!', GIFS.undo));
    $('redoBtn').addEventListener('click', () => history('redo', 'Redo!', GIFS.redo));
    $('printBtn').addEventListener('click', printNote);
    $('deleteBtn').addEventListener('click', deleteNote);

    els.title.addEventListener('input', scheduleAutosave);
    els.content.addEventListener('input', scheduleAutosave);
    els.search.addEventListener('input', renderList);

    els.list.addEventListener('click', (event) => {
        const btn = event.target.closest('.note-item');
        if (btn && btn.dataset.id !== activeId) showNote(btn.dataset.id);
    });

    // Ctrl + mouse wheel zooms the editor text.
    els.content.addEventListener('wheel', (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        zoomEditor(event.deltaY);
    }, { passive: false });

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveNote();
        }
    });

    // Clicking the dimmed backdrop cancels the confirmation dialog.
    els.confirm.addEventListener('click', (event) => {
        if (event.target === els.confirm) els.confirm.close('cancel');
    });

    window.addEventListener('beforeunload', flushAutosave);

    // ---------- Init ----------
    notes = loadNotes();
    persist();
    showNote([...notes].sort((a, b) => b.updated - a.updated)[0].id);
})();
