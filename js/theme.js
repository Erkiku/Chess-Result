// Global Theme Management (Light & Dark UI)
(function() {
    const savedTheme = localStorage.getItem('chess_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('chess_theme', next);
    updateThemeToggleUI(next);
}

function updateThemeToggleUI(theme) {
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
        btn.setAttribute('title', theme === 'light' ? 'Switch to Dark UI' : 'Switch to Light UI');
        btn.setAttribute('aria-label', theme === 'light' ? 'Switch to Dark UI' : 'Switch to Light UI');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeToggleUI(active);
});
