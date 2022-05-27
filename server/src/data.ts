import { Database } from 'sqlite3';
import { logger } from './server';

export class TrackStore {
    private readonly db: Database;

    constructor() {
        this.db = open_db();
    }

    loadSongs(playlist_id: string, tracks: TrackList) {
        const stmt = this.db.prepare("INSERT INTO songs VALUES (?)");

    }

    getSongs(playlist_id: string): TrackList {
        const stmt = this.db.prepare("SELECT s.* FROM contents cs \n"
                    + "INNER JOIN songs s on s.song_id = cs.song_id \n" + 
                    + "WHERE cs.playlist_id = ?;");
        let songs: Track[] = [];
        stmt.each((e, row) => {
            if (e) {
                logger.error(`Error while getting songs from playlist ${playlist_id}: ${e}`);
            } else {
                const artists = row.artists.split(',');
                songs.push({
                    id: row.song_id,
                    title: row.title,
                    artists: row.artists,
                    preview_url: row.preview_url,
                });
            }});
        return songs;
    }
}

export interface Track {
    id: string;
    preview_url: string | null;
    title: string;
    artists: Array<string>;
}

export type TrackList = readonly Track[];


function open_db(): Database {
    const db = new Database("data.db");
    db.run("PRAGMA foreign_keys = ON;");

    db.run("CREATE TABLE IF NOT EXISTS songs (\n"
    + "	song_id TEXT PRIMARY KEY,\n"
    + "	preview_url TEXT,\n"
    + " img_url TEXT,\n"
    + "	title TEXT NOT NULL,\n"
    + " artists TEXT NOT NULL,\n"
    + " add_time INT NOT NULL\n"
    + ");");    
    db.run("CREATE TABLE IF NOT EXISTS playlists (\n"
    + "	playlist_id TEXT PRIMARY KEY,\n"
    + " last_updated INT NOT NULL\n"
    + ");");
    db.run("CREATE TABLE IF NOT EXISTS contents (\n"
    + "	playlist_id TEXT NOT NULL,\n"
    + " song_id TEXT NOT NULL,\n"
    + " UNIQUE (playlist_id, song_id),\n"
    + " FOREIGN KEY (playlist_id) REFERENCES playlists (playlist_id)"
    + "    ON UPDATE CASCADE \n"
    + "    ON DELETE CASCADE ,\n"
    + " FOREIGN KEY (song_id) REFERENCES songs (song_id)"
    + "    ON UPDATE CASCADE \n"
    + "    ON DELETE CASCADE \n"
    + ");");
    return db;
}