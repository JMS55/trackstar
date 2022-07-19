import TrackStore from '../src/data';
import Room from '../src/room';
import { forTests } from '../src/server';

const { handleMessage } = forTests;

const setGameConfig = jest.fn();
const startRound = jest.fn();
const processGuess = jest.fn();

jest.mock('../src/room', () => jest.fn().mockImplementation(() => ({ setGameConfig, startRound, processGuess })));

describe('Handle message', () => {
    const room = new Room('id', [], {} as TrackStore);
    test('Invalid JSON is ignored', () => {
        handleMessage(room, {} as any, '}{');
        expect(processGuess).not.toHaveBeenCalled();
        expect(setGameConfig).not.toHaveBeenCalled();
        expect(startRound).not.toHaveBeenCalled();
    });

    test('Unknown message type is ignored', () => {
        handleMessage(room, {} as any, JSON.stringify('{"blah": "blah"}'));
        expect(processGuess).not.toHaveBeenCalled();
        expect(setGameConfig).not.toHaveBeenCalled();
        expect(startRound).not.toHaveBeenCalled();
    });
    test('Process start game command', () => {
        const msg = {
            topic: 'start_game_command',
            tracks_per_round: 1,
            time_between_tracks: 2,
        };
        handleMessage(room, {} as any, JSON.stringify(msg));
        expect(setGameConfig).toHaveBeenCalledWith(1, 2);
    });
    test('Process start round command', () => {
        const msg = {
            topic: 'start_round_command',
        };
        handleMessage(room, {} as any, JSON.stringify(msg));
        expect(startRound).toHaveBeenCalledWith();
    });

    test('Process guess command', () => {
        const msg = {
            topic: 'make_guess_command',
            guess: 'aaa',
            time_of_guess: 10,
        };
        handleMessage(room, {} as any, JSON.stringify(msg));
        expect(processGuess).toHaveBeenCalledWith({}, 'aaa', 10);
    });
});
