import TrackStore from './data';
import { DEFAULT_PLAYLIST, logger } from './server';
import { auth, fetchTracks } from './spotify';

/**
 * This file handles auxiliary functions for the server,
 * such as editing configs, authenticating, etc.
 * Most commands are called via an npm script, but could
 * be called manually if needed.
 */
const args = process.argv.slice(2);
const db = new TrackStore();
switch (args[0]) {
    // auth(client_id?, client_secret?)
    case 'auth':
        if (args.length >= 3) {
            auth(db, args[1], args[2]);
        } else {
            auth(db);
        }
        break;
    // get_config(key)
    case 'get-config':
        if (args.length < 2) {
            console.error('Need to specify a config key');
            break;
        }
        console.log(db.getConfigValue(args[1]));
        break;
    // get_all_config()
    case 'get-all-config':
        console.log(db.getConfig());
        break;
    // set_config(key, value)
    case 'set-config':
        if (args.length < 3) {
            console.error('Need to specify a config key and value');
            break;
        }
        if (args[2] == 'default') {
            db.setConfig(args[1], null);
        } else {
            db.setConfig(args[1], args[2]);
        }
        break;
    // update_tracks(playlist_id?)
    case 'update-tracks':
        const playlist_id = args[1] || DEFAULT_PLAYLIST;
        const config = db.getConfig()!.spotify;
        console.log('Pulling tracks from spotify.');
        fetchTracks(playlist_id, config).then(([tracks, access, refresh]) => {
            console.log('Loading songs into database.');
            db.loadSongs(playlist_id, tracks);
            if (access) db.setConfig('spotify.accessToken', access);
            if (refresh) db.setConfig('spotify.refreshToken', refresh);
        });
        break;
    default:
        console.error('Unknown command');
}
