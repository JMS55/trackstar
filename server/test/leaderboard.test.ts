import Leaderboard from '../src/leaderboard';
import { Place, Progress } from '../src/types';

describe('testing completion points system', () => {
    describe('single user', () => {
        const board = new Leaderboard();
        const name = 'player1';
        test('adding a user sets the default parameters', () => {
            board.addPlayer(name);
            expect(board.getActive().size).toBe(1);
            expect(board.getPlayer(name)).toEqual({
                score: 0,
                points_from_current_track: 0,
                progress: Progress.NONE,
                place: Place.NONE,
                active: true,
            });
        });
        test('getting the artist sets progress and 1 point', () => {
            board.updatePlayerRound(name, Progress.ARTIST, 100);
            expect(board.getPlayer(name)).toEqual({
                score: 0,
                points_from_current_track: 1,
                progress: Progress.ARTIST,
                place: Place.NONE,
                active: true,
            });
        });
        test('getting the artist after the title sets BOTH and 6 points', () => {
            board.updatePlayerRound(name, Progress.BOTH, 100);
            expect(board.getPlayer(name)).toEqual({
                score: 0,
                points_from_current_track: 6,
                progress: Progress.BOTH,
                place: Place.FIRST,
                active: true,
            });
        });
        test('ending the round resets the status and sets score', () => {
            board.endRound();
            expect(board.getPlayer(name)).toEqual({
                score: 6,
                points_from_current_track: 0,
                progress: Progress.NONE,
                place: Place.NONE,
                active: true,
            });
        });
        test('resetting leaderboard clears fields but keeps players', () => {
            board.reset();
            expect(board.getActive().size).toBe(1);
            expect(board.getPlayer(name)).toEqual({
                score: 0,
                points_from_current_track: 0,
                progress: Progress.NONE,
                place: Place.NONE,
                active: true,
            });
        });
    });

    describe('multiple players', () => {
        const board = new Leaderboard();
        const name1 = 'player1';
        const name2 = 'player2';
        const name3 = 'player3';
        const name4 = 'player4';

        test('multiple players can be added', () => {
            board.addPlayer(name1);
            board.addPlayer(name2);
            expect(board.getActive().size).toBe(2);
        });
        test("setting complete for one player sets it's fields and none on the other", () => {
            board.updatePlayerRound(name1, Progress.BOTH, 100);
            expect(board.getActive().get(name1)).toEqual({
                score: 0,
                points_from_current_track: 6,
                progress: Progress.BOTH,
                place: Place.FIRST,
                active: true,
            });
            expect(board.getActive().get(name2)).toEqual({
                score: 0,
                points_from_current_track: 0,
                progress: Progress.NONE,
                place: Place.NONE,
                active: true,
            });
        });
        describe('setting complete for the second player before the first player', () => {
            beforeAll(() => {
                board.updatePlayerRound(name1, Progress.BOTH, 100);
                board.updatePlayerRound(name2, Progress.BOTH, 90);
            });
            it("sets the 'first' player to second place and 5 pts", () => {
                expect(board.getActive().get(name1)).toEqual({
                    score: 0,
                    points_from_current_track: 5,
                    progress: Progress.BOTH,
                    place: Place.SECOND,
                    active: true,
                });
            });
            it("sets the 'second' player to first place and 6 pts", () => {
                expect(board.getActive().get(name2)).toEqual({
                    score: 0,
                    points_from_current_track: 6,
                    progress: Progress.BOTH,
                    place: Place.FIRST,
                    active: true,
                });
            });
        });
        test('setting complete for 3rd and 4th player sets place (3rd, none) and points (4, 2)', () => {
            board.addPlayer(name3);
            board.addPlayer(name4);
            board.updatePlayerRound(name1, Progress.BOTH, 100);
            board.updatePlayerRound(name2, Progress.BOTH, 100);
            board.updatePlayerRound(name3, Progress.BOTH, 1000);
            board.updatePlayerRound(name4, Progress.BOTH, 10000);
            expect(board.getActive().get(name3)).toEqual({
                score: 0,
                points_from_current_track: 4,
                progress: Progress.BOTH,
                place: Place.THIRD,
                active: true,
            });
            expect(board.getActive().get(name4)).toEqual({
                score: 0,
                points_from_current_track: 2,
                progress: Progress.BOTH,
                place: Place.NONE,
                active: true,
            });
        });
        test('marking a player inactive removes them from the active list', () => {
            board.getPlayer(name2)!.active = false;
            expect(board.getActive().size).toBe(3);
        });
    });
});
