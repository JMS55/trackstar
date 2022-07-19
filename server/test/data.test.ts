import { randomUUID } from 'crypto';
import TrackStore, { Track } from '../src/data';

global.console = {
    ...console,
    // uncomment to ignore a specific log level
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};

describe('testing memory DB and tables', () => {
    test('new DB should have tables', () => {
        const db = new TrackStore(':memory:');
        try {
            db.db.exec('SELECT * from songs;');
            db.db.exec('SELECT * from playlists;');
            db.db.exec('SELECT * from contents;');
            db.db.exec('SELECT * from config;');
        } catch (e) {
            fail(e);
        }
    });
    test('should be able to set and get config', () => {
        const db = new TrackStore(':memory:');
        db.setConfig('test', 'test');
        expect(db.getConfigValue('test')).toBe('test');
        expect(db.getConfig()).toBeDefined();
    });

    test('cache should be able to be updated', () => {
        const db = new TrackStore(':memory:');
        expect(db.getConfigValue('ws_port')).toBeDefined();
        db.setConfig('ws_port', '1234');
        expect(db.getConfigValue('ws_port')).toBe('1234');
        db.db.exec("UPDATE config SET value = '1111' WHERE key = 'ws_port';");
        expect(db.getConfigValue('ws_port')).toBe('1234');
        expect(db.getConfigValue('ws_port', true)).toBe('1111');
    });

    test('DB applies migrations', () => {
        const db = new TrackStore(':memory:');
        db.db.exec('DROP TABLE config;');
    });

    test('Songs are added and retrieved', () => {
        const db = new TrackStore(':memory:');
        const song: Track = {
            id: '123',
            preview_url: null,
            image_url: 'www',
            title: 'Test',
            artists: ['Test'],
        };
        db.loadSongs('onesong', [song]);
        const songs = db.getSongs('onesong');
        expect(songs).toEqual([song]);
    });

    test('Can update plays', () => {
        const db = new TrackStore(':memory:');
        const songId = randomUUID();
        const song: Track = {
            id: songId,
            preview_url: null,
            image_url: 'www',
            title: 'Test',
            artists: ['Test'],
        };
        db.loadSongs('playlist', [song]);
        db.updatePlays(songId, {
            plays: 1,
            title: 1,
            artist: 1,
        });
        const stmt = db.db.prepare('SELECT * FROM songs WHERE song_id = ?;');
        const row = stmt.get(songId);
        expect(row.plays).toBe(1);
        expect(row.title_guessed).toBe(1);
        expect(row.artist_guessed).toBe(1);
        db.updatePlays(songId, {
            plays: 1,
        });
        const row2 = stmt.get(songId);
        expect(row2.plays).toBe(2);
        expect(row2.title_guessed).toBe(1);
        expect(row2.artist_guessed).toBe(1);
    });

    // test('functions return error correctly', () => {
    //   jest.mock('better-sqlite3');
    //   const sqlite = require('better-sqlite3');
    //   const db = new TrackStore(":memory:");
    //   db.db.mockImplementation(() => {

    //   });
    //   expect(db.getConfig()).toBeDefined();
    //   expect(db.getConfig(true)).toBeNull();
    //   expect(db.getConfigValue('ws-port')).toBeDefined();
    //   expect(db.getConfigValue('ws-port', true)).toBeNull();
    //   expect(db.getSongs('test')).toEqual([]);
    //   expect(db.updatePlays('test', {
    //     plays: 0,
    //     title: 0,
    //     artist: 0
    //   })).toBeFalsy();
    //   expect(db.setConfig('test', 'test')).toBeFalsy();
    //   expect(db.loadSongs('test', [])).toBeFalsy();
    // })
});
