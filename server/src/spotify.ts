import fs from 'fs';
import fetch from 'node-fetch';
import Spotify from 'spotify-web-api-node';
import pkg from 'typescript';
const { sys } = pkg; //Workaround for import error
import { Track } from './tracks';

/** Max tracks Spotify will let us read from a playlist */
const TRACK_PULL_LIMIT = 100;

/** Max time to try scraping a preview URL */
const WEB_SCRAPE_TIMEOUT = 500;

const spotify = new Spotify();
var tracks: Track[] = [];

/** Delete any tracks that don't have a preview URL */
function removeTracksWithNullURL() {
    const goodTracks: Track[] = [];
    tracks.forEach((track) => {
        if (track.preview_url) {
            goodTracks.push(track);
        }
    });
    tracks = goodTracks;
}

/** Recursively get all tracks from the playlist with the given ID */
async function pullTracks(playlist_id: string, token: string, offset: number) {
    //Get raw track data
    const data = await spotify.getPlaylistTracks(playlist_id, {
        offset: offset,
        limit: TRACK_PULL_LIMIT,
        fields: 'items.track(id,name,preview_url,artists.name)',
    });

    //Convert to track objects and add to track array
    const items = data.body.items;
    items.forEach((item) => {
        const track = item.track;
        const artists: string[] = track.artists.map((artist) => artist.name);
        tracks.push({
            id: track.id,
            preview_url: track.preview_url,
            title: track.name,
            artists: artists,
        });
    });

    //Recur if last request returned max items
    if (items.length == TRACK_PULL_LIMIT) {
        await pullTracks(playlist_id, token, offset + TRACK_PULL_LIMIT);
    }
}

/**
 * Spotify's API will often not return a preview URL for a track even if it is
 * available. However, we can scrape the track's embed page and usually get the
 * URL. Sometimes, though, the URL will still be missing or the request will
 * take too long, so we set a timeout and try/catch the whole process.
 */
async function fillMissingUrls() {
    for (const track of tracks) {
        //Continue if track already has a preview URL
        if (track.preview_url) {
            continue;
        }

        //Configure web request
        const embed_url = 'https://open.spotify.com/embed/track/' + track.id;
        const AbortController = globalThis.AbortController;
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            WEB_SCRAPE_TIMEOUT
        );

        //Attempt to scrape the embed page
        try {
            const response = await fetch(embed_url, {
                signal: controller.signal,
            });
            const body = await response.text();
            const tail = body.substring(body.indexOf('preview_url') + 20);
            const preview_url_encoded = tail.substring(
                0,
                tail.indexOf('%3Fcid%3D')
            );
            const preview_url = preview_url_encoded
                .replace('%3A', ':')
                .replace(/%2F/g, '/');
            track.preview_url = preview_url;
        } catch (error) {
        } finally {
            clearTimeout(timeout);
        }
    }
}

/** Update tracks.json with the tracks from the given playlist */
async function updateCache(playlist_id: string, access_token: string) {
    spotify.setAccessToken(access_token);
    await pullTracks(playlist_id, access_token, 0);
    await fillMissingUrls();
    removeTracksWithNullURL();
    fs.writeFileSync('tracks.json', JSON.stringify(tracks));
}

const args = process.argv.slice(2);
if (args.length != 2) {
    console.error('Usage: npm run update_tracks <playlist_id> <access_token>');
    sys.exit(1);
}
const [playlist_id, access_token] = args;
updateCache(playlist_id!, access_token!);
