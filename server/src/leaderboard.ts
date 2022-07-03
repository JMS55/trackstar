import { Place, Progress, Standing } from './types';

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
        this.board.forEach((_standing, player) => {
            this.addPlayer(player);
        });
    }

    /** Get the leaderboard with only active players included */
    getActive(): Map<string, Standing> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return new Map([...this.board].filter(([_player, standing]) => standing.active));
    }

    endRound() {
        this.board.forEach((standing) => {
            // with maps there's no better way to do this really and there's no real problem with it
            /* eslint-disable no-param-reassign */
            standing.score += standing.points_from_current_track;
            standing.points_from_current_track = 0;
            standing.progress = Progress.NONE;
            standing.place = Place.NONE;
            /* eslint-enable no-param-reassign */
        });
        this.completions = new Map();
    }

    updatePlayerRound(player: string, progress: Progress, time: number) {
        const boardPlayer = this.getPlayer(player)!;
        boardPlayer.points_from_current_track += 1;
        boardPlayer.progress = progress;
        if (boardPlayer.progress === Progress.BOTH) {
            this.complete(player, time);
        }
    }

    private complete(player: string, time: number) {
        this.completions.set(player, time);
        const keys = [...this.completions.entries()];
        keys.sort((a, b) => a[1] - b[1]);
        keys.filter((c) => this.board.get(c[0])!.active).forEach((completion, index) => {
            let place;
            let pointsFromCurrentTrack;
            switch (index) {
                case 0:
                    place = Place.FIRST;
                    pointsFromCurrentTrack = 6;
                    break;
                case 1:
                    place = Place.SECOND;
                    pointsFromCurrentTrack = 5;
                    break;
                case 2:
                    place = Place.THIRD;
                    pointsFromCurrentTrack = 4;
                    break;
                default:
                    place = Place.NONE;
                    pointsFromCurrentTrack = 2;
            }
            const standing = this.board.get(completion[0])!;
            standing.place = place;
            standing.points_from_current_track = pointsFromCurrentTrack;
        });
    }
}
