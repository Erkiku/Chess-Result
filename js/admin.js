// ================================
// Admin Dashboard Logic
// ================================

let adminCurrentRound = 1;
let pairingCurrentRound = 1;
let currentAdminTab = 'players';
let adminLoggedIn = false;
let adminUser = null;
let currentTournamentId = getSelectedTournamentId();

let allPlayersList = [];
let currentRoundMatches = [];
let allTournamentMatchesCache = [];
let pendingActionCallback = null;

// ========================
// Tournament Multi-Category Switcher
// ========================

function updateAdminTournamentUI() {
    const cat = getSelectedTournamentCategory();
    const isBoys = cat === 'boys';
    const btnGirls = document.getElementById('adminBtnGirls');
    const btnBoys = document.getElementById('adminBtnBoys');
    const badge = document.getElementById('adminTournamentBadge');
    const notice = document.getElementById('addPlayerTournamentNotice');

    if (btnGirls) btnGirls.classList.toggle('active', !isBoys);
    if (btnBoys) btnBoys.classList.toggle('active', isBoys);
    const tournamentInfo = getTournamentInfo(currentTournamentId);
    if (badge) {
        badge.textContent = tournamentInfo.name;
        badge.className = `badge ${isBoys ? 'badge-win' : 'badge-in-progress'}`;
    }
    if (notice) {
        notice.innerHTML = `Adding player to: <strong>${tournamentInfo.name}</strong>`;
    }
}

function switchAdminTournament(category) {
    currentTournamentId = setSelectedTournamentCategory(category);
    updateAdminTournamentUI();
    currentRoundMatches = [];
    allTournamentMatchesCache = [];

    // Reload active tab data
    if (currentAdminTab === 'players') loadAdminPlayers();
    else if (currentAdminTab === 'pairings') loadPairings(pairingCurrentRound);
    else if (currentAdminTab === 'results') loadAdminRound(adminCurrentRound);
    else if (currentAdminTab === 'history') loadResultHistory();
}

// ========================
// Authentication
// ========================

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!username || !password) {
        errorEl.textContent = 'Please enter both username and password';
        errorEl.style.display = 'block';
        return;
    }

    adminLogin(username, password).then(user => {
        if (user) {
            adminLoggedIn = true;
            adminUser = user;
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('adminPanel').classList.add('visible');
            errorEl.style.display = 'none';

            // Initialize tournament UI
            updateAdminTournamentUI();

            // Initialize all admin sections
            loadAdminPlayers();
            loadPairings(pairingCurrentRound);
            loadAdminRound(adminCurrentRound);
            loadResultHistory();
        } else {
            errorEl.textContent = 'Invalid username or password';
            errorEl.style.display = 'block';
        }
    }).catch(err => {
        console.error('Login error:', err);
        errorEl.textContent = 'Login failed. Please try again.';
        errorEl.style.display = 'block';
    });
}

function handleLogout() {
    adminLoggedIn = false;
    adminUser = null;
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminPanel').classList.remove('visible');
    const pwdInput = document.getElementById('password');
    if (pwdInput) {
        pwdInput.value = '';
        pwdInput.type = 'password';
    }
    const userInput = document.getElementById('username');
    if (userInput) userInput.value = '';
}

// Toggle password visibility
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const showIcon = btn.querySelector('.eye-show');
    const hideIcon = btn.querySelector('.eye-hide');
    if (showIcon && hideIcon) {
        showIcon.style.display = isPassword ? 'none' : 'block';
        hideIcon.style.display = isPassword ? 'block' : 'none';
    }
    btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
}

// Handle Enter key on login form
document.getElementById('password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// ========================
// Navigation Subtabs
// ========================

function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    document.querySelectorAll('.admin-subnav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`sec-${tabName}`);
    if (activeSec) activeSec.classList.add('active');

    if (tabName === 'players') loadAdminPlayers();
    else if (tabName === 'pairings') loadPairings(pairingCurrentRound);
    else if (tabName === 'results') loadAdminRound(adminCurrentRound);
    else if (tabName === 'history') loadResultHistory();
}

// ==============================================
// 1. PLAYER MANAGEMENT LOGIC
// ==============================================

async function loadAdminPlayers() {
    const tbody = document.getElementById('adminPlayersTableBody');
    try {
        await purgeInactiveParticipants();
        const players = await getParticipants(currentTournamentId);
        allPlayersList = players || [];

        document.getElementById('playerCountBadge').textContent = `${allPlayersList.length} Players`;
        renderPlayersTable(allPlayersList);
        populatePlayerDropdowns();
    } catch (err) {
        console.error('Error loading players:', err);
        tbody.innerHTML = `<tr><td colspan="5" class="error-state">Failed to load players</td></tr>`;
    }
}

function renderPlayersTable(players) {
    const tbody = document.getElementById('adminPlayersTableBody');
    if (players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>No players found</p></td></tr>`;
        return;
    }

    tbody.innerHTML = players.map(p => `
        <tr>
            <td><strong style="color: var(--blue-400); font-family: monospace;">${p.roll_no || p.player_id}</strong></td>
            <td><span class="badge badge-branch">${p.branch || '—'}</span></td>
            <td><strong>${p.player_name}</strong></td>
            <td><span class="badge badge-completed">Active</span></td>
            <td style="text-align: right;">
                <div class="table-actions">
                    <button class="action-btn action-btn-edit" title="Edit ${p.player_name}" onclick="openEditPlayerModal('${p.id}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button class="action-btn action-btn-delete" title="Delete ${p.player_name}" onclick="promptDeletePlayer('${p.id}', '${p.player_name}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        <span>Delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterAdminPlayers() {
    const q = document.getElementById('playerSearchInput').value.toLowerCase().trim();
    if (!q) {
        renderPlayersTable(allPlayersList);
        return;
    }
    const filtered = allPlayersList.filter(p =>
        p.player_name.toLowerCase().includes(q) ||
        (p.roll_no && p.roll_no.toLowerCase().includes(q)) ||
        (p.branch && p.branch.toLowerCase().includes(q)) ||
        (p.player_id && p.player_id.toLowerCase().includes(q))
    );
    renderPlayersTable(filtered);
}

// Add Player Modal
function openAddPlayerModal() {
    document.getElementById('newPlayerName').value = '';
    const nextNum = allPlayersList.length + 1;
    document.getElementById('newRollNo').value = `P${String(nextNum).padStart(3, '0')}`;
    const branchSelect = document.getElementById('newPlayerBranch');
    if (branchSelect) branchSelect.value = '';

    const tournamentInfo = getTournamentInfo(currentTournamentId);
    const notice = document.getElementById('addPlayerTournamentNotice');
    if (notice) {
        notice.innerHTML = `Adding player to: <strong>${tournamentInfo.name}</strong>`;
    }

    document.getElementById('addPlayerModal').classList.add('visible');
    document.getElementById('newPlayerName').focus();
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').classList.remove('visible');
}

async function handleAddPlayerSubmit() {
    const name = document.getElementById('newPlayerName').value.trim();
    const rollNo = document.getElementById('newRollNo').value.trim();
    const branch = document.getElementById('newPlayerBranch')?.value || null;

    if (!name || !rollNo) {
        showToast('Please enter both Player Name and Roll-No', true);
        return;
    }

    try {
        await addParticipant(currentTournamentId, {
            player_name: name,
            roll_no: rollNo,
            branch: branch
        });
        showToast(`Player "${name}" added successfully!`);
        closeAddPlayerModal();
        loadAdminPlayers();
    } catch (err) {
        console.error('Error adding player:', err);
        showToast('Failed to add player: ' + (err.message || ''), true);
    }
}

// Edit Player Modal
function openEditPlayerModal(id) {
    const p = allPlayersList.find(x => x.id === id);
    if (!p) return;

    document.getElementById('editPlayerRecordId').value = p.id;
    document.getElementById('editPlayerName').value = p.player_name;
    document.getElementById('editRollNo').value = p.roll_no || p.player_id || '';
    const branchSelect = document.getElementById('editPlayerBranch');
    if (branchSelect) branchSelect.value = p.branch || '';
    document.getElementById('editPlayerModal').classList.add('visible');
}

function closeEditPlayerModal() {
    document.getElementById('editPlayerModal').classList.remove('visible');
}

async function handleEditPlayerSubmit() {
    const id = document.getElementById('editPlayerRecordId').value;
    const name = document.getElementById('editPlayerName').value.trim();
    const rollNo = document.getElementById('editRollNo').value.trim();
    const branch = document.getElementById('editPlayerBranch')?.value || null;

    if (!name || !rollNo) {
        showToast('Please enter both name and Roll-No', true);
        return;
    }

    try {
        await updateParticipant(id, {
            player_name: name,
            roll_no: rollNo,
            branch: branch
        });
        showToast('Player updated successfully!');
        closeEditPlayerModal();
        loadAdminPlayers();
    } catch (err) {
        console.error('Error updating player:', err);
        showToast('Failed to update player: ' + (err.message || ''), true);
    }
}

function promptDeletePlayer(id, name) {
    document.getElementById('confirmTitle').textContent = '🗑️ Delete Player';
    document.getElementById('confirmMessage').innerHTML = `Are you sure you want to completely remove <strong>${name}</strong>? All their matches and records will be permanently deleted from the database.`;

    pendingActionCallback = async () => {
        try {
            await deleteParticipant(id);
            showToast(`Player "${name}" and all their records have been completely removed.`);
            await loadAdminPlayers();
            loadPairings(pairingCurrentRound);
            loadAdminRound(adminCurrentRound);
        } catch (err) {
            console.error('Error deleting player:', err);
            showToast('Failed to delete player', true);
        }
    };

    document.getElementById('confirmModal').classList.add('visible');
}

// ==============================================
// 2. MATCH PAIRING SYSTEM LOGIC
// ==============================================

function selectPairingRound(roundNumber) {
    pairingCurrentRound = roundNumber;
    document.querySelectorAll('#pairingRoundTabs .round-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.round) === roundNumber);
    });
    document.getElementById('currentPairingRoundTitle').textContent = `Round ${roundNumber}`;
    loadPairings(roundNumber);
}

async function refreshTournamentMatchesCache() {
    try {
        allTournamentMatchesCache = await getAllMatches(currentTournamentId) || [];
    } catch (e) {
        console.warn('Failed to cache tournament matches:', e);
        allTournamentMatchesCache = [];
    }
}

function populatePlayerDropdowns(roundMatches = currentRoundMatches) {
    const whiteSelect = document.getElementById('pairingWhitePlayer');
    const blackSelect = document.getElementById('pairingBlackPlayer');
    if (!whiteSelect || !blackSelect) return;

    // Track players already paired in this specific round
    const pairedInRoundMap = new Map();
    (roundMatches || []).forEach(m => {
        if (m.white_player_id) {
            pairedInRoundMap.set(m.white_player_id, {
                match_number: m.match_number,
                color: 'White',
                opponent: m.black_player?.player_name || 'Black'
            });
        }
        if (m.black_player_id) {
            pairedInRoundMap.set(m.black_player_id, {
                match_number: m.match_number,
                color: 'Black',
                opponent: m.white_player?.player_name || 'White'
            });
        }
    });

    const availablePlayers = allPlayersList.filter(p => !pairedInRoundMap.has(p.id));
    const alreadyPairedPlayers = allPlayersList.filter(p => pairedInRoundMap.has(p.id));

    // Update availability counter in UI
    const availCountEl = document.getElementById('availPlayersCount');
    if (availCountEl) {
        availCountEl.textContent = `${availablePlayers.length} / ${allPlayersList.length}`;
    }

    const currentWhiteVal = whiteSelect.value;
    const currentBlackVal = blackSelect.value;

    function buildOptionsHtml(selectedId) {
        let html = '';
        if (availablePlayers.length > 0) {
            html += `<optgroup label="Available Players (${availablePlayers.length})">`;
            availablePlayers.forEach(p => {
                const isSelected = p.id === selectedId ? 'selected' : '';
                html += `<option value="${p.id}" ${isSelected}>${p.player_name} (${p.roll_no || p.player_id}${p.branch ? ' · ' + p.branch : ''})</option>`;
            });
            html += `</optgroup>`;
        } else {
            html += `<optgroup label="Available Players (0)"><option value="" disabled>All registered players are paired in this round</option></optgroup>`;
        }

        if (alreadyPairedPlayers.length > 0) {
            html += `<optgroup label="Already Paired in Round ${pairingCurrentRound} (${alreadyPairedPlayers.length})">`;
            alreadyPairedPlayers.forEach(p => {
                const info = pairedInRoundMap.get(p.id);
                html += `<option value="${p.id}" disabled style="color: var(--white-40);">🔒 ${p.player_name} (${p.roll_no || p.player_id}) — Board #${info.match_number} (${info.color})</option>`;
            });
            html += `</optgroup>`;
        }
        return html;
    }

    whiteSelect.innerHTML = `<option value="">Select White Player</option>` + buildOptionsHtml(currentWhiteVal);
    blackSelect.innerHTML = `<option value="">Select Black Player</option>` + buildOptionsHtml(currentBlackVal);

    // If an already paired player was previously selected, clear selection
    if (currentWhiteVal && pairedInRoundMap.has(currentWhiteVal)) whiteSelect.value = '';
    if (currentBlackVal && pairedInRoundMap.has(currentBlackVal)) blackSelect.value = '';

    checkPairingSelectionConflict();
}

function checkPairingSelectionConflict() {
    const whiteSelect = document.getElementById('pairingWhitePlayer');
    const blackSelect = document.getElementById('pairingBlackPlayer');
    const noticeEl = document.getElementById('pairingConflictNotice');
    const btnAdd = document.getElementById('btnAddPairing');
    if (!whiteSelect || !blackSelect) return;

    const whiteId = whiteSelect.value;
    const blackId = blackSelect.value;

    if (!noticeEl) return;

    // Reset notice
    noticeEl.style.display = 'none';
    noticeEl.textContent = '';
    if (btnAdd) btnAdd.disabled = false;

    if (!whiteId && !blackId) return;

    const whitePlayer = allPlayersList.find(p => p.id === whiteId);
    const blackPlayer = allPlayersList.find(p => p.id === blackId);

    // 1. Same player selected as White and Black
    if (whiteId && blackId && whiteId === blackId) {
        noticeEl.innerHTML = `⚠️ <strong>Invalid Pairing:</strong> A player cannot play against themselves!`;
        noticeEl.style.display = 'block';
        if (btnAdd) btnAdd.disabled = true;
        return;
    }

    // 2. White player already paired in this round
    if (whiteId) {
        const whiteInMatch = currentRoundMatches.find(m => m.white_player_id === whiteId || m.black_player_id === whiteId);
        if (whiteInMatch) {
            noticeEl.innerHTML = `⚠️ <strong>Round Conflict:</strong> ${whitePlayer?.player_name || 'White player'} is already paired in Round ${pairingCurrentRound} on Board #${whiteInMatch.match_number}!`;
            noticeEl.style.display = 'block';
            if (btnAdd) btnAdd.disabled = true;
            return;
        }
    }

    // 3. Black player already paired in this round
    if (blackId) {
        const blackInMatch = currentRoundMatches.find(m => m.white_player_id === blackId || m.black_player_id === blackId);
        if (blackInMatch) {
            noticeEl.innerHTML = `⚠️ <strong>Round Conflict:</strong> ${blackPlayer?.player_name || 'Black player'} is already paired in Round ${pairingCurrentRound} on Board #${blackInMatch.match_number}!`;
            noticeEl.style.display = 'block';
            if (btnAdd) btnAdd.disabled = true;
            return;
        }
    }

    // 4. Have these two players already played each other in this tournament?
    if (whiteId && blackId && allTournamentMatchesCache.length > 0) {
        const previousH2H = allTournamentMatchesCache.find(m =>
            (m.white_player_id === whiteId && m.black_player_id === blackId) ||
            (m.white_player_id === blackId && m.black_player_id === whiteId)
        );
        if (previousH2H) {
            noticeEl.innerHTML = `⚠️ <strong>Tournament Rule:</strong> ${whitePlayer?.player_name || 'White'} and ${blackPlayer?.player_name || 'Black'} have already played each other in Round ${previousH2H.round_number} (Board #${previousH2H.match_number})!`;
            noticeEl.style.display = 'block';
            if (btnAdd) btnAdd.disabled = true;
            return;
        }
    }
}

async function loadPairings(roundNumber) {
    const tbody = document.getElementById('roundPairingsTableBody');
    try {
        const matches = await getMatchesByRound(currentTournamentId, roundNumber);
        currentRoundMatches = matches || [];

        // Refresh tournament-wide matches cache
        await refreshTournamentMatchesCache();

        document.getElementById('roundPairingCount').textContent = `${currentRoundMatches.length} Matches`;

        // Suggest next unused board number
        const existingBoards = currentRoundMatches.map(m => m.match_number);
        let nextBoard = 1;
        while (existingBoards.includes(nextBoard)) {
            nextBoard++;
        }
        document.getElementById('pairingBoardNum').value = nextBoard;

        // Populate dropdowns with updated available vs already paired statuses
        populatePlayerDropdowns(currentRoundMatches);

        if (currentRoundMatches.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><p>No pairings created for Round ${roundNumber} yet</p></td></tr>`;
            return;
        }

        tbody.innerHTML = currentRoundMatches.map(m => `
            <tr>
                <td><strong style="color: var(--blue-400);">Board #${m.match_number}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="player-color-dot white-piece"></span>
                        <span><strong>${m.white_player?.player_name || '—'}</strong> (${m.white_player?.roll_no || m.white_player?.player_id || ''})</span>
                    </div>
                </td>
                <td style="text-align: center; color: var(--white-30); font-weight: 700;">VS</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="player-color-dot black-piece"></span>
                        <span><strong>${m.black_player?.player_name || '—'}</strong> (${m.black_player?.roll_no || m.black_player?.player_id || ''})</span>
                    </div>
                </td>
                <td><span class="badge ${m.status === 'completed' ? 'badge-completed' : 'badge-pending'}">${m.status}</span></td>
                <td><span class="badge ${m.is_published ? 'badge-win' : 'badge-upcoming'}">${m.is_published ? 'Published' : 'Draft'}</span></td>
                <td>
                    <button class="action-btn action-btn-edit" title="Change paired players or names" onclick="openEditPairingModal('${m.id}')" style="color: var(--blue-400); border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.08); padding: 5px 11px; gap: 6px; font-size: 0.8rem;">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Change Pair</span>
                    </button>
                </td>
                <td style="text-align: right;">
                    <div class="table-actions">
                        <button class="action-btn action-btn-edit" title="Swap White/Black Pieces" onclick="handleSwapPairingColors('${m.id}', '${m.white_player_id}', '${m.black_player_id}')">
                            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m16 3 4 4-4 4"></path>
                                <path d="M20 7H4"></path>
                                <path d="m8 21-4-4 4-4"></path>
                                <path d="M4 17h16"></path>
                            </svg>
                            <span>Swap</span>
                        </button>
                        <button class="action-btn action-btn-delete" title="Delete Pairing #${m.match_number}" onclick="promptDeletePairing('${m.id}', ${m.match_number})">
                            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error loading pairings:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="error-state">Failed to load pairings</td></tr>`;
    }
}

async function handleCreatePairing() {
    const boardInput = document.getElementById('pairingBoardNum');
    const boardNum = parseInt(boardInput.value);
    const whiteSelect = document.getElementById('pairingWhitePlayer');
    const blackSelect = document.getElementById('pairingBlackPlayer');
    const whiteId = whiteSelect.value;
    const blackId = blackSelect.value;

    if (!boardNum || boardNum <= 0) {
        showToast('Please enter a valid Board # (1 or higher)', true);
        return;
    }

    if (!whiteId || !blackId) {
        showToast('Please select both White and Black players', true);
        return;
    }

    if (whiteId === blackId) {
        showToast('A player cannot play against themselves! Choose different players.', true);
        return;
    }

    const whitePlayer = allPlayersList.find(p => p.id === whiteId);
    const blackPlayer = allPlayersList.find(p => p.id === blackId);
    const whiteName = whitePlayer ? whitePlayer.player_name : 'White player';
    const blackName = blackPlayer ? blackPlayer.player_name : 'Black player';

    try {
        // Fetch fresh matches in this round to prevent race condition or duplicate pairings
        const freshRoundMatches = await getMatchesByRound(currentTournamentId, pairingCurrentRound);
        currentRoundMatches = freshRoundMatches || [];

        // 1. Check if board number is already used in this round
        const boardConflict = currentRoundMatches.find(m => m.match_number === boardNum);
        if (boardConflict) {
            showToast(`Board #${boardNum} already exists in Round ${pairingCurrentRound}. Please choose a different board number.`, true);
            return;
        }

        // 2. Check if White player is already paired in this round (as White OR Black)
        const whiteConflict = currentRoundMatches.find(m => m.white_player_id === whiteId || m.black_player_id === whiteId);
        if (whiteConflict) {
            showToast(`Cannot create pairing: ${whiteName} is already paired in Round ${pairingCurrentRound} (Board #${whiteConflict.match_number})! A player cannot be paired multiple times in the same round.`, true);
            populatePlayerDropdowns(currentRoundMatches);
            return;
        }

        // 3. Check if Black player is already paired in this round (as White OR Black)
        const blackConflict = currentRoundMatches.find(m => m.white_player_id === blackId || m.black_player_id === blackId);
        if (blackConflict) {
            showToast(`Cannot create pairing: ${blackName} is already paired in Round ${pairingCurrentRound} (Board #${blackConflict.match_number})! A player cannot be paired multiple times in the same round.`, true);
            populatePlayerDropdowns(currentRoundMatches);
            return;
        }

        // 4. Check if these two players have already faced each other in this tournament
        const freshAllMatches = await getAllMatches(currentTournamentId);
        allTournamentMatchesCache = freshAllMatches || [];
        const previousH2H = allTournamentMatchesCache.find(m =>
            (m.white_player_id === whiteId && m.black_player_id === blackId) ||
            (m.white_player_id === blackId && m.black_player_id === whiteId)
        );
        if (previousH2H) {
            showToast(`Cannot create pairing: ${whiteName} and ${blackName} have already played each other in Round ${previousH2H.round_number} (Board #${previousH2H.match_number})! In tournament rules, players cannot play each other twice.`, true);
            return;
        }

        // 5. Create match in DB
        await createMatch({
            tournament_id: currentTournamentId,
            round_number: pairingCurrentRound,
            match_number: boardNum,
            white_player_id: whiteId,
            black_player_id: blackId,
            is_published: true
        });

        showToast(`Board #${boardNum} pairing created: ${whiteName} vs ${blackName}!`);

        // Reset selections
        whiteSelect.value = '';
        blackSelect.value = '';

        await loadPairings(pairingCurrentRound);
    } catch (err) {
        console.error('Error creating pairing:', err);
        showToast('Failed to create pairing: ' + (err.message || ''), true);
    }
}

async function handleSwapPairingColors(matchId, currentWhiteId, currentBlackId) {
    try {
        await updateMatchPairing(matchId, {
            white_player_id: currentBlackId,
            black_player_id: currentWhiteId
        });
        showToast('Player colors swapped (⇄)');
        loadPairings(pairingCurrentRound);
    } catch (err) {
        console.error('Error swapping colors:', err);
        showToast('Failed to swap colors', true);
    }
}

function promptDeletePairing(matchId, boardNum) {
    document.getElementById('confirmTitle').textContent = '🗑️ Delete Match Pairing';
    document.getElementById('confirmMessage').innerHTML = `Are you sure you want to remove Board #${boardNum} in Round ${pairingCurrentRound}?`;

    pendingActionCallback = async () => {
        try {
            await deleteMatch(matchId);
            showToast(`Board #${boardNum} removed.`);
            loadPairings(pairingCurrentRound);
        } catch (err) {
            console.error('Error deleting match:', err);
            showToast('Failed to delete match', true);
        }
    };

    document.getElementById('confirmModal').classList.add('visible');
}

async function togglePublishCurrentRound(isPublished) {
    try {
        await setRoundPublication(currentTournamentId, pairingCurrentRound, isPublished);
        showToast(`Round ${pairingCurrentRound} pairings are now ${isPublished ? 'PUBLIC' : 'UNPUBLISHED (Draft)'}!`);
        loadPairings(pairingCurrentRound);
    } catch (err) {
        console.error('Error publishing round:', err);
        showToast('Failed to update publication status', true);
    }
}

// ==============================================
// EDIT / CHANGE PAIRING MODAL LOGIC
// ==============================================

function openEditPairingModal(matchId) {
    const match = currentRoundMatches.find(m => m.id === matchId);
    if (!match) return;

    document.getElementById('editPairingMatchId').value = matchId;
    document.getElementById('editPairingBoardNumDisplay').textContent = match.match_number;

    const whiteSelect = document.getElementById('editPairingWhiteSelect');
    const blackSelect = document.getElementById('editPairingBlackSelect');
    const whiteNameInput = document.getElementById('editPairingWhiteCustomName');
    const blackNameInput = document.getElementById('editPairingBlackCustomName');

    // In this round, players in other matches are busy; current match's players are available
    const busyInOtherMatches = new Set();
    currentRoundMatches.forEach(m => {
        if (m.id !== matchId) {
            if (m.white_player_id) busyInOtherMatches.add(m.white_player_id);
            if (m.black_player_id) busyInOtherMatches.add(m.black_player_id);
        }
    });

    const availablePlayers = allPlayersList.filter(p => !busyInOtherMatches.has(p.id));
    const busyPlayers = allPlayersList.filter(p => busyInOtherMatches.has(p.id));

    const buildOptions = (selectedId) => {
        let html = '<option value="">Select Player</option>';
        if (availablePlayers.length > 0) {
            html += `<optgroup label="Available Players (${availablePlayers.length})">`;
            availablePlayers.forEach(p => {
                const isSelected = p.id === selectedId ? 'selected' : '';
                html += `<option value="${p.id}" ${isSelected}>${p.player_name} (${p.roll_no || p.player_id}${p.branch ? ' · ' + p.branch : ''})</option>`;
            });
            html += `</optgroup>`;
        }
        if (busyPlayers.length > 0) {
            html += `<optgroup label="Playing on Other Boards (${busyPlayers.length})">`;
            busyPlayers.forEach(p => {
                html += `<option value="${p.id}" disabled style="color: var(--white-40);">🔒 ${p.player_name} (${p.roll_no || p.player_id})</option>`;
            });
            html += `</optgroup>`;
        }
        return html;
    };

    whiteSelect.innerHTML = buildOptions(match.white_player_id);
    blackSelect.innerHTML = buildOptions(match.black_player_id);

    whiteNameInput.value = match.white_player?.player_name || '';
    blackNameInput.value = match.black_player?.player_name || '';

    document.getElementById('editPairingModal').classList.add('visible');
}

function closeEditPairingModal() {
    const modal = document.getElementById('editPairingModal');
    if (modal) modal.classList.remove('visible');
}

function onEditPairingWhiteChange() {
    const whiteId = document.getElementById('editPairingWhiteSelect').value;
    const player = allPlayersList.find(p => p.id === whiteId);
    if (player) {
        document.getElementById('editPairingWhiteCustomName').value = player.player_name;
    }
}

function onEditPairingBlackChange() {
    const blackId = document.getElementById('editPairingBlackSelect').value;
    const player = allPlayersList.find(p => p.id === blackId);
    if (player) {
        document.getElementById('editPairingBlackCustomName').value = player.player_name;
    }
}

async function handleEditPairingSubmit() {
    const matchId = document.getElementById('editPairingMatchId').value;
    const whiteId = document.getElementById('editPairingWhiteSelect').value;
    const blackId = document.getElementById('editPairingBlackSelect').value;
    const whiteName = document.getElementById('editPairingWhiteCustomName').value.trim();
    const blackName = document.getElementById('editPairingBlackCustomName').value.trim();

    if (!whiteId || !blackId) {
        showToast('Please select both White and Black players', true);
        return;
    }

    if (whiteId === blackId) {
        showToast('A player cannot play against themselves! Choose different players.', true);
        return;
    }

    const match = currentRoundMatches.find(m => m.id === matchId);
    const boardNum = match ? match.match_number : '';

    try {
        // 1. Update match pairing players
        await updateMatchPairing(matchId, {
            white_player_id: whiteId,
            black_player_id: blackId
        });

        // 2. If White player name was modified, update participant in database
        const whitePlayer = allPlayersList.find(p => p.id === whiteId);
        if (whiteName && whitePlayer && whitePlayer.player_name !== whiteName) {
            await updateParticipant(whiteId, { player_name: whiteName });
        }

        // 3. If Black player name was modified, update participant in database
        const blackPlayer = allPlayersList.find(p => p.id === blackId);
        if (blackName && blackPlayer && blackPlayer.player_name !== blackName) {
            await updateParticipant(blackId, { player_name: blackName });
        }

        showToast(`Board #${boardNum} pair and player names updated successfully!`);
        closeEditPairingModal();

        // Refresh all relevant sections
        await loadAdminPlayers();
        await loadPairings(pairingCurrentRound);
        if (currentAdminTab === 'results') loadAdminRound(adminCurrentRound);
    } catch (err) {
        console.error('Error updating pairing:', err);
        showToast('Failed to update pairing: ' + (err.message || ''), true);
    }
}

// ==============================================
// 3. RESULT MANAGEMENT LOGIC
// ==============================================

function adminSelectRound(roundNumber) {
    adminCurrentRound = roundNumber;
    document.querySelectorAll('#adminRoundTabs .round-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.round) === roundNumber);
    });
    loadAdminRound(roundNumber);
}

async function loadAdminRound(roundNumber) {
    const container = document.getElementById('adminMatchesList');
    container.innerHTML = `<div class="loading"><div class="spinner"></div><span>Loading matches...</span></div>`;

    try {
        const matches = await getMatchesByRound(currentTournamentId, roundNumber);

        if (matches.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">♟</div>
                    <p>No matches scheduled for Round ${roundNumber}. Go to the <strong>Match Pairings</strong> tab to create pairings first.</p>
                </div>`;
            return;
        }

        container.innerHTML = matches.map(m => renderAdminMatchCard(m, roundNumber)).join('');

    } catch (err) {
        console.error('Error loading admin matches:', err);
        container.innerHTML = `<div class="error-state">❌ Failed to load matches</div>`;
    }
}

function renderAdminMatchCard(match, roundNumber) {
    const resultOptions = ['pending', 'white_wins', 'draw', 'black_wins'];
    const resultLabels = {
        'pending': '⏳ Pending',
        'white_wins': '♔ White Wins (2 – 0)',
        'draw': '½ Draw (1 – 1)',
        'black_wins': '♚ Black Wins (0 – 2)'
    };

    const statusBadgeClass = match.status === 'completed' ? 'badge-completed' :
        match.status === 'in_progress' ? 'badge-in-progress' : 'badge-pending';

    return `
        <div class="match-admin-card" id="admin-match-${match.id}">
            <div class="match-admin-header">
                <div>
                    <strong style="color: var(--blue-400);">Match #${match.match_number}</strong>
                    <span style="color: var(--white-30); font-size: 0.8rem; margin-left: 8px;">Round ${roundNumber}</span>
                </div>
                <span class="badge ${statusBadgeClass}">${match.status}</span>
            </div>

            <div class="match-admin-players">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="player-color-dot white-piece" style="width:10px;height:10px;"></span>
                    <strong>${match.white_player?.player_name || '—'}</strong>
                    <span style="color: var(--white-30); font-size: 0.8rem;">(${match.white_player?.roll_no || match.white_player?.player_id || ''})</span>
                </div>
                <span class="vs">vs</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="player-color-dot black-piece" style="width:10px;height:10px;"></span>
                    <strong>${match.black_player?.player_name || '—'}</strong>
                    <span style="color: var(--white-30); font-size: 0.8rem;">(${match.black_player?.roll_no || match.black_player?.player_id || ''})</span>
                </div>
            </div>

            <div class="match-admin-controls" style="margin-top: 16px;">
                <label class="form-label" style="margin-bottom: 0; font-size: 0.8rem;">Result:</label>
                <select id="result-${match.id}" onchange="onResultChange('${match.id}')">
                    ${resultOptions.map(opt => `
                        <option value="${opt}" ${match.result === opt ? 'selected' : ''}>${resultLabels[opt]}</option>
                    `).join('')}
                </select>
                <button class="btn btn-primary btn-sm" onclick="saveResult('${match.id}', '${match.result}')">
                    💾 Save Result
                </button>
            </div>

            ${match.status === 'completed' ? `
                <div style="margin-top: 12px; font-size: 0.8rem; color: var(--white-30);">
                    Points: White <strong>${match.white_points} pt</strong> — <strong>${match.black_points} pt</strong> Black · 
                    ${getLeadText(match)} · 
                    Updated: ${formatTimestamp(match.updated_at)}
                </div>
            ` : ''}
        </div>
    `;
}

function onResultChange(matchId) {
    const card = document.getElementById(`admin-match-${matchId}`);
    if (card) {
        card.style.borderColor = 'var(--blue-500)';
        setTimeout(() => card.style.borderColor = '', 2000);
    }
}

async function saveResult(matchId, previousResult) {
    const selectEl = document.getElementById(`result-${matchId}`);
    const newResult = selectEl.value;

    if (newResult === previousResult) {
        showToast('No changes to save');
        return;
    }

    if (previousResult !== 'pending' && newResult !== previousResult) {
        document.getElementById('confirmTitle').textContent = '⚠️ Confirm Result Change';
        const msg = `You are changing this result from <strong>${formatResult(previousResult)}</strong> to <strong>${formatResult(newResult)}</strong>. This will recalculate all player standings and leaderboards. Continue?`;
        document.getElementById('confirmMessage').innerHTML = msg;

        pendingActionCallback = async () => {
            await doSaveResult(matchId, newResult);
        };

        document.getElementById('confirmModal').classList.add('visible');
        return;
    }

    await doSaveResult(matchId, newResult);
}

async function doSaveResult(matchId, result) {
    try {
        await updateMatchResult(matchId, result);
        showToast(`Result saved: ${formatResult(result)}`);
        loadAdminRound(adminCurrentRound);
        loadResultHistory();
    } catch (err) {
        console.error('Error saving result:', err);
        showToast('Failed to save result: ' + (err.message || ''), true);
    }
}

// Confirmation modal execution
async function confirmAction() {
    if (pendingActionCallback) {
        const cb = pendingActionCallback;
        pendingActionCallback = null;
        closeConfirmModal();
        await cb();
    } else {
        closeConfirmModal();
    }
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('visible');
    pendingActionCallback = null;
}

// ==============================================
// 4. RESULT HISTORY / AUDIT LOGIC
// ==============================================

async function loadResultHistory() {
    const container = document.getElementById('resultHistoryContainer');
    try {
        const history = await getResultHistory(currentTournamentId);

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <p>No result changes recorded yet</p>
                </div>`;
            return;
        }

        container.innerHTML = history.map(h => `
            <div class="history-item">
                <div class="history-icon">📝</div>
                <div class="history-details">
                    <div class="match-info">
                        Round ${h.round_number}: ${h.match?.white_player?.player_name || 'Unknown'} vs ${h.match?.black_player?.player_name || 'Unknown'}
                    </div>
                    <div class="change-info">
                        ${formatResult(h.previous_result)} → <strong>${formatResult(h.new_result)}</strong>
                    </div>
                    <div class="time-info">${formatTimestamp(h.changed_at)} · by ${h.admin_user_id || 'Admin'}</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading history:', err);
        container.innerHTML = `<div class="error-state">Failed to load history</div>`;
    }
}

// ========================
// Utilities
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
// Realtime Subscription
// ========================

subscribeToMatches((payload) => {
    if (adminLoggedIn) {
        if (currentAdminTab === 'pairings') loadPairings(pairingCurrentRound);
        if (currentAdminTab === 'results') loadAdminRound(adminCurrentRound);
        if (currentAdminTab === 'history') loadResultHistory();
    }
});
