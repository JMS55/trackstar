import { TrackStore } from "./data";
import { auth } from "./spotify";


const args = process.argv.slice(2);
if (args.length == 0) {
    console.log("Need to specify a command");
}
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
    default:
        console.log("Unknown command");
}
