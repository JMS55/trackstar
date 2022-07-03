import { getRandomUnplayedTrack, Track, TrackList } from './data';
import Leaderboard, { Place, Progress, Standing } from './leaderboard';
import { isCorrectTitle, isCorrectArtist } from './validation';

/** Game state */
export const enum State {
    LOBBY = 'lobby',
    TRACK = 'in track',
    BETWEEN_TRACKS = 'between tracks',
    BETWEEN_ROUNDS = 'between rounds',
}

/** The result of attempting to validate a guess */
export const enum GuessResult {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect', //Includes case when player guesses something they already got right
}

/** Store round guess information for analytics */
export interface RoundData {
    plays?: number;
    title?: number;
    artist?: number;
}

/** A game contains rounds, which in turn contain tracks */
export default class Game {
    //room: Room;
    state: State;
    tracks_per_round: number | null;
    secs_between_tracks: number | null;
    private current_track: Track | null;
    current_track_number: number;
    private playlist: TrackList;
    private leaderboard: Leaderboard;
    private updateRoundData: (i: string, d: RoundData) => boolean;

    constructor(playlist: Track[], updateRoundData: (i: string, d: RoundData) => boolean) {
        this.state = State.LOBBY;
        this.tracks_per_round = null;
        this.secs_between_tracks = null;
        this.current_track = null;
        this.current_track_number = 0;
        this.playlist = { songs: playlist, played: new Set() };
        this.leaderboard = new Leaderboard();
        this.updateRoundData = updateRoundData;
    }

    getActiveLeaderboard(): Map<string, Standing> {
        return this.leaderboard.getActive();
    }

    resetLeaderboard() {
        this.leaderboard.resetLeaderboard();
    }

    setGameConfig(tracks_per_round: number, secs_between_tracks: number) {
        this.tracks_per_round = tracks_per_round;
        this.secs_between_tracks = secs_between_tracks;
    }

    /** Add new player to leaderboard or reactivate inactive player */
    enterPlayer(player: string) {
        const standing = this.leaderboard.getPlayer(player);
        if (standing) {
            standing.active = true;
        } else {
            this.leaderboard.addPlayer(player);
        }
    }

    /** Label player as inactive when they leave the room */
    deactivatePlayer(player: string) {
        this.leaderboard.getPlayer(player)!.active = false;
    }

    /** Switch to and return a new track (which has not already been played) */
    nextTrack(): Track {
        const track = getRandomUnplayedTrack(this.playlist);
        this.current_track = track;
        this.current_track_number++;
        this.playlist.played.add(track);
        return track;
    }

    /** Validate a player's guess, update the leaderboard, and return the validation result */
    processGuess(player: string, guess: string, time: number): GuessResult {
        const standing = this.leaderboard.getPlayer(player)!;
        const progress = standing.progress;

        //Validate guess
        let result;
        if (progress == Progress.BOTH) {
            return GuessResult.INCORRECT;
        } else if (progress != Progress.TITLE && isCorrectTitle(this.current_track!, guess)) {
            result = GuessResult.TITLE;
            this.updateRoundData(this.current_track!.id, { title: 1 });
        } else if (progress != Progress.ARTIST && isCorrectArtist(this.current_track!, guess)) {
            result = GuessResult.ARTIST;
            this.updateRoundData(this.current_track!.id, { artist: 1 });
        } else {
            return GuessResult.INCORRECT;
        }
        let newProgress;
        //Update leaderboard
        if (progress == Progress.NONE) {
            //Player has either title or artist correct now
            newProgress = result == GuessResult.TITLE ? Progress.TITLE : Progress.ARTIST;
        } else {
            //Player has both title and artist correct now
            newProgress = Progress.BOTH;
        }
        this.leaderboard.updatePlayerRound(player, newProgress, time);

        return result;
    }

    /** Add points from current track to scores and reset completions */
    endTrack() {
        this.leaderboard.endRound();
        this.updateRoundData(this.current_track!.id, { plays: this.leaderboard.getActive().size });
    }
}
