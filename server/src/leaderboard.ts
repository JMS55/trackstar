/** Leaderboard info for a specific player */
export interface Standing {
    score: number;
    points_from_current_track: number;
    progress: Progress;
    place: Place;
    active: boolean;
}

/** What a player has gotten correct so far */
export const enum Progress {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    BOTH = 'both_correct',
    NONE = 'none_correct',
}

/** Podium for who got both the title and artist in what order */
export const enum Place {
    FIRST = 'first',
    SECOND = 'second',
    THIRD = 'third',
    NONE = 'none',
}

/** Marker for the time a player gets both title and artist */
interface Completion {
    player: string;
    time: number;
}

export default class Leaderboard {
    board: Map<string, Standing> = new Map();
    completions: Map<string, number> = new Map();

    getPlayer(name: string): Standing | undefined {
        return this.board.get(name);
    }

    addPlayer(name: string) {
        this.board.set(name, {
            score: 0,
            points_from_current_track: 0,
            progress: Progress.NONE,
            place: Place.NONE,
            active: true,
        });
    }

    /** Reset the standings of all players in the leaderboard */
    resetLeaderboard() {
        for (const [player, _] of this.board) {
            this.addPlayer(player);
        }
    }

    /** Get the leaderboard with only active players included */
    getActive(): Map<string, Standing> {
        return new Map([...this.board].filter(([_player, standing]) => standing.active));
    }

    endRound() {
        this.board.forEach((standing) => {
            standing.score += standing.points_from_current_track;
            standing.points_from_current_track = 0;
            standing.progress = Progress.NONE;
            standing.place = Place.NONE;
        });
        this.completions = new Map();
    }

    updatePlayerRound(player: string, progress: Progress, time: number) {
        const boardPlayer = this.getPlayer(player)!;
        boardPlayer.points_from_current_track++;
        boardPlayer.progress = progress;
        if (boardPlayer.progress == Progress.BOTH) {
            this.complete(player, time);
        }
    }

    private complete(player: string, time: number) {
        this.completions.set(player, time);
        const keys = [...this.completions.entries()];
        keys.sort((a, b) => a[1] - b[1]);
        keys.filter((c) => this.board.get(c[0])!.active).forEach((completion, index) => {
            let place, points_from_current_track;
            switch (index) {
                case 0:
                    place = Place.FIRST;
                    points_from_current_track = 6;
                    break;
                case 1:
                    place = Place.SECOND;
                    points_from_current_track = 5;
                    break;
                case 2:
                    place = Place.THIRD;
                    points_from_current_track = 4;
                    break;
                default:
                    place = Place.NONE;
                    points_from_current_track = 2;
            }
            const standing = this.board.get(completion[0])!;
            standing.place = place;
            standing.points_from_current_track = points_from_current_track;
        });
    }
}
