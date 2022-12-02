import WebSocket from 'ws';
import TrackStore, { Track } from './data';
import Game from './game';
import logger, { prettyJson } from './logging';
import { GuessResult, ServerWSMessage, State, Topic } from './types';

/** We use Spotify previews, which are 30 seconds long */
export const TRACK_PLAY_LENGTH_SECS = 30;

export interface Player {
    client: WebSocket;
    name: string;
}

export default class Room {
    id: string;

    players: Array<Player>;

    game: Game;

    timeouts: Array<NodeJS.Timeout>;

    constructor(id: string, playlist: Track[], database: TrackStore) {
        this.id = id;
        this.players = [];
        this.game = new Game(playlist, (i, d) => database.updatePlays(i, d));
        this.timeouts = [];
    }

    /** Send a message to all players */
    sendAll(message: ServerWSMessage) {
        this.players.forEach((player) => this.sendMessage(player, message));
    }

    /** Send a message to a single player */
    sendMessage(player: Player, message: ServerWSMessage) {
        const messageJson: string = JSON.stringify(message, (_key, value) =>
            value instanceof Map ? Object.fromEntries(value) : value
        );
        logger.debug(`Message sent to player ${player.name} in room ${this.id}...\n${prettyJson(messageJson)}`);
        player.client.send(messageJson);
    }

    /** Send the current leaderboard to all players */
    sendLeaderboard() {
        this.sendAll({
            topic: Topic.LEADERBOARD,
            leaderboard: this.game.getActiveLeaderboard(),
            host: this.players[0]?.name, // if this is null, no messages actually will be sent
        });
    }

    /** Add player (back) to room, restoring previous standing if previously disconnected */
    addPlayer(player: Player) {
        this.players.push(player);
        this.game.enterPlayer(player.name);
        this.sendLeaderboard();
        if (this.game.state !== State.LOBBY) {
            this.sendMessage(player, this.getGameConfigMessage());
        }
    }

    /** Delete player from room and label them "inactive" on the leaderboard */
    deletePlayer(player: Player) {
        this.players = this.players.filter((p) => p !== player);
        this.game.deactivatePlayer(player.name);
        this.sendLeaderboard();
    }

    getGameConfigMessage(): ServerWSMessage {
        return {
            topic: Topic.GAME_CONFIG,
            time_between_tracks: this.game.secs_between_tracks!,
            tracks_per_round: this.game.tracks_per_round!,
            current_game_state: this.game.state!,
        };
    }

    setGameConfig(tracks_per_round: number, time_between_tracks: number) {
        // Setting game config should only be done from the lobby
        if (this.game.state !== State.LOBBY) {
            return;
        }

        this.game.setGameConfig(tracks_per_round, time_between_tracks);
        this.sendAll(this.getGameConfigMessage());
    }

    setGameState(state: State) {
        logger.debug(`Game state of room ${this.id} is now ${state}`);
        this.game.state = state;
    }

    /**
     * Start a round, in which multiple tracks are played. After all tracks are
     * played, the room creator can start a new round. The leaderboard is reset
     * before each round.
     */
    startRound() {
        // Round should only start from lobby or between rounds
        if (this.game.state !== State.LOBBY && this.game.state !== State.BETWEEN_ROUNDS) {
            return;
        }

        this.setGameState(State.BETWEEN_TRACKS);
        this.game.newRound();
        this.sendLeaderboard();
        this.selectTrack();
    }

    /** Start a timeout and keep track of its existence */
    addTimeout(delay_secs: number, callback: () => void) {
        this.timeouts.push(setTimeout(callback, delay_secs * 1000));
    }

    /** Clear every timeout that has ever been started for this room */
    clearTimeouts() {
        this.timeouts.forEach((timeout) => clearTimeout(timeout));
    }

    /** Notify guesser of their correctness and update leaderboard if correct */
    processGuess(player: Player, guess: string, guess_epoch_millis: number) {
        // Guesses can only be made while a track is playing
        if (this.game.state !== State.TRACK) {
            return;
        }

        const result = this.game.processGuess(player.name, guess, guess_epoch_millis);
        this.sendMessage(player, {
            topic: Topic.GUESS_RESULT,
            result,
        });
        if (result !== GuessResult.INCORRECT) {
            this.sendLeaderboard();
        }
    }

    /** Select a track to play (called one second before track plays) */
    selectTrack() {
        // Send the next track to play
        const track = this.game.nextTrack();
        this.sendAll({
            topic: Topic.TRACK_INFO,
            url: track.preview_url!,
            album_cover_url: track.image_url,
            title: track.title,
            aritsts: track.artists,
            track_number: this.game.current_track_number,
            when_to_start: Date.now() + 1000, // now + 1
        });

        // Set game state to TRACK once the track starts playing
        this.addTimeout(
            1, // now + 1
            () => this.setGameState(State.TRACK)
        );

        // Set game state to BETWEEN_TRACKS once the track ends
        this.addTimeout(
            1 + TRACK_PLAY_LENGTH_SECS, // now + 1 + track
            () => this.setGameState(State.BETWEEN_TRACKS)
        );

        // Update the leaderboard once the next track and subsequent wait period end
        this.addTimeout(
            1 + TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, // now + 1 + track + wait
            () => {
                this.game.endTrack();
                this.sendLeaderboard();
            }
        );

        // If round is not over, select another track one second before the next track plays
        if (this.game.current_track_number < this.game.tracks_per_round!) {
            this.addTimeout(
                TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, // now + 1 + track + (wait-1)
                () => this.selectTrack()
            );
        }
        // If round is over, set game state to BETWEEN_ROUNDS once track and subsequent wait period end
        else {
            this.addTimeout(
                1 + TRACK_PLAY_LENGTH_SECS + this.game.secs_between_tracks!, // now + 1 + track + wait
                () => this.setGameState(State.BETWEEN_ROUNDS)
            );
        }
    }
}
