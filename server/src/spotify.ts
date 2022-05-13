import fetch from 'node-fetch';
import Spotify from 'spotify-web-api-node';
import pkg from 'typescript'; const { sys } = pkg;
import fs from 'fs';
import { Track } from './tracks';

const TRACK_PULL_LIMIT = 100;
const WEB_SCRAPE_TIMEOUT = 500;

const spotify = new Spotify();
var tracks:Track[] = [];

function removeNullTracks() {
    const goodTracks:Track[] = [];
    tracks.forEach(track => {
        if (track.preview_url) {
            goodTracks.push(track)
        }
    });
    tracks = goodTracks;
}

async function fillMissingUrls() {
    for (const track of tracks) {
        if (track.preview_url) {
            continue;
        }
        const embed_url = 'https://open.spotify.com/embed/track/' + track.id;
        const AbortController = globalThis.AbortController;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEB_SCRAPE_TIMEOUT);
        try {
            const response = await fetch(embed_url, { signal: controller.signal });
            const body = await response.text();
            const tail = body.substring(body.indexOf('preview_url') + 20);
            const preview_url_encoded = tail.substring(0, tail.indexOf('%3Fcid%3D'));
            const preview_url = preview_url_encoded.replace('%3A', ':').replace(/%2F/g, '/')
            track.preview_url = preview_url;
        } catch (error) {
        } finally {
            clearTimeout(timeout);
        }
    };
}

async function pullTracks(playlist_id: string, token: string, offset: number) {
    const data = await spotify.getPlaylistTracks(playlist_id, {
        offset: offset,
        limit: TRACK_PULL_LIMIT,
        fields: 'items.track(id,name,preview_url,artists.name)'
    });
    const items = data.body.items;
    items.forEach(item => {
        const track = item.track;
        const artists:string[] = track.artists.map(artist => artist.name);
        tracks.push({
            id: track.id,
            preview_url: track.preview_url,
            title: track.name,
            artists: artists
        });
    });
    if (items.length == TRACK_PULL_LIMIT) {
        await pullTracks(playlist_id, token, offset + TRACK_PULL_LIMIT);
    }
}

async function updateCache(playlist_id: string, access_token: string) {
    spotify.setAccessToken(access_token);
    await pullTracks(playlist_id, access_token, 0);
    await fillMissingUrls();
    removeNullTracks();
    fs.writeFileSync('tracks.json', JSON.stringify(tracks));
}

const args = process.argv.slice(2);
if (args.length != 2) {
    console.error("Usage: npm run update_tracks <playlist_id> <access_token>");
    sys.exit(1);
}
const [playlist_id, access_token] = args;
updateCache(playlist_id!, access_token!);
