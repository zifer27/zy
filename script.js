document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // 🔥 KONFIGURASI BACKEND
    // ============================================================

    const BACKEND_URL = 'http://207.180.19.124:3529';

    console.log('🔗 Backend URL:', BACKEND_URL);

    // ============================================================
    // SYSTEM PROMPT
    // ============================================================

    const SYSTEM_PROMPT = `Kamu adalah Zyrex AI, asisten cerdas yang dibuat oleh Ziferr.

📌 ATURAN UTAMA:
1. FOKUS: Membantu SEMUA pertanyaan (bukan hanya coding)
2. Jika user meminta kode, berikan dalam format code block dengan nama bahasa
3. Jawab dengan ramah, informatif, dan detail
4. Gunakan bahasa Indonesia

💡 Contoh format kode:
\`\`\`python
print("Hello World")
\`\`\`

INGAT: Selalu gunakan code block untuk semua kode!`;

    // ============================================================
    // ELEMEN DOM
    // ============================================================

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const messagesEl = document.getElementById('messages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const themeToggle = document.getElementById('themeToggle');
    const historyList = document.getElementById('historyList');
    const modal = document.getElementById('codeModal');
    const modalCode = document.getElementById('modalCode');
    const closeModal = document.querySelector('.close-modal');
    const copyCodeBtn = document.getElementById('copyCodeBtn');

    // ============================================================
    // STATE
    // ============================================================

    let currentChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let chats = JSON.parse(localStorage.getItem('zyrexChats')) || {};
    let isProcessing = false;

    // TTS State
    let isSpeaking = false;
    let currentUtterance = null;

    // ============================================================
    // FUNGSI UTAMA
    // ============================================================

    function renderMessages(chatId) {
        const msgs = chats[chatId] || [];
        messagesEl.innerHTML = '';

        msgs.forEach((msg) => {
            const div = document.createElement('div');
            div.className = `message ${msg.role}`;

            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.innerHTML = msg.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-paw"></i>';

            const bubble = document.createElement('div');
            bubble.className = 'bubble';

            let content = msg.content;

            content = content.replace(/```(\w+)?\s*([\s\S]*?)```/g, (match, lang, code) => {
                const langLabel = lang ? lang.trim() : '';
                const cleanCode = code.trim();
                return `<pre><code class="lang-${langLabel}">${escapeHtml(cleanCode)}</code></pre>`;
            });

            content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
            content = content.replace(/\n/g, '<br>');

            bubble.innerHTML = content;

            // TTS Button
            if (msg.role === 'assistant' && msg.content !== '⏳ Mengetik...') {
                const ttsWrapper = document.createElement('div');
                ttsWrapper.className = 'tts-wrapper';

                const speakBtn = document.createElement('button');
                speakBtn.className = 'speak-btn';
                speakBtn.innerHTML = '<i class="fas fa-play"></i> Suara';
                speakBtn.dataset.text = msg.content;
                speakBtn.dataset.playing = 'false';

                speakBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSpeech(msg.content, speakBtn);
                });

                ttsWrapper.appendChild(speakBtn);
                bubble.appendChild(ttsWrapper);
            }

            div.appendChild(avatar);
            div.appendChild(bubble);
            messagesEl.appendChild(div);
        });

        const container = document.getElementById('chatContainer');
        container.scrollTop = container.scrollHeight;
        renderHistory();
    }

    // ============================================================
    // TTS TOGGLE (PLAY / STOP)
    // ============================================================

    function toggleSpeech(text, button) {
        if (isSpeaking && currentUtterance) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            currentUtterance = null;
            button.innerHTML = '<i class="fas fa-play"></i> Suara';
            button.dataset.playing = 'false';
            return;
        }

        if (!window.speechSynthesis) {
            alert('Browser tidak mendukung TTS.');
            return;
        }

        const clean = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/```(\w+)?\s*([\s\S]*?)```/g, '$2')
            .replace(/<[^>]*>/g, '')
            .replace(/\n/g, ' ')
            .slice(0, 500);

        if (!clean.trim()) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            currentUtterance = utterance;
            button.innerHTML = '<i class="fas fa-stop"></i> Hentikan';
            button.dataset.playing = 'true';
        };

        utterance.onend = () => {
            isSpeaking = false;
            currentUtterance = null;
            button.innerHTML = '<i class="fas fa-play"></i> Suara';
            button.dataset.playing = 'false';
        };

        utterance.onerror = () => {
            isSpeaking = false;
            currentUtterance = null;
            button.innerHTML = '<i class="fas fa-play"></i> Suara';
            button.dataset.playing = 'false';
        };

        window.speechSynthesis.speak(utterance);
    }

    // ============================================================
    // FUNGSI LAINNYA
    // ============================================================

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function renderHistory() {
        const keys = Object.keys(chats);
        historyList.innerHTML = '';

        if (keys.length === 0) {
            historyList.innerHTML = '<div style="padding: 12px 14px; color: #7f9bb3; font-size: 14px;">Belum ada chat</div>';
            return;
        }

        keys.slice().reverse().forEach(key => {
            const item = document.createElement('div');
            item.className = `history-item ${key === currentChatId ? 'active' : ''}`;
            const firstMsg = chats[key]?.find(m => m.role === 'user')?.content || 'Chat kosong';
            item.innerHTML = `<i class="fas fa-comment"></i> ${firstMsg.substring(0, 24)}${firstMsg.length > 24 ? '…' : ''}`;
            item.dataset.chatId = key;
            item.addEventListener('click', () => {
                currentChatId = key;
                renderMessages(currentChatId);
                if (window.innerWidth <= 700) sidebar.classList.remove('open');
            });
            historyList.appendChild(item);
        });
    }

    function saveChat(chatId, messages) {
        chats[chatId] = messages;
        localStorage.setItem('zyrexChats', JSON.stringify(chats));
        renderHistory();
    }

    function addMessage(role, content) {
        if (!chats[currentChatId]) chats[currentChatId] = [];
        chats[currentChatId].push({ role, content });
        saveChat(currentChatId, chats[currentChatId]);
        renderMessages(currentChatId);
    }

    // ============================================================
    // CEK KONEKSI KE BACKEND
    // ============================================================

    async function checkBackend() {
        try {
            console.log('🔍 Checking backend...');
            const response = await fetch(BACKEND_URL + '/health');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend OK:', data);
                return true;
            }
            return false;
        } catch (e) {
            console.error('❌ Backend Error:', e.message);
            return false;
        }
    }

    // ============================================================
    // KIRIM PESAN KE AI
    // ============================================================

    async function sendToAI(userMsg) {
        if (isProcessing) return;

        addMessage('user', userMsg);
        userInput.value = '';
        userInput.focus();

        isProcessing = true;
        const loadingMsg = { role: 'assistant', content: '⏳ Mengetik...' };
        if (!chats[currentChatId]) chats[currentChatId] = [];
        chats[currentChatId].push(loadingMsg);
        renderMessages(currentChatId);

        try {
            const history = (chats[currentChatId] || [])
                .filter(m => m.content !== '⏳ Mengetik...')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch(BACKEND_URL + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...history
                    ],
                    max_tokens: 2048,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa menjawab.';

            chats[currentChatId] = chats[currentChatId].filter(m => m.content !== '⏳ Mengetik...');
            chats[currentChatId].push({ role: 'assistant', content: reply });
            saveChat(currentChatId, chats[currentChatId]);
            renderMessages(currentChatId);

        } catch (error) {
            console.error('❌ Error:', error);
            chats[currentChatId] = chats[currentChatId].filter(m => m.content !== '⏳ Mengetik...');
            chats[currentChatId].push({ role: 'assistant', content: `❌ Error: ${error.message}` });
            saveChat(currentChatId, chats[currentChatId]);
            renderMessages(currentChatId);
        } finally {
            isProcessing = false;
        }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    sendBtn.addEventListener('click', () => {
        const msg = userInput.value.trim();
        if (msg && !isProcessing) sendToAI(msg);
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    newChatBtn.addEventListener('click', () => {
        currentChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        chats[currentChatId] = [];
        saveChat(currentChatId, chats[currentChatId]);
        renderMessages(currentChatId);
        if (window.innerWidth <= 700) sidebar.classList.remove('open');
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Hapus semua riwayat?')) {
            chats = {};
            localStorage.removeItem('zyrexChats');
            currentChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            chats[currentChatId] = [];
            saveChat(currentChatId, chats[currentChatId]);
            renderMessages(currentChatId);
        }
    });

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    });

    document.addEventListener('click', (e) => {
        const target = e.target.closest('pre code');
        if (target) {
            modalCode.textContent = target.textContent;
            modal.classList.remove('hidden');
        }
    });

    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    copyCodeBtn.addEventListener('click', async () => {
        const text = modalCode.textContent;
        try {
            await navigator.clipboard.writeText(text);
            alert('✅ Kode disalin!');
        } catch {
            const range = document.createRange();
            range.selectNode(modalCode);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            alert('✅ Kode disalin!');
        }
    });

    // ============================================================
    // INIT
    // ============================================================

    checkBackend();

    if (!chats[currentChatId]) {
        chats[currentChatId] = [];
        chats[currentChatId].push({
            role: 'assistant',
            content: `👋 Halo! Saya **Zyrex AI**, asisten cerdas buatan **Ziferr**.

📌 Saya bisa membantu:
• Coding (semua bahasa)
• Pertanyaan umum
• Penjelasan konsep
• Dan lainnya!

💡 Coba tanyakan apa saja, saya siap membantu!`
        });
        saveChat(currentChatId, chats[currentChatId]);
    }

    renderMessages(currentChatId);
    renderHistory();

    console.log('🚀 Zyrex AI Frontend Ready!');
    console.log('🔗 Backend:', BACKEND_URL);
    console.log('🔊 Klik tombol Suara untuk Play/Stop TTS');
});
