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
    SET preview_url = COALESCE(@prev_url, preview_url), img_url = COALESCE(@img_url, img_url);`;

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

const CONFIG_CREATE = `
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT);`;

const GET_CONFIG = `
SELECT value FROM config WHERE key = ?;`;

const GET_ALL_CONFIG = `
SELECT key, value FROM config;`;

const SET_CONFIG = `
INSERT OR REPLACE INTO config (key, value) VALUES (?,?);`;

const V1_ALTERS = [
    `ALTER TABLE songs 
ADD COLUMN plays INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE songs 
ADD COLUMN title_guessed INT NOT NULL DEFAULT 0;`,
    `ALTER TABLE songs ADD COLUMN artist_guessed INT NOT NULL DEFAULT 0;`,
];

////////////////

/**
 * DB wrapper
 * 
 * Error handling: each method returns what happens on an error (usually returns false or null)
 * Errors shouldn't really happen, only really from IO errors or something very wrong. 
 * Errors can cause crashes at startup, but later should be handled gracefully.
 */
export default class TrackStore {
    readonly db: Database;
    configCache: Config | null;

    /** Create and load database. Will (and should) throw an error if it can't open. */
    constructor(db_file?: string) {
        this.db = open_db(db_file);
        this.configCache = this.getConfig();
    }

    /** Add songs to the database for a given playlist. Updates playlist table and junction table as well. 
     *  On error, returns false. Will either fully complete or not at all.
    */
    loadSongs(playlist_id: string, tracks: Track[]): boolean {
        this.db.prepare(PLAYLIST_INSERT).run(playlist_id, { updated: new Date().getTime() });
        const songStmt = this.db.prepare(SONG_INSERT);
        const contentStmt = this.db.prepare(CONTENTS_INSERT); //TODO: check removed
        const txn = this.db.transaction((tracks: Track[]) => {
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
                    throw e;
                }
            });
        });
        try {
            txn(tracks);    // if error adding a track, transaction will rollback
        } catch (_) {
            return false;
        }
        logger.info(`Added ${tracks.length} songs to playlist ${playlist_id}`);
        return true;
    }

    /** Increase title guessed, artist guessed, plays.
     *  On DB error, returns false
     */
    updatePlays(song_id: string, data: RoundData): boolean {
        const stmt = this.db.prepare(SONGS_UPDATE);
        try {
            stmt.run(data.title || 0, data.artist || 0, data.plays || 0, song_id);
            logger.info(
                `Added ${data.title} title guesses, ${data.artist} artist guesses, ${data.plays} plays to song ${song_id}`
            );
        } catch (e) {
            logger.warn(`Error while updating plays for song ${song_id}: ${e}`);
            return false;
        }
        return true;
    }

    /** Retrieve songs for a playlist. 
     *  On DB error, returns empty list
    */
    getSongs(playlist_id: string): Track[] {
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

    /** Load full config from cache, or update it from the DB. 
     *  On error, returns null. 
    */
    getConfig(force_update?: boolean): Config | null {
        if (!force_update && this.configCache) {
            return this.configCache;
        }
        const stmt = this.db.prepare(GET_ALL_CONFIG);
        const configMap = new Map<string, string>();
        try {
            for (var row of stmt.iterate()) {
                configMap.set(row.key, row.value);
            }
        } catch (e) {
            logger.error(`Error while getting full config: ${e}`);
            return null;
        }
        let config: Config = {
            ws_port: configify(enforceNum(configMap.get('ws_port')), 8080),
            auth_callback_addr: configify(configMap.get('auth_callback_addr'), 'http://localhost:8080/'),
            auth_callback_port: configify(enforceNum(configMap.get('auth_callback_port')), 8080),
            spotify: {
                accessToken: configify(configMap.get('spotify.accessToken')),
                clientId: configify(configMap.get('spotify.clientId')),
                clientSecret: configify(configMap.get('spotify.clientSecret')),
                refreshToken: configify(configMap.get('spotify.refreshToken')),
            }
        };
        this.configCache = config;
        return config;
    }

    /** Load single config value from cache, or update *the whole config cache*. 
     *  On DB error, returns null
    */
    getConfigValue(key: string, force_update?: boolean): string | null {
        if (!force_update && this.configCache) {
            const cacheVal = key.split('.').reduce((o,i)=> o ? o[i] : null, this.configCache as any)?.val;
            if (cacheVal) {
                return cacheVal.toString();
            }
        }
        const stmt = this.db.prepare(GET_CONFIG);
        let value: string | null = null;
        try {
            value = stmt.get(key)?.value;
        } catch (e) {
            logger.error(`Error while getting config value ${key}: ${e}`);
        }
        return value as string | null;
    }

    /** Set config value, updates whole cache as well. 
     *  If fail to update cache, clear cache.
    */
    setConfig(key: string, val: string | null): boolean {
        const stmt = this.db.prepare(SET_CONFIG);
        try {
            stmt.run(key, val);
        } catch (e) {
            logger.error(`Error while setting config value ${key}: ${e}`);
            return false;
        }
        const config = this.getConfig(true);
        config ? this.configCache = config : this.configCache = null;
        return true;
    }
}

export interface Config {
    ws_port: ConfigValue<number>;
    auth_callback_addr:  ConfigValue<string>; // INCLUDES PORT!!
    auth_callback_port:  ConfigValue<number>;
    spotify: SpotifyConfig;
} 

export interface SpotifyConfig {
    accessToken:  ConfigValue<string | null>;
    clientId:  ConfigValue<string | null>;
    clientSecret:  ConfigValue<string | null>;
    refreshToken:  ConfigValue<string | null>;
}

export type ConfigValue<T> = {val: T, default?: true};

function enforceNum(val: string | undefined): number | null {
    if (!val) {return null;}
    const num = parseFloat(val);
    return (isNaN(num)) ? null : num;
}

function configify<T>(val: T | undefined | null) : ConfigValue<T | null>;
function configify<T>(val: T | undefined | null, def: T): ConfigValue<T>;
function configify<T>(val: T | undefined | null, def?: T): ConfigValue<T> | ConfigValue<T | null> {
    if (!val && def) {
        return {
            val: def,
            default: true
        }  
    } else {
        return {
            val: val as T | null
        }
    }
}

export interface Track {
    id: string;
    preview_url: string | null;
    image_url: string;
    title: string;
    artists: Array<string>;
}

export interface TrackList {
    songs: Track[],
    played: Set<Track>
}


/** Pick an unplayed song for the next track. */
export function getRandomUnplayedTrack(list: TrackList) {
    var track;
    do {
        track = list.songs[Math.floor(Math.random() * list.songs.length)];
    } while (list.played.has(track));
    return track;
}

/** Create database and tables.
 * DB filename is set in the environment variable DB_FILE or is 'data.db'.
 * SONGS table: song_id, preview_url, img_url, title, artists, add_time, plays, title_guessed, artist_guessed
 * PLAYLISTS table: playlist_id, last_updated
 * CONTENTS: playlist_id, song_id
 * CONFIG: key, value
 *  -- foreign keys
 */
function open_db(db_file?: string) {
    let db: Database;
    const db_path = db_file || process.env.DB_FILE || 'data.db';

    logger.info('Opening database.');
    db = new sqlite3('data.db', {});
    
    const trans = db.transaction(() => {
        db.pragma('foreign_keys = ON;');
        db.exec(SONGS_CREATE);
        db.exec(PLAYLIST_CREATE);
        db.exec(CONTENTS_CREATE);
        db.exec(CONFIG_CREATE);
        db.pragma('user_version = 2;');
    });
    trans();

    const ver = db.pragma('user_version', { simple: true });
    if (ver < 1) {
        logger.info('Migrating database to version 1 (plays tracking)');
        const trans = db.transaction(() => {
            V1_ALTERS.forEach((alter) => db.exec(alter));
            db.pragma('user_version = 1;');
        });
        trans();
    }
    if (ver < 2) {
        logger.info('Migrating database to version 2 (config)');
        const trans = db.transaction(() => {
            db.exec(CONFIG_CREATE);
            db.pragma('user_version = 2;');
        });
        trans();
    }

    return db;
}
