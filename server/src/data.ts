import sqlite3, { Database } from 'better-sqlite3';
import { RoundData } from './game';
import { logger } from './server';

// SQL statements
/////////////

const PLAYLIST_INSERT = `
INSERT INTO playlists (playlist_id, last_updated) 
    VALUES (?, @updated)
ON CONFLICT(playlist_id) DO UPDATE 
    SET last_updated = @updated;`;

const SONG_INSERT = `
INSERT INTO songs (song_id, preview_url, img_url, title, artists, add_time) 
    VALUES (?,@prev_url,@img_url,?,?,?)
ON CONFLICT(song_id) DO UPDATE 
    SET preview_url = @prev_url, img_url = @img_url;`;

const CONTENTS_INSERT = `
INSERT OR IGNORE INTO contents (playlist_id, song_id) VALUES (?,?);`;

const SONGS_UPDATE = `
UPDATE songs 
SET title_guessed = title_guessed + ?, artist_guessed = artist_guessed + ?, plays = plays + ? WHERE song_id = ?;`;

const SONGS_GET = `
SELECT s.* FROM contents cs
INNER JOIN songs s on s.song_id = cs.song_id
WHERE cs.playlist_id = ?;`;

const SONGS_CREATE = `
CREATE TABLE IF NOT EXISTS songs (
    song_id TEXT PRIMARY KEY,
    preview_url TEXT,
    img_url TEXT,
    title TEXT NOT NULL,
    artists TEXT NOT NULL,
    add_time INT NOT NULL,
    plays INT NOT NULL DEFAULT 0,
    title_guessed INT NOT NULL DEFAULT 0,
    artist_guessed INT NOT NULL DEFAULT 0);`;

const PLAYLIST_CREATE = `
CREATE TABLE IF NOT EXISTS playlists (
	playlist_id TEXT PRIMARY KEY,
    last_updated INT NOT NULL);`;

const CONTENTS_CREATE = `
CREATE TABLE IF NOT EXISTS contents (
	playlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
UNIQUE (playlist_id, song_id),
FOREIGN KEY (playlist_id) REFERENCES playlists (playlist_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
FOREIGN KEY (song_id) REFERENCES songs (song_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE);`;

const V1_ALTERS = [
    `ALTER TABLE songs 
ADD COLUMN plays INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE songs 
ADD COLUMN title_guessed INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE songs ADD COLUMN artist_guessed INT NOT NULL DEFAULT 0;`,
];

////////////////

export class TrackStore {
    private readonly db: Database;

    constructor() {
        this.db = open_db();
    }

    /** Add songs to the database for a given playlist. Updates playlist table and junction table as well. */
    loadSongs(playlist_id: string, tracks: TrackList) {
        this.db.prepare(PLAYLIST_INSERT).run(playlist_id, { updated: new Date().getTime() });
        const songStmt = this.db.prepare(SONG_INSERT);
        const contentStmt = this.db.prepare(CONTENTS_INSERT); //TODO: check removed
        const txn = this.db.transaction((tracks: TrackList) => {
            tracks.forEach((track) => {
                try {
                    songStmt.run(
                        track.id,
                        track.title,
                        track.artists.map((artist) => Buffer.from(artist).toString('base64')).join(','),
                        new Date().getTime(),
                        { prev_url: track.preview_url, img_url: track.image_url }
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

    /** increase title guessed, artist guessed, plays */
    updatePlays(song_id: string, data: RoundData) {
        const stmt = this.db.prepare(SONGS_UPDATE);
        try {
            stmt.run(data.title, data.artist, data.plays, song_id);
            logger.info(
                `Added ${data.title} title guesses, ${data.artist} artist guesses, ${data.plays} plays to song ${song_id}`
            );
        } catch (e) {
            logger.warn(`Error while updating plays for song ${song_id}: ${e}`);
        }
    }

    /** Retrieve songs for a playlist. */
    getSongs(playlist_id: string): TrackList {
        const stmt = this.db.prepare(SONGS_GET);
        let songs: Track[] = [];

        try {
            for (var row of stmt.iterate(playlist_id)) {
                const artists = row.artists.split(',').map((s: string) => Buffer.from(s, 'base64').toString('utf8'));
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
    image_url: string;
    title: string;
    artists: Array<string>;
}

export type TrackList = readonly Track[];

/** Create database and tables.
 * SONGS table: song_id, preview_url, img_url, title, artists, add_time, plays, title_guessed, artist_guessed
 * PLAYLISTS table: playlist_id, last_updated
 * CONTENTS: playlist_id, song_id
 *  -- foreign keys
 */
function open_db() {
    let db: Database;
    try {
        db = new sqlite3('data.db', { fileMustExist: true });
    } catch (_) {
        logger.info('Creating database.');
        db = new sqlite3('data.db', {});
        db.pragma('foreign_keys = ON;');
        db.prepare(SONGS_CREATE).run();
        db.prepare(PLAYLIST_CREATE).run();
        db.prepare(CONTENTS_CREATE).run();
        db.pragma('user_version = 1;');
    }

    const ver = db.pragma('user_version', { simple: true });
    if (ver < 1) {
        logger.info('Migrating database to version 1 (plays tracking)');
        V1_ALTERS.forEach((alter) => db.prepare(alter).run());
        db.pragma('user_version = 1;');
    }

    return db;
}
