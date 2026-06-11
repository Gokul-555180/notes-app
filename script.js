document.addEventListener('DOMContentLoaded', () => {
    // State
    let notes = JSON.parse(localStorage.getItem('smart_notes_pro')) || [];
    let editingId = null;
    let currentSearchTerm = '';

    // DOM Elements
    const body = document.documentElement; // using body or root
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    const addNoteBtn = document.getElementById('add-note-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const addBtnText = document.getElementById('add-btn-text');
    
    const searchBar = document.getElementById('search-bar');
    const sortSelect = document.getElementById('sort-select');
    
    const notesContainer = document.getElementById('notes-container');
    const noteTemplate = document.getElementById('note-template');
    
    const exportTxtBtn = document.getElementById('export-txt');
    const exportJsonBtn = document.getElementById('export-json');

    // Initialization
    initTheme();
    renderNotes();

    // Event Listeners
    themeToggleBtn.addEventListener('click', toggleTheme);
    addNoteBtn.addEventListener('click', handleAddOrUpdateNote);
    cancelEditBtn.addEventListener('click', resetForm);
    searchBar.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        renderNotes();
    });
    sortSelect.addEventListener('change', renderNotes);
    exportTxtBtn.addEventListener('click', exportToTxt);
    exportJsonBtn.addEventListener('click', exportToJson);

    // --- Core Functions ---

    function saveNotes() {
        localStorage.setItem('smart_notes_pro', JSON.stringify(notes));
    }

    function handleAddOrUpdateNote() {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        
        if (!title && !content) return;

        const aiData = generateMockAI(content + ' ' + title);

        if (editingId) {
            // Update existing note
            const index = notes.findIndex(n => n.id === editingId);
            if (index !== -1) {
                notes[index] = {
                    ...notes[index],
                    title: title || 'Untitled',
                    content,
                    summary: aiData.summary,
                    tags: aiData.tags,
                    mood: aiData.mood
                };
            }
            resetForm();
        } else {
            // Add new note
            const newNote = {
                id: Date.now().toString(),
                title: title || 'Untitled',
                content,
                date: new Date().toISOString(),
                pinned: false,
                summary: aiData.summary,
                tags: aiData.tags,
                mood: aiData.mood
            };
            notes.push(newNote);
        }

        saveNotes();
        renderNotes();
        resetForm();
    }

    function deleteNote(id) {
        notes = notes.filter(n => n.id !== id);
        saveNotes();
        renderNotes();
    }

    function editNote(id) {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        titleInput.value = note.title;
        contentInput.value = note.content;
        editingId = id;

        addBtnText.textContent = 'Update Note';
        cancelEditBtn.classList.remove('hidden');
        titleInput.focus();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function togglePin(id) {
        const note = notes.find(n => n.id === id);
        if (note) {
            note.pinned = !note.pinned;
            saveNotes();
            renderNotes();
        }
    }

    function resetForm() {
        titleInput.value = '';
        contentInput.value = '';
        editingId = null;
        addBtnText.textContent = 'Add Note';
        cancelEditBtn.classList.add('hidden');
    }

    // --- Rendering ---

    function renderNotes() {
        notesContainer.innerHTML = '';
        
        let filteredNotes = notes.filter(note => {
            if (!currentSearchTerm) return true;
            return note.title.toLowerCase().includes(currentSearchTerm) || 
                   note.content.toLowerCase().includes(currentSearchTerm);
        });

        // Sorting
        const sortMode = sortSelect.value;
        filteredNotes.sort((a, b) => {
            // Pinned absolute priority
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            
            // Then date
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortMode === 'newest' ? dateB - dateA : dateA - dateB;
        });

        filteredNotes.forEach(note => {
            const node = noteTemplate.content.cloneNode(true);
            const article = node.querySelector('article');
            article.dataset.id = note.id;

            // Header Elements
            const titleEl = node.querySelector('.note-title');
            titleEl.innerHTML = highlightMatch(escapeHTML(note.title), currentSearchTerm);
            
            const pinBtn = node.querySelector('.pin-btn');
            if(note.pinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', () => togglePin(note.id));

            // AI Features
            const moodBadge = node.querySelector('.mood-badge');
            moodBadge.className = `badge mood-badge ${note.mood.toLowerCase()}`;
            moodBadge.textContent = `Mood: ${note.mood}`;

            const tagsContainer = node.querySelector('.tags-container');
            note.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = `#${tag}`;
                tagsContainer.appendChild(tagEl);
            });

            // Content
            node.querySelector('.note-summary').textContent = note.summary;
            
            const contentHTML = renderMarkdown(escapeHTML(note.content));
            node.querySelector('.note-content').innerHTML = highlightMatch(contentHTML, currentSearchTerm);
            
            node.querySelector('.note-date').textContent = new Date(note.date).toLocaleDateString(undefined, { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
            });

            // Actions
            node.querySelector('.edit-btn').addEventListener('click', () => editNote(note.id));
            node.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));

            notesContainer.appendChild(node);
        });
    }

    // --- Mock AI Features ---

    function generateMockAI(text) {
        if (!text) return { summary: '', tags: [], mood: 'Neutral' };
        
        const cleanText = text.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase();
        const words = cleanText.split(/\s+/).filter(w => w.length > 3);
        
        // Mood Detection
        const positiveWords = ['happy', 'success', 'achievement', 'excited', 'great', 'excellent', 'amazing', 'good'];
        const negativeWords = ['sad', 'stressed', 'tired', 'frustrated', 'bad', 'angry', 'terrible', 'fail'];
        
        let posCount = words.filter(w => positiveWords.includes(w)).length;
        let negCount = words.filter(w => negativeWords.includes(w)).length;
        
        let mood = 'Neutral';
        if (posCount > negCount) mood = 'Positive';
        else if (negCount > posCount) mood = 'Negative';

        // Summary generation (First 20 words or first line)
        const firstLine = text.split('\n')[0];
        const summaryWords = firstLine.split(' ').slice(0, 20);
        let summary = summaryWords.join(' ');
        if (firstLine.split(' ').length > 20) summary += '...';

        // Tags generation
        const stopWords = ['this', 'that', 'with', 'from', 'your', 'have', 'more', 'some'];
        const tagCandidates = [...new Set(words.filter(w => !stopWords.includes(w)))];
        const tags = tagCandidates.slice(0, 3); // Take up to 3 tags

        return { summary: summary || 'No summary available.', tags, mood };
    }

    // --- Utilities ---

    function renderMarkdown(text) {
        let html = text;
        // Headings
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        // Bold & Italic
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        // Bullet Lists
        html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
        html = html.replace(/<\/ul>\n<ul>/gim, '');
        // Paragraphs (Simple line breaks)
        html = html.replace(/\n$/gim, '<br />');
        
        return html;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function highlightMatch(html, term) {
        if (!term) return html;
        // Basic highlighting (ignoring HTML tags inside words for simplicity)
        const regex = new RegExp(`>([^<]*?)(${term})([^>]*?)<`, 'gi');
        // A safer trick since we already have HTML rendered:
        // Temporarily wrap the exact text match if it isn't inside a tag.
        const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?![^<]*>)(${safeTerm})`, "gi");
        return html.replace(re, '<mark>$1</mark>');
    }

    // --- Theme Management ---

    function initTheme() {
        const savedTheme = localStorage.getItem('smart_notes_theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('smart_notes_theme', isDark ? 'dark' : 'light');
        
        moonIcon.style.display = isDark ? 'none' : 'block';
        sunIcon.style.display = isDark ? 'block' : 'none';
    }

    // --- Exports ---

    function exportToTxt() {
        if (notes.length === 0) return alert('No notes to export');
        let txtContent = "SMART NOTES PRO - EXPORT\n\n";
        notes.forEach(note => {
            txtContent += `Title: ${note.title}\nDate: ${new Date(note.date).toLocaleString()}\nMood: ${note.mood}\nTags: ${note.tags.join(', ')}\nContent:\n${note.content}\n\n`;
            txtContent += "--------------------------------------\n\n";
        });
        downloadFile(txtContent, 'smart_notes_export.txt', 'text/plain');
    }

    function exportToJson() {
        if (notes.length === 0) return alert('No notes to export');
        const jsonContent = JSON.stringify(notes, null, 2);
        downloadFile(jsonContent, 'smart_notes_export.json', 'application/json');
    }

    function downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(a.href);
    }
});