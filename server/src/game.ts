import { getRandomUnplayedTrack, Track } from './tracks';
import { isCorrectTitle, isCorrectArtist } from './validation';

const enum Progress {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    BOTH = 'both_correct',
    NONE = 'none_correct'
}

const enum Place {
    FIRST = 'first',
    SECOND = 'second',
    THIRD = 'third',
    NONE = 'none'
}

export const enum GuessResult {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect'  //Includes case when player guesses something they already got right
}

export interface Standing {
    score: number
    points_from_current_track: number
    progress: Progress
    place: Place
}

interface Completion {
    player: string
    time: number
}

export class Game {
    tracks_per_round: number
    time_between_tracks: number
    current_track: Track | null
    current_track_number: number
    played_tracks: Set<Track>
    leaderboard: Map<string, Standing>
    completions: Array<Completion>

    constructor(tracks_per_round: number, time_between_tracks: number) {
        this.tracks_per_round = tracks_per_round;
        this.time_between_tracks = time_between_tracks;
        this.current_track = null;
        this.current_track_number = 1;
        this.played_tracks = new Set();
        this.leaderboard = new Map();
        this.completions = [];
    }

    addOrResetPlayer(player: string) {
        this.leaderboard.set(player, {
            score: 0,
            points_from_current_track: 0,
            progress: Progress.NONE,
            place: Place.NONE,
        });
    }

    deletePlayer(player: string) {
        this.leaderboard.delete(player);
    }

    resetLeaderboard() {
        for (var player in this.leaderboard.keys) {
            this.addOrResetPlayer(player);
        }
    }

    nextTrack() {
        const track = getRandomUnplayedTrack(this.played_tracks);
        this.current_track = track;
        this.current_track_number++;
        this.played_tracks.add(track);
        return track
    }

    processGuess(player: string, guess: string, time: number) {
        const standing = this.leaderboard.get(player)!;
        const progress = standing.progress;
        
        let result;
        if (progress == Progress.BOTH) {
            return GuessResult.INCORRECT
        } else if (progress != Progress.TITLE && isCorrectTitle(this.current_track!, guess)) {
            result = GuessResult.TITLE;
        } else if (progress != Progress.ARTIST && isCorrectArtist(this.current_track!, guess)) {
            result = GuessResult.ARTIST;
        } else {
            return GuessResult.INCORRECT;
        }

        standing.points_from_current_track++;
        if (progress == Progress.NONE) {
            standing.progress = result == GuessResult.TITLE ? Progress.TITLE : Progress.ARTIST;
        } else {
            standing.progress = Progress.BOTH;
            this.addCompletion(player, time);
        }

        return result;
    }

    addCompletion(player: string, time: number) {
        this.completions.push({player: player, time: time});
        this.completions.sort((a, b) => (a.time - b.time));
        this.completions.forEach((completion, index) => {
            let place;
            if (index == 0) {
                place = Place.FIRST;
            } else if (index == 1) {
                place = Place.SECOND;
            } else if (index == 2) {
                place = Place.THIRD;
            } else {
                place = Place.NONE;
            }
            this.leaderboard.get(completion.player)!.place = place;
        });
    }
}