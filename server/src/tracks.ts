import fs from 'fs';



var tracks: Track[] = [];

export function getRandomUnplayedTrack(played_tracks: Set<Track>) {
    var track;
    do {
        track = tracks[Math.floor(Math.random() * tracks.length)];
    } while (played_tracks.has(track));
    return track;
}

/** Load tracks array from tracks.json file */
tracks = JSON.parse(fs.readFileSync('tracks.json', 'utf8'));
