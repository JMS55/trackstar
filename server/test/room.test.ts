import { WebSocket } from 'ws';
import TrackStore, { Track } from '../src/data';
import Room from '../src/room';
import { GuessResult, Place, Progress, Standing, State } from '../src/types';

const clientMock1 = {
    send: jest.fn(),
};
const clientMock2 = {
    send: jest.fn(),
};
const dbMock = {} as TrackStore;

const enterPlayer = jest.fn();
const getActiveLeaderboard = jest.fn();
const setGameConfig = jest.fn();
const processGuess = jest.fn();
const resetLeaderboard = jest.fn();
const nextTrack = jest.fn();

jest.mock('../src/game', () =>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jest.fn().mockImplementation((_p, _d) => ({
        enterPlayer,
        getActiveLeaderboard,
        state: State.LOBBY,
        setGameConfig,
        processGuess,
        resetLeaderboard,
        nextTrack,
        endTrack: jest.fn(),
    }))
);

const bareLeaderboard: Standing = {
    score: 0,
    points_from_current_track: 0,
    progress: Progress.NONE,
    place: Place.NONE,
    active: false,
};

const room = new Room('123', [], dbMock);
const name1 = 'player1';
const name2 = 'player2';
const player1 = {
    client: clientMock1 as unknown as WebSocket,
    name: name1,
};
const player2 = {
    client: clientMock2 as unknown as WebSocket,
    name: name2,
};
afterAll(() => {
    room.timeouts.forEach((t) => {
        clearTimeout(t);
    });
});
describe('lobby tests', () => {
    test('create room works', () => {
        expect(room.id).toBeDefined();
    });
    describe('adding 1 player sends them the leaderboard', () => {
        test('sends player leaderboard', () => {
            const expectedBoard = { player1: bareLeaderboard };
            getActiveLeaderboard.mockImplementationOnce(() => expectedBoard);

            room.addPlayer(player1);
            expect(enterPlayer).toHaveBeenCalledWith(name1);
            const actual = JSON.parse(clientMock1.send.mock.calls[0][0]);
            expect(actual).toEqual({
                topic: 'leaderboard',
                leaderboard: expectedBoard,
                host: name1,
            });
        });
        test('Does not send game config', () => {
            expect(clientMock1.send).not.toHaveBeenCalledWith(expect.stringContaining('game_config'));
        });
    });
    test('Adding 2nd player sends both the leaderboard', () => {
        const expectedBoard = { player1: bareLeaderboard, player2: bareLeaderboard };
        getActiveLeaderboard.mockImplementationOnce(() => expectedBoard);

        room.addPlayer(player2);
        const actual1 = JSON.parse(clientMock2.send.mock.calls[0][0]);
        expect(actual1).toEqual({
            topic: 'leaderboard',
            leaderboard: expectedBoard,
            host: name1,
        });
        const actual2 = JSON.parse(clientMock2.send.mock.calls[0][0]);
        expect(actual2).toEqual({
            topic: 'leaderboard',
            leaderboard: expectedBoard,
            host: name1,
        });
    });
    describe('Can set game config (happens at start of game)', () => {
        beforeAll(() => {
            room.setGameConfig(1, 2);
        });
        test('Sets config', () => {
            expect(setGameConfig).toHaveBeenCalledWith(1, 2);
        });
    });
    test("Don't process a guess", () => {
        room.processGuess(player1, 'guess', 1);
        expect(clientMock1.send).not.toHaveBeenCalledWith(expect.stringContaining('result'));
        expect(processGuess).not.toHaveBeenCalled();
    });
    describe('Can start round', () => {
        beforeAll(() => {
            jest.clearAllMocks();
            nextTrack.mockReturnValueOnce({
                id: '1',
                preview_url: 'prev',
                image_url: 'img',
                title: 'title',
                artists: ['artist'], // it's a typo but its in the client too
            } as Track);
            room.startRound();
        });
        test('Sets game state to between tracks and resets leaderboard', () => {
            expect(room.game.state).toBe(State.BETWEEN_TRACKS);
            expect(resetLeaderboard).toBeCalled();
        });
        test('Sends leaderboard and next track to start in 1 second', () => {
            expect(clientMock1.send).toHaveBeenCalledWith(expect.stringContaining('leaderboard'));
            const actual1 = JSON.parse(clientMock2.send.mock.calls[1][0]);
            expect(actual1).toEqual(
                expect.objectContaining({
                    topic: 'track_info',
                    url: 'prev',
                    album_cover_url: 'img',
                    title: 'title',
                    aritsts: ['artist'],
                })
            );
            expect(actual1.when_to_start).toBeCloseTo(Date.now() + 1000, -3);
        });
    });
});

describe('In game tests', () => {
    beforeAll(() => {
        room.setGameState(State.TRACK);
        jest.clearAllMocks();
    });
    test("Can't set game config", () => {
        room.setGameConfig(1, 2);
        expect(setGameConfig).not.toHaveBeenCalled();
    });
    describe('Processing guess', () => {
        describe('Correct guess', () => {
            test('Sends result to client', () => {
                processGuess.mockReturnValueOnce(GuessResult.ARTIST);
                room.processGuess(player1, 'blah', 1);
                expect(processGuess).toHaveBeenCalledWith(name1, 'blah', 1);
                const actual1 = JSON.parse(clientMock1.send.mock.calls[0][0]);
                expect(actual1).toEqual({
                    topic: 'guess_result',
                    result: GuessResult.ARTIST,
                });
                expect(clientMock1.send).toHaveBeenCalledWith(expect.stringContaining('result'));
            });
            test('Sends leaderboard to all', () => {
                expect(clientMock1.send).toHaveBeenCalledWith(expect.stringContaining('leaderboard'));
                expect(clientMock2.send).toHaveBeenCalledWith(expect.stringContaining('leaderboard'));
            });
        });
        describe('Incorrect guess', () => {
            beforeAll(() => {
                jest.clearAllMocks();
            });
            test('Sends results but not leaderboard', () => {
                processGuess.mockReturnValueOnce(GuessResult.INCORRECT);
                room.processGuess(player1, 'blah', 1);
                expect(clientMock1.send).toHaveBeenCalledWith(expect.stringContaining('guess_result'));
                expect(clientMock1.send).not.toHaveBeenCalledWith(expect.stringContaining('leaderboard'));
                expect(clientMock2.send).not.toHaveBeenCalledWith(expect.stringContaining('leaderboard'));
            });
        });
    });
});
