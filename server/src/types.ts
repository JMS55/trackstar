/* eslint-disable spaced-comment */
import { Literal, Record, Union, Number, String } from 'runtypes';

// THIS FILE CONTAINS THE TYPINGS FOR THE WEBSOCKET MESSAGES
// ANYTHING THAT CHANGES HERE MUST BE CHANGED IN THE CLIENT AS WELL

/** Topics for server/client messages */
export const enum Topic {
    GAME_CONFIG = 'game_config',
    TRACK_INFO = 'track_info',
    GUESS_RESULT = 'guess_result',
    LEADERBOARD = 'leaderboard',
    START_GAME_COMMAND = 'start_game_command',
    START_ROUND_COMMAND = 'start_round_command',
    MAKE_GUESS_COMMAND = 'make_guess_command',
}

/////////////////////////////////////////////

/** All Server -> Client messages */
export type ServerWSMessage = WSGameConfig | WSTrackInfo | WSGuessResult | WSLeaderBoard;

/** Configuration of the room's game */
interface WSGameConfig {
    topic: Topic.GAME_CONFIG;
    time_between_tracks: number;
    tracks_per_round: number;
    current_game_state: State;
}

/** Info for the next track to be played */
interface WSTrackInfo {
    topic: Topic.TRACK_INFO;
    url: string;
    album_cover_url: string;
    title: string;
    aritsts: string[];
    track_number: number;
    when_to_start: number;
}

/** Correctness of player's guess */
interface WSGuessResult {
    topic: Topic.GUESS_RESULT;
    result: GuessResult;
}

/** Leader board of the room's game */
interface WSLeaderBoard {
    topic: Topic.LEADERBOARD;
    leaderboard: Map<string, Standing>;
    host: string;
}

/////////////////////////////////////////////
/* Client -> Server messages */

/** Command to start this room's game */
const WSStartGame = Record({
    topic: Literal(Topic.START_GAME_COMMAND),
    tracks_per_round: Number,
    time_between_tracks: Number,
});

/** Command to start another round */
const WSStartRound = Record({
    topic: Literal(Topic.START_ROUND_COMMAND),
});

/** A player making a guess */
const WSMakeGuess = Record({
    topic: Literal(Topic.MAKE_GUESS_COMMAND),
    guess: String,
    time_of_guess: Number,
});

/** All Client -> Server messages */
export const ClientWSMessage = Union(WSStartGame, WSStartRound, WSMakeGuess);

///////////////
// SUPPLEMENTARY TYPES

/** Leaderboard info for a specific player */
export interface Standing {
    score: number;
    points_from_current_track: number;
    progress: Progress;
    place: Place;
    active: boolean;
}

/** The result of attempting to validate a guess */
export const enum GuessResult {
    TITLE = 'correct_title',
    ARTIST = 'correct_artist',
    INCORRECT = 'incorrect', // Includes case when player guesses something they already got right
}

/** Game state */
export const enum State {
    LOBBY = 'lobby',
    TRACK = 'in track',
    BETWEEN_TRACKS = 'between tracks',
    BETWEEN_ROUNDS = 'between rounds',
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
