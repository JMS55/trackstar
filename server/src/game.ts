import { getRandomUnplayedTrack, Track } from './tracks';
import { isCorrectTitle, isCorrectArtist } from './validation';

/** Game state */
export const enum State {
    LOBBY,
    TRACK,
    BETWEEN_TRACKS,
    BETWEEN_ROUNDS
}

/** What a player has gotten correct so far */
const enum Progress {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    BOTH = 'both_correct',
    NONE = 'none_correct'
}

/** Podium for who got both the title and artist in what order */
const enum Place {
    FIRST = 'first',
    SECOND = 'second',
    THIRD = 'third',
    NONE = 'none'
}

/** The result of attempting to validate a guess */
export const enum GuessResult {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect'  //Includes case when player guesses something they already got right
}

/** Leaderboard info for a specific player */
export interface Standing {
    score: number
    points_from_current_track: number
    progress: Progress
    place: Place
}

/** Marker for the time a player gets both title and artist */
interface Completion {
    player: string
    time: number
}

/** A game contains rounds, which in turn contain tracks */
export class Game {
    state: State
    tracks_per_round: number | null
    secs_between_tracks: number | null
    current_track: Track | null
    current_track_number: number
    played_tracks: Set<Track>
    leaderboard: Map<string, Standing>
    completions: Array<Completion>

    constructor() {
        this.state = State.LOBBY;
        this.tracks_per_round = null;
        this.secs_between_tracks = null;
        this.current_track = null;
        this.current_track_number = 0;
        this.played_tracks = new Set();
        this.leaderboard = new Map();
        this.completions = [];
    }

    setGameConfig(tracks_per_round: number, secs_between_tracks: number) {
        this.tracks_per_round = tracks_per_round;
        this.secs_between_tracks = secs_between_tracks;
    }

    /** Add new player to leaderboard */
    addPlayer(player: string) {
        this.leaderboard.set(player, {
            score: 0,
            points_from_current_track: 0,
            progress: Progress.NONE,
            place: Place.NONE,
        });
    }

    /** Remove player from leaderboard */
    deletePlayer(player: string) {
        this.leaderboard.delete(player);
    }

    /** Reset a player's standing */
    resetPlayer(player: string) {
        this.addPlayer(player);
    }

    /** Reset the standings of all players in the leaderboard */
    resetLeaderboard() {
        for (const player in this.leaderboard) {
            this.resetPlayer(player);
        }
    }

    /** Switch to and return a new track (which has not already been played) */
    nextTrack(): Track {
        const track = getRandomUnplayedTrack(this.played_tracks);
        this.current_track = track;
        this.current_track_number++;
        this.played_tracks.add(track);
        return track
    }

    /** Validate a player's guess, update the leaderboard, and return the validation result */
    processGuess(player: string, guess: string, time: number): GuessResult {
        const standing = this.leaderboard.get(player)!;
        const progress = standing.progress;

        //Validate guess
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

        //Update leaderboard
        standing.points_from_current_track++;
        if (progress == Progress.NONE) {  //Player has either title or artist correct now
            standing.progress = result == GuessResult.TITLE ? Progress.TITLE : Progress.ARTIST;
            standing.points_from_current_track = 1;
        } else {  //Player has both title and artist correct now
            standing.progress = Progress.BOTH;
            this.addCompletion(player, time);
        }

        return result;
    }

    /** Update leaderboard when a player has just gotten title and artist */
    addCompletion(player: string, time: number) {
        this.completions.push({ player: player, time: time });
        this.completions.sort((a, b) => (a.time - b.time));
        this.completions.forEach((completion, index) => {
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
            const standing = this.leaderboard.get(completion.player)!;
            standing.place = place;
            standing.points_from_current_track = points_from_current_track;
        });
    }

    /** Add points from current track to scores and reset completions */
    endTrack() {
        this.completions.forEach((completion) => {
            const standing = this.leaderboard.get(completion.player)!;
            standing.score += standing.points_from_current_track;
            standing.points_from_current_track = 0;
            standing.progress = Progress.NONE;
            standing.place = Place.NONE;
        });
        this.completions = [];
    }
}
