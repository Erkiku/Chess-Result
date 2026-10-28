// Supabase Configuration
const SUPABASE_URL = 'https://jemvinpaeukvmjhsecpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbXZpbnBhZXVrdm1qaHNlY3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMDI5NDksImV4cCI6MjEwODY3ODk0OX0.BDZsED845asgzekIb_x4zfjLwkmAXUEAGl2yGxETTgo';

// Initialize Supabase client (use `db` to avoid collision with window.supabase namespace)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================
// Tournament Functions
// ========================

async function getTournaments() {
    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

async function getTournament(id) {
    const { data, error } = await db
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

// ========================
// Participant Functions
// ========================

async function getParticipants(tournamentId) {
    const { data, error } = await db
        .from('participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true)
        .order('player_name');
    if (error) throw error;
    return data;
}

async function addParticipant(tournamentId, { player_name, roll_no, branch }) {
    const payload = {
        tournament_id: tournamentId,
        player_name: player_name.trim(),
        roll_no: roll_no.trim().toUpperCase(),
        branch: branch ? branch.trim() : null,
        is_active: true
    };
    const { data, error } = await db
        .from('participants')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateParticipant(id, { player_name, roll_no, branch }) {
    const updates = {};
    if (player_name) updates.player_name = player_name.trim();
    if (roll_no) updates.roll_no = roll_no.trim().toUpperCase();
    if (branch !== undefined) updates.branch = branch ? branch.trim() : null;

    const { data, error } = await db
        .from('participants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteParticipant(id) {
    try {
        // 1. Find all matches where this player participates (as white or black)
        const { data: matches } = await db
            .from('matches')
            .select('id')
            .or(`white_player_id.eq.${id},black_player_id.eq.${id}`);
        
        if (matches && matches.length > 0) {
            const matchIds = matches.map(m => m.id);
            
            // 2. Cascade delete result history for these matches
            await db
                .from('result_history')
                .delete()
                .in('match_id', matchIds);
            
            // 3. Cascade delete all matches involving this player
            await db
                .from('matches')
                .delete()
                .in('id', matchIds);
        }

        // 4. Completely and permanently delete participant from database
        const { data, error } = await db
            .from('participants')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { deleted: true, data };
    } catch (err) {
        console.error('Error during hard delete of participant:', err);
        throw err;
    }
}

// Purge any residual inactive or unregistered players and their orphaned records
async function purgeInactiveParticipants() {
    try {
        const { data: inactive } = await db
            .from('participants')
            .select('id')
            .eq('is_active', false);
        
        if (inactive && inactive.length > 0) {
            for (const p of inactive) {
                await deleteParticipant(p.id);
            }
        }
    } catch (err) {
        console.warn('Purge error:', err);
    }
}

// ========================
// Match Functions
// ========================

async function getMatchesByRound(tournamentId, roundNumber) {
    const { data, error } = await db
        .from('matches')
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no, branch),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no, branch)
        `)
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
        .order('match_number');
    if (error) throw error;
    // Only return matches where BOTH players are registered participants
    return (data || []).filter(m => m.white_player && m.black_player);
}

async function getAllMatches(tournamentId) {
    const { data, error } = await db
        .from('matches')
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no, branch),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no, branch)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number')
        .order('match_number');
    if (error) throw error;
    // Only return matches where BOTH players are registered participants
    return (data || []).filter(m => m.white_player && m.black_player);
}

async function createMatch({ tournament_id, round_number, match_number, white_player_id, black_player_id, is_published = true }) {
    const { data, error } = await db
        .from('matches')
        .insert([{
            tournament_id,
            round_number: parseInt(round_number),
            match_number: parseInt(match_number),
            white_player_id,
            black_player_id,
            result: 'pending',
            white_points: 0,
            black_points: 0,
            status: 'pending',
            is_published
        }])
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no)
        `)
        .single();
    if (error) throw error;
    return data;
}

async function updateMatchPairing(matchId, { white_player_id, black_player_id, match_number }) {
    const updates = {};
    if (white_player_id) updates.white_player_id = white_player_id;
    if (black_player_id) updates.black_player_id = black_player_id;
    if (match_number !== undefined) updates.match_number = parseInt(match_number);

    const { data, error } = await db
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no)
        `)
        .single();
    if (error) throw error;
    return data;
}

async function deleteMatch(matchId) {
    try {
        await db
            .from('result_history')
            .delete()
            .eq('match_id', matchId);

        const { data, error } = await db
            .from('matches')
            .delete()
            .eq('id', matchId);
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error deleting match:', err);
        throw err;
    }
}

async function setRoundPublication(tournamentId, roundNumber, isPublished) {
    const { data, error } = await db
        .from('matches')
        .update({ is_published: isPublished })
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber);
    if (error) throw error;
    return data;
}

async function setRoundStatus(tournamentId, roundNumber, status) {
    const { data, error } = await db
        .from('matches')
        .update({ status: status })
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
        .neq('status', 'completed');
    if (error) throw error;
    return data;
}

async function updateMatchResult(matchId, result) {
    const { data, error } = await db
        .from('matches')
        .update({ result: result, is_published: true })
        .eq('id', matchId)
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no, branch),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no, branch)
        `)
        .single();
    if (error) throw error;
    return data;
}

// ========================
// Leaderboard Functions
// ========================

async function getLeaderboard(tournamentId) {
    const matches = await getAllMatches(tournamentId);
    const participants = await getParticipants(tournamentId);

    const playerStats = {};
    participants.forEach(p => {
        playerStats[p.id] = {
            player_id: p.id,
            player_name: p.player_name,
            roll_no: p.roll_no,
            player_code: p.roll_no,
            branch: p.branch || null,
            total_points: 0,
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0
        };
    });

    matches.forEach(m => {
        if (m.status === 'completed') {
            // White player
            if (playerStats[m.white_player_id]) {
                playerStats[m.white_player_id].total_points += parseFloat(m.white_points);
                playerStats[m.white_player_id].matches_played++;
                if (m.result === 'white_wins') playerStats[m.white_player_id].wins++;
                else if (m.result === 'draw') playerStats[m.white_player_id].draws++;
                else playerStats[m.white_player_id].losses++;
            }
            // Black player
            if (playerStats[m.black_player_id]) {
                playerStats[m.black_player_id].total_points += parseFloat(m.black_points);
                playerStats[m.black_player_id].matches_played++;
                if (m.result === 'black_wins') playerStats[m.black_player_id].wins++;
                else if (m.result === 'draw') playerStats[m.black_player_id].draws++;
                else playerStats[m.black_player_id].losses++;
            }
        }
    });

    // Sort: players who played at least 1 match first by points desc, then players with 0 matches
    const sorted = Object.values(playerStats).sort((a, b) => {
        if (a.matches_played > 0 && b.matches_played === 0) return -1;
        if (a.matches_played === 0 && b.matches_played > 0) return 1;
        return b.total_points - a.total_points;
    });

    let currentRank = 1;
    sorted.forEach(p => {
        if (p.matches_played >= 1) {
            p.rank = currentRank++;
        } else {
            p.rank = null;
        }
    });

    return sorted;
}

// ========================
// Round Standings
// ========================

async function getRoundStandings(tournamentId, roundNumber) {
    const allMatches = await getAllMatches(tournamentId);
    const participants = await getParticipants(tournamentId);

    const standings = {};
    participants.forEach(p => {
        standings[p.id] = {
            player_id: p.id,
            player_name: p.player_name,
            roll_no: p.roll_no,
            player_code: p.roll_no,
            branch: p.branch || null,
            round_points: 0,
            round_matches_played: 0,
            rank: null
        };
    });

    // Calculate round points & round games played
    allMatches.forEach(m => {
        if (m.status === 'completed' && m.round_number === roundNumber) {
            if (standings[m.white_player_id]) {
                standings[m.white_player_id].round_points += parseFloat(m.white_points);
                standings[m.white_player_id].round_matches_played++;
            }
            if (standings[m.black_player_id]) {
                standings[m.black_player_id].round_points += parseFloat(m.black_points);
                standings[m.black_player_id].round_matches_played++;
            }
        }
    });

    // Sort: players who played at least 1 match in this round first by round_points desc, then unplayed
    const sorted = Object.values(standings).sort((a, b) => {
        if (a.round_matches_played > 0 && b.round_matches_played === 0) return -1;
        if (a.round_matches_played === 0 && b.round_matches_played > 0) return 1;
        return b.round_points - a.round_points;
    });

    // Only assign round rank if the player played at least one game in this round; otherwise rank is null
    let currentRoundRank = 1;
    sorted.forEach(s => {
        if (s.round_matches_played >= 1) {
            s.rank = currentRoundRank++;
        } else {
            s.rank = null;
        }
    });

    return sorted;
}

// ========================
// Result History
// ========================

async function getResultHistory(tournamentId) {
    const { data, error } = await db
        .from('result_history')
        .select(`
            *,
            match:matches!result_history_match_id_fkey(
                id, round_number, match_number, tournament_id,
                white_player:participants!matches_white_player_id_fkey(player_name),
                black_player:participants!matches_black_player_id_fkey(player_name)
            )
        `)
        .order('changed_at', { ascending: false })
        .limit(20);
    if (error) throw error;
    // Filter by tournament
    return (data || []).filter(h => h.match && h.match.tournament_id === tournamentId);
}

// ========================
// Admin Auth
// ========================

async function adminLogin(username, password) {
    const { data, error } = await db
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .single();
    if (error || !data) return null;
    return data;
}

// ========================
// Realtime Subscription
// ========================

function subscribeToMatches(callback) {
    return db
        .channel('matches-changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'matches'
        }, (payload) => {
            callback(payload);
        })
        .subscribe();
}

// ========================
// Utility Functions
// ========================

function formatResult(result) {
    switch (result) {
        case 'white_wins': return 'White Wins';
        case 'black_wins': return 'Black Wins';
        case 'draw': return 'Draw';
        case 'pending': return 'Pending';
        default: return result;
    }
}

function getLeadText(match) {
    if (match.result === 'pending' || match.status !== 'completed') {
        return 'Result pending';
    }
    if (match.result === 'draw') {
        return 'Level — 1 each';
    }
    const wp = parseFloat(match.white_points);
    const bp = parseFloat(match.black_points);
    const lead = Math.abs(wp - bp);
    if (wp > bp) {
        return `${match.white_player.player_name} leads by ${lead} match point${lead === 1 ? '' : 's'}`;
    } else {
        return `${match.black_player.player_name} leads by ${lead} match point${lead === 1 ? '' : 's'}`;
    }
}

function getWinner(match) {
    if (match.result === 'white_wins') return match.white_player.player_name;
    if (match.result === 'black_wins') return match.black_player.player_name;
    if (match.result === 'draw') return 'Draw';
    return '—';
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Default tournament ID (first tournament)
const DEFAULT_TOURNAMENT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
