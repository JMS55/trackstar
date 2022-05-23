import sqlite3, { Database } from 'sqlite3';

class DataStore {
    private db: Database;

    constructor() {
        this.db = open_db();
    }

    loadSongs(tracks: TrackList) {
        const stmt = this.db.prepare("INSERT INTO songs VALUES (?)");
    }
    
    getSongs(playlist_id: string) {
        const stmt = "SELECT * FROM Users \n"
                    + "JOIN UserPermissions USING (UserLogin);"
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
    + "    ON DELETE CASCADE ,\n"
    
    + ");");
    return db;
}

open_db();