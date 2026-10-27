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

async function addParticipant(tournamentId, { player_name, roll_no }) {
    const { data, error } = await db
        .from('participants')
        .insert([{
            tournament_id: tournamentId,
            player_name: player_name.trim(),
            roll_no: roll_no.trim().toUpperCase(),
            is_active: true
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateParticipant(id, { player_name, roll_no }) {
    const updates = {};
    if (player_name) updates.player_name = player_name.trim();
    if (roll_no) updates.roll_no = roll_no.trim().toUpperCase();

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
    const { data: matches, error: checkError } = await db
        .from('matches')
        .select('id')
        .or(`white_player_id.eq.${id},black_player_id.eq.${id}`);
    
    if (matches && matches.length > 0) {
        const { data, error } = await db
            .from('participants')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { softDeleted: true, data };
    } else {
        const { data, error } = await db
            .from('participants')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { deleted: true, data };
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
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no)
        `)
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
        .order('match_number');
    if (error) throw error;
    return data;
}

async function getAllMatches(tournamentId) {
    const { data, error } = await db
        .from('matches')
        .select(`
            *,
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number')
        .order('match_number');
    if (error) throw error;
    return data;
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
    const { data, error } = await db
        .from('matches')
        .delete()
        .eq('id', matchId);
    if (error) throw error;
    return data;
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
            white_player:participants!matches_white_player_id_fkey(id, player_name, roll_no),
            black_player:participants!matches_black_player_id_fkey(id, player_name, roll_no)
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

    return Object.values(playerStats).sort((a, b) => b.total_points - a.total_points);
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
            round_points: 0
        };
    });

    // Calculate round points
    allMatches.forEach(m => {
        if (m.status === 'completed' && m.round_number === roundNumber) {
            if (standings[m.white_player_id]) {
                standings[m.white_player_id].round_points += parseFloat(m.white_points);
            }
            if (standings[m.black_player_id]) {
                standings[m.black_player_id].round_points += parseFloat(m.black_points);
            }
        }
    });

    const sorted = Object.values(standings).sort((a, b) => b.round_points - a.round_points);
    sorted.forEach((s, i) => s.rank = i + 1);
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
