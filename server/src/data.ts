import sqlite3, { Database } from 'better-sqlite3';
import { logger } from './server';

export class TrackStore {
    private readonly db: Database;

    constructor() {
        this.db = open_db();
    }

    /** Add songs to the database for a given playlist. Updates playlist table and junction table as well. */
    loadSongs(playlist_id: string, tracks: TrackList) {
        this.db
            .prepare('INSERT OR REPLACE INTO playlists (playlist_id, last_updated) VALUES (?, ?);')
            .run(playlist_id, new Date().getTime());
        const songStmt = this.db.prepare(
            'INSERT OR REPLACE INTO songs (song_id, preview_url, img_url, title, artists, add_time) VALUES (?,?,?,?,?,?);'
        );
        const contentStmt = this.db.prepare('INSERT OR IGNORE INTO contents (playlist_id, song_id) VALUES (?,?);'); //TODO: check removed
        const txn = this.db.transaction((tracks: TrackList) => {
            tracks.forEach((track) => {
                try {
                    songStmt.run(
                        track.id,
                        track.preview_url,
                        track.image_url,
                        track.title,
                        track.artists.map((artist) => Buffer.from(artist).toString('base64')).join(','),
                        new Date().getTime()
                    );
                    contentStmt.run(playlist_id, track.id);
                } catch (e) {
                    logger.warn(`Error adding track ${track.id} to database: ${e}`);
                }
            });
        });
        txn(tracks);
        logger.info(`Added ${tracks.length} songs to playlist ${playlist_id}`);
    }

    /** Retrieve songs for a playlist. */
    getSongs(playlist_id: string): TrackList {
        const stmt = this.db.prepare(
            'SELECT s.* FROM contents cs \n' +
                'INNER JOIN songs s on s.song_id = cs.song_id \n' +
                'WHERE cs.playlist_id = ?;'
        );
        let songs: Track[] = [];

        try {
            for (var row of stmt.iterate(playlist_id)) {
                const artists = row.artists.split(',').map((s: string) => Buffer.from(s, 'base64').toString('ascii'));
                songs.push({
                    id: row.song_id,
                    title: row.title,
                    artists: artists,
                    preview_url: row.preview_url,
                    image_url: row.img_url,
                });
            }
        } catch (e) {
            logger.error(`Error while getting songs from playlist ${playlist_id}: ${e}`);
        }
        logger.info(`Loaded ${songs.length} songs from playlist ${playlist_id}`);
        return songs;
    }
}

export interface Track {
    id: string;
    preview_url: string | null;
    image_url: string | null;
    title: string;
    artists: Array<string>;
}

export type TrackList = readonly Track[];

/** Create database and tables.
 * SONGS table: song_id, preview_url, img_url, title, artists, add_time
 * PLAYLISTS table: playlist_id, last_updated
 * CONTENTS: playlist_id, song_id
 *  -- foreign keys
 */
function open_db() {
    const db = new sqlite3('data.db', {});
    db.pragma('foreign_keys = ON;');

    db.prepare(
        'CREATE TABLE IF NOT EXISTS songs (\n' +
            '	song_id TEXT PRIMARY KEY,\n' +
            '	preview_url TEXT,\n' +
            ' img_url TEXT,\n' +
            '	title TEXT NOT NULL,\n' +
            ' artists TEXT NOT NULL,\n' +
            ' add_time INT NOT NULL\n' +
            ');'
    ).run();
    db.prepare(
        'CREATE TABLE IF NOT EXISTS playlists (\n' +
            '	playlist_id TEXT PRIMARY KEY,\n' +
            ' last_updated INT NOT NULL\n' +
            ');'
    ).run();
    db.prepare(
        'CREATE TABLE IF NOT EXISTS contents (\n' +
            '	playlist_id TEXT NOT NULL,\n' +
            ' song_id TEXT NOT NULL,\n' +
            ' UNIQUE (playlist_id, song_id),\n' +
            ' FOREIGN KEY (playlist_id) REFERENCES playlists (playlist_id)' +
            '    ON UPDATE CASCADE \n' +
            '    ON DELETE CASCADE ,\n' +
            ' FOREIGN KEY (song_id) REFERENCES songs (song_id)' +
            '    ON UPDATE CASCADE \n' +
            '    ON DELETE CASCADE \n' +
            ');'
    ).run();
    return db;
}
