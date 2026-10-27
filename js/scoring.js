// Scoring utility functions
// All score calculations derive from match results — never manually entered

/**
 * Calculate points from a match result
 */
function calculatePoints(result) {
    switch (result) {
        case 'white_wins': return { white: 2, black: 0 };
        case 'black_wins': return { white: 0, black: 2 };
        case 'draw': return { white: 1, black: 1 };
        default: return { white: 0, black: 0 };
    }
}

/**
 * Calculate round summary statistics
 */
function calculateRoundSummary(matches) {
    const total = matches.length;
    const completed = matches.filter(m => m.status === 'completed').length;
    const pending = total - completed;
    const whiteWins = matches.filter(m => m.result === 'white_wins').length;
    const blackWins = matches.filter(m => m.result === 'black_wins').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, whiteWins, blackWins, draws, completionPct };
}

/**
 * Determine the round status
 */
function getRoundStatus(matches) {
    if (matches.length === 0) return 'upcoming';
    const completed = matches.filter(m => m.status === 'completed').length;
    if (completed === matches.length) return 'completed';
    if (completed > 0) return 'in_progress';
    return 'upcoming';
}
