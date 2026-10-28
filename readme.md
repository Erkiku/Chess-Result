# Feature Addition: Round-wise Chess Results & Lead Tracking

Integrate a new Round-wise Results page into the existing Chess Tournament Management System using HTML, CSS, Vanilla JavaScript, and Supabase.

Do not rebuild the project from scratch. Extend the existing application, database schema, admin panel, and real-time synchronization system.

## 1. New Page: round-results.html

Create a dedicated page named `round-results.html` and add a navigation link named "Round Results" to the public dashboard and admin dashboard.

The page must display results for all five tournament rounds.

### A. Round Navigation

Display five tabs or buttons:

- Round 1
- Round 2
- Round 3
- Round 4
- Round 5

When a user selects a round, display the matches and results for that round without reloading the page.

Show the round status:
- Upcoming
- In Progress
- Completed

Show the number of completed and pending matches for the selected round.

### B. Round-wise Match Results Table

Display the following columns:

| Match | White Player | Result | Black Player | Winner | Lead |
|---|---|---|---|---|---|

For each match, display:
- Match number.
- Both player names and player IDs.
- Match result.
- Winner or Draw.
- Points awarded to each player.
- Lead information.
- Match status.
- Last-updated timestamp.

Use these scoring rules:

- White wins: White 1 point, Black 0 points.
- Draw: White 0.5 points, Black 0.5 points.
- Black wins: White 0 points, Black 1 point.
- Pending: No points awarded.

For a decisive match, calculate the point lead as the difference between the two players' points in that match. Display "White leads by 1 point" or "Black leads by 1 point".

For a draw, display "Level — 0.5 each".

For a pending match, display "Result pending".

Important: A chess result does not normally use a numerical winning margin. Do not invent a lead such as "won by 3 points" unless an explicit tournament-specific scoring rule supports it. Show the actual match points and the lead accurately.

### C. Match Result Cards

In addition to the table, provide an attractive card layout for each match.

Example:

Match 01 · Round 2

**Rahul Kumar** — 1 point  
WINNER

vs.

Amit Sharma — 0 points

Result: White wins  
Lead: Rahul leads by 1 match point

For a draw, show both players with 0.5 points and a "DRAW" label.

For pending matches, display both player names and a "Pending" badge.

Use clear visual distinctions for wins, draws, and pending results.

### D. Round Summary

At the top of each selected round, show:
- Total matches.
- Completed matches.
- Pending matches.
- Total wins by White.
- Total wins by Black.
- Total draws.
- Round completion percentage.

Calculate completion percentage as:

(completed matches / total matches) × 100

Handle rounds with zero scheduled matches without division-by-zero errors. Do not mark a round completed until the required matches and any applicable bye handling are resolved.

### E. Round Standings

Below the match results, show the standings for the selected round.

Display:
- Player name.
- Points earned in the selected round.
- Cumulative points before the selected round.
- Cumulative points after the selected round.

Calculate all scores from valid completed match records. Do not allow administrators to manually enter aggregate points.

Clearly label the difference between:
1. Points earned in this round.
2. Cumulative tournament points.
3. Overall leaderboard position.

### F. Live Updates

Use Supabase Realtime with PostgreSQL Changes.

Subscribe to permitted match and tournament changes. When an administrator updates a result:

1. The database validates and saves the result.
2. The selected round's results refresh automatically.
3. The match cards update.
4. Round statistics and standings recalculate.
5. The overall leaderboard and Top 3 refresh.
6. The activity feed shows the latest published change.

Do not require a browser refresh.

Use appropriate RLS policies so public users only receive data they are authorized to view. Re-fetch fresh authorized results when a Realtime event arrives, and handle temporary connection failures.

## 2. Admin Panel Addition

Extend the existing `admin.html` with a new section named "Round Results Management".

### A. Round Selector

Allow the administrator to select Round 1 through Round 5.

When a round is selected, display all its matches and their current results.

### B. Update Match Result

For each match, provide:
- White player.
- Black player.
- Round number.
- Result selector.
- Save Result button.
- Edit Result button for corrections.
- Publish Result control if results are managed through a publication workflow.

Result selector options:
- Pending
- White Wins
- Draw
- Black Wins

Before saving, validate that:
- Both players exist and belong to the selected tournament.
- Both players are different.
- The match belongs to the selected round.
- No player has another match in the same round.
- The selected result is valid.
- The current user is an authorized tournament administrator.

Display a confirmation dialog before overwriting a previously published result.

### C. Automatic Score Calculation

Never ask the admin to manually enter the winning margin, total points, or cumulative points.

Derive match points from the selected outcome:
- White Wins → 1–0.
- Draw → 0.5–0.5.
- Black Wins → 0–1.

Recalculate the round standings and overall leaderboard using authoritative database records.

If an existing result is corrected, update all dependent standings consistently.

### D. Result History

Record:
- Match ID.
- Round number.
- Previous result.
- New result.
- Admin user ID.
- Change timestamp.

Show recent corrections to authorized administrators. Do not allow normal users to modify the audit history.

## 3. Supabase Database Integration

Reuse the existing `tournaments`, `participants`, and `matches` tables wherever possible.

Do not create a second source of truth for match scores.

Use the `matches` table as the authoritative record. Add missing fields or constraints through a migration only when necessary.

Ensure:
- Each match belongs to one tournament and one round.
- Player references are valid.
- A player cannot play multiple matches in one round.
- Result updates are validated server-side.
- Public access follows the configured publication policy.
- Authorized administrators can correct results securely.

Create or update database views/functions for round summaries and round standings if useful.

Do not expose private admin information through public views.

## 4. UI and Responsive Design

Use the existing project's dark chess-themed design:
- Dark navy background.
- Green accents.
- Gold winner highlights.
- Neutral draw styling.
- Grey pending styling.
- Clear player names and readable point values.
- Responsive tables and match cards.
- Mobile-friendly round navigation.
- Loading, empty, and error states.

Add links between:
- Main Leaderboard.
- Round Results.
- Admin Dashboard.

## 5. Required Files and Deliverables

Add:
- `round-results.html`
- `css/round-results.css`
- `js/round-results.js`

Update existing:
- `index.html`
- `admin.html`
- `js/supabase.js`
- `js/scoring.js`
- `js/admin.js`

Add SQL migrations only if the existing schema requires changes.

Implement the complete functionality, test all five rounds, verify result corrections, and confirm that changes appear automatically in both the public Round Results page and the main leaderboard.

Do not replace existing working features or leave core functions as placeholders.