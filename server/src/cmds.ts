import { TrackStore } from "./data";
import { DEFAULT_PLAYLIST } from "./server";
import { auth, fetchTracks } from "./spotify";

// not called directly, called by various npm scripts
const args = process.argv.slice(2);
const db = new TrackStore();
switch (args[0]) {
    case "auth":
        if (args.length >= 3) {
            auth(args[1], args[2]);
        } else {
            auth();
        }
        break;
    case "get-config":
        if (args.length < 2) {
            console.log("Need to specify a config key");
            break;
        }
        console.log(db.getConfigValue(args[1]));
        break;
    case "get-all-config": 
        console.log(db.getConfig());
        break;
    case "set-config":
        if (args.length < 3) {
            console.log("Need to specify a config key and value");
            break;
        }
        db.setConfig(args[1], args[2]);
        break;
    case "update-tracks":
        const playlist_id = args[1] || DEFAULT_PLAYLIST;
        const config = db.getConfig().spotify;
        console.log('Pulling tracks from spotify.');
        fetchTracks(playlist_id, config).then(([tracks, access, refresh]) => {
            console.log('Loading songs into database.');
            db.loadSongs(playlist_id, tracks);
            if (access) db.setConfig('spotify.accessToken', access);
            if (refresh) db.setConfig('spotify.refreshToken', refresh);
        });
        break;
    default:
        console.log("Unknown command");
}
