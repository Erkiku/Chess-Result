// ================================
// Round Results Page Logic
// ================================

let currentRound = 1;
let currentView = 'table';
let roundMatches = [];

// ========================
// Round Selection
// ========================

function selectRound(roundNumber) {
    currentRound = roundNumber;

    // Update tab UI
    document.querySelectorAll('.round-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.round) === roundNumber);
    });

    // Update title
    document.getElementById('roundTitle').textContent = `Round ${roundNumber}`;

    // Reload data
    loadRoundData(roundNumber);
}

// ========================
// View Toggle
// ========================

function setView(view) {
    currentView = view;
    document.getElementById('btnTableView').classList.toggle('active', view === 'table');
    document.getElementById('btnCardView').classList.toggle('active', view === 'cards');
    document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('cardsView').style.display = view === 'cards' ? 'block' : 'none';
}

// ========================
// Load Round Data
// ========================

async function loadRoundData(roundNumber) {
    try {
        const [matches, standings] = await Promise.all([
            getMatchesByRound(DEFAULT_TOURNAMENT_ID, roundNumber),
            getRoundStandings(DEFAULT_TOURNAMENT_ID, roundNumber)
        ]);

        roundMatches = matches;

        // Round Summary & Status
        const summary = calculateRoundSummary(matches);
        const status = getRoundStatus(matches);
        renderRoundStatus(status, summary);

        // Match Table
        renderMatchTable(matches);

        // Match Cards
        renderMatchCards(matches, roundNumber);

        // Round Standings
        renderStandings(standings);

    } catch (err) {
        console.error('Error loading round data:', err);
        showToast('Failed to load round data', true);
    }
}

// ========================
// Render Functions
// ========================

function renderRoundStatus(status, summary) {
    const badge = document.getElementById('roundStatusBadge');
    const labels = {
        'upcoming': 'Upcoming',
        'in_progress': 'In Progress',
        'completed': 'Completed'
    };
    const classes = {
        'upcoming': 'badge badge-upcoming',
        'in_progress': 'badge badge-in-progress',
        'completed': 'badge badge-completed'
    };
    badge.textContent = labels[status] || status;
    badge.className = classes[status] || 'badge';

    const counter = document.getElementById('matchCounter');
    counter.innerHTML = `<strong>${summary.completed}</strong> of <strong>${summary.total}</strong> matches completed`;
}

function renderMatchTable(matches) {
    const tbody = document.getElementById('matchTableBody');

    if (matches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="icon">♟</div>
                        <p>No matches scheduled for this round</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = matches.map(m => {
        const resultBadgeClass = m.result === 'pending' ? 'badge-pending' :
                                 m.result === 'draw' ? 'badge-draw' : 'badge-win';

        return `
            <tr>
                <td><strong>#${m.match_number}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="player-color-dot white-piece" style="width:10px;height:10px;"></span>
                        <span>${m.white_player?.player_name || '—'}</span>
                        <span style="color: var(--white-30); font-size: 0.75rem;">(${m.white_player?.roll_no || m.white_player?.player_id || ''})</span>
                        ${m.white_player?.branch ? `<span class="badge badge-branch">${m.white_player.branch}</span>` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--white-50); margin-top: 2px;">
                        ${m.status === 'completed' ? m.white_points + ' pt' : '—'}
                    </div>
                </td>
                <td><span class="badge ${resultBadgeClass}">${formatResult(m.result)}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="player-color-dot black-piece" style="width:10px;height:10px;"></span>
                        <span>${m.black_player?.player_name || '—'}</span>
                        <span style="color: var(--white-30); font-size: 0.75rem;">(${m.black_player?.roll_no || m.black_player?.player_id || ''})</span>
                        ${m.black_player?.branch ? `<span class="badge badge-branch">${m.black_player.branch}</span>` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--white-50); margin-top: 2px;">
                        ${m.status === 'completed' ? m.black_points + ' pt' : '—'}
                    </div>
                </td>
                <td>${getWinner(m)}</td>
            </tr>
        `;
    }).join('');
}

function renderMatchCards(matches, roundNumber) {
    const container = document.getElementById('matchCardsContainer');

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="icon">♟</div>
                <p>No matches scheduled for this round</p>
            </div>`;
        return;
    }

    container.innerHTML = matches.map(m => {
        const isWhiteWinner = m.result === 'white_wins';
        const isBlackWinner = m.result === 'black_wins';
        const isDraw = m.result === 'draw';
        const isPending = m.result === 'pending';

        const cardClass = isPending ? 'pending' : isDraw ? 'draw' : 'win';

        return `
            <div class="match-card ${cardClass}">
                <div class="match-card-header">
                    <span class="match-card-label">Match ${String(m.match_number).padStart(2, '0')} · Round ${roundNumber}</span>
                    <span class="badge ${isPending ? 'badge-pending' : isDraw ? 'badge-draw' : 'badge-win'}">
                        ${isPending ? 'Pending' : isDraw ? 'DRAW' : formatResult(m.result)}
                    </span>
                </div>

                <div class="match-card-players">
                    <!-- White Player -->
                    <div class="match-player-row ${isWhiteWinner ? 'winner' : ''}">
                        <div class="player-info">
                            <div class="player-color-dot white-piece"></div>
                            <div>
                                <div class="player-name">${m.white_player?.player_name || '—'} ${m.white_player?.branch ? `<span class="badge badge-branch" style="font-size: 0.7rem; padding: 1px 6px;">${m.white_player.branch}</span>` : ''}</div>
                                ${isWhiteWinner ? '<span class="badge badge-win" style="margin-top: 4px;">WINNER</span>' : ''}
                            </div>
                        </div>
                        <span class="player-points ${isWhiteWinner ? 'highlight' : ''}">${m.status === 'completed' ? m.white_points : '—'}</span>
                    </div>

                    <div class="match-vs">vs</div>

                    <!-- Black Player -->
                    <div class="match-player-row ${isBlackWinner ? 'winner' : ''}">
                        <div class="player-info">
                            <div class="player-color-dot black-piece"></div>
                            <div>
                                <div class="player-name">${m.black_player?.player_name || '—'} ${m.black_player?.branch ? `<span class="badge badge-branch" style="font-size: 0.7rem; padding: 1px 6px;">${m.black_player.branch}</span>` : ''}</div>
                                ${isBlackWinner ? '<span class="badge badge-win" style="margin-top: 4px;">WINNER</span>' : ''}
                            </div>
                        </div>
                        <span class="player-points ${isBlackWinner ? 'highlight' : ''}">${m.status === 'completed' ? m.black_points : '—'}</span>
                    </div>
                </div>

                <div class="match-card-footer">
                    <div class="match-result-text">Result: ${formatResult(m.result)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStandings(standings) {
    const tbody = document.getElementById('standingsBody');

    if (standings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state" style="padding: 30px;">
                        <p>No standings data</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = standings.map((s, i) => `
        <tr>
            <td class="rank-cell ${s.rank === 1 ? 'rank-1' : ''} col-center">${s.rank !== null && s.rank !== undefined ? s.rank : '—'}</td>
            <td><strong>${s.player_name}</strong></td>
            <td class="col-center">${s.roll_no || s.player_code || '—'}</td>
            <td class="col-center"><span class="badge badge-branch">${s.branch || '—'}</span></td>
            <td class="points-highlight col-center">${s.round_points}</td>
            <td class="col-center">${s.overall_rank !== null && s.overall_rank !== undefined ? s.overall_rank : '—'}</td>
        </tr>
    `).join('');
}

// ========================
// Toast
// ========================

function showToast(message, isError = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `<span>${isError ? '⚠️' : '✓'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function toggleNav() {
    document.getElementById('navLinks').classList.toggle('open');
}

// ========================
// Realtime
// ========================

subscribeToMatches((payload) => {
    showToast('Match result updated — refreshing...');
    loadRoundData(currentRound);
});

// ========================
// Initialize
// ========================

loadRoundData(1);
