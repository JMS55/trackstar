import { Track } from '../src/data';
import Game from '../src/game';
import { GuessResult, Progress, State } from '../src/types';

const addPlayer = jest.fn();
const getPlayer = jest.fn();
const updateRoundData = jest.fn();
const updateCorrectGuessPoints = jest.fn();
jest.mock('../src/leaderboard', () =>
    jest.fn().mockImplementation(() => ({
        addPlayer,
        getPlayer,
        updateCorrectGuessPoints,
    }))
);
jest.mock('../src/data', () => ({
    getRandomUnplayedTrack: jest.fn(
        () =>
            ({
                id: 'track1',
                artists: ['artist1'],
                title: 'title1',
                preview_url: 'url1',
                image_url: 'url2',
            } as Track)
    ),
}));

jest.mock('../src/validation', () => ({
    isCorrectArtist: jest.fn((t, s) => t.artists[0] === s),
    isCorrectTitle: jest.fn((t, s) => t.title === s),
}));

beforeEach(() => jest.clearAllMocks());

describe('basic functionality', () => {
    test('adding players adds them to the leaderboard', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const game = new Game([], (_i, _d) => true);
        game.enterPlayer('player1');
        game.enterPlayer('player2');
        expect(addPlayer).toHaveBeenCalledTimes(2);

        game.setGameConfig(1, 2);
        expect(game.tracks_per_round).toBe(1);
        expect(game.secs_between_tracks).toBe(2);
        expect(game.current_track_number).toBe(0);
        expect(game.state).toBe(State.LOBBY);
    });

    test('player leaves and rejoins changes the active flag', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const game = new Game([], (_i, _d) => true);
        game.enterPlayer('player1');
        game.enterPlayer('player2');
        expect(addPlayer).toHaveBeenCalledTimes(2);
        const res = { active: true };
        getPlayer.mockImplementation(() => res);
        game.deactivatePlayer('player2');
        expect(res.active).toBeFalsy();
        game.enterPlayer('player1');
        expect(addPlayer).toHaveBeenCalledTimes(2);
    });
});
describe('guess processing', () => {
    const game = new Game([], updateRoundData);
    game.enterPlayer('player1');
    game.nextTrack();
    test("incorrect guess with NONE returns INCORRECT and doesn't update anything", () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.NONE }));
        expect(game.processGuess('player1', 'na', 100)).toBe(GuessResult.INCORRECT);
        expect(updateRoundData).not.toHaveBeenCalled();
        expect(updateCorrectGuessPoints).not.toHaveBeenCalled();
    });
    test("incorrect guess with BOTH returns INCORRECT and doesn't update anything", () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.BOTH }));
        expect(game.processGuess('player1', 'na', 100)).toBe(GuessResult.INCORRECT);
        expect(updateRoundData).not.toHaveBeenCalled();
        expect(updateCorrectGuessPoints).not.toHaveBeenCalled();
    });
    test('title guess with NONE returns TITLE and updates title metadata and updates leaderboard to TITLE', () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.NONE }));
        expect(game.processGuess('player1', 'title1', 100)).toBe(GuessResult.TITLE);
        expect(updateRoundData).toHaveBeenCalledWith(expect.anything(), { title: 1 });
        expect(updateCorrectGuessPoints).toHaveBeenCalledWith(expect.anything(), Progress.TITLE, expect.anything());
    });
    test('artist guess with TITLE returns ARTIST and updates artist metadata and updates leaderboard to BOTH', () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.TITLE }));
        expect(game.processGuess('player1', 'artist1', 100)).toBe(GuessResult.ARTIST);
        expect(updateRoundData).toHaveBeenCalledWith(expect.anything(), { artist: 1 });
        expect(updateCorrectGuessPoints).toHaveBeenCalledWith(expect.anything(), Progress.BOTH, expect.anything());
    });
    test('title guess with ARTIST returns TITLE and updates title metadata and updates leaderboard to BOTH', () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.ARTIST }));
        expect(game.processGuess('player1', 'title1', 101)).toBe(GuessResult.TITLE);
        expect(updateRoundData).toHaveBeenCalledWith(expect.anything(), { title: 1 });
        expect(updateCorrectGuessPoints).toHaveBeenCalledWith(expect.anything(), Progress.BOTH, 101);
    });
    test("artist guess with ARTIST returns NONE and doesn't update anything", () => {
        getPlayer.mockImplementation(() => ({ progress: Progress.ARTIST }));
        expect(game.processGuess('player1', 'artist1', 101)).toBe(GuessResult.INCORRECT);
        expect(updateRoundData).not.toHaveBeenCalled();
        expect(updateCorrectGuessPoints).not.toHaveBeenCalled();
    });
});
