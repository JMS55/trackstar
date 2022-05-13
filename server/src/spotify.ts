import fetch from 'node-fetch';
import Spotify from 'spotify-web-api-node';
import { sys } from 'typescript';

const TRACK_PULL_LIMIT = 100;
const WEB_SCRAPE_TIMEOUT = 500;

export interface Track {
    id: string,
    preview_url: string | null,
    title: string,
    artists: Array<string>
}

const spotify = new Spotify();
var tracks:Track[] = [];

export function getRandomUnplayedTrack(played_tracks: Set<Track>) {
    var track;
    do {
        track = tracks[Math.floor(Math.random() * tracks.length)];
    } while (played_tracks.has(track))
    return track;
}

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

async function pullTracks(playlist_id: string, token: string) {
    spotify.setAccessToken(token);
    await pullTracksAux(playlist_id, token, 0);
    await fillMissingUrls();
    removeNullTracks();
}

async function pullTracksAux(playlist_id: string, token: string, offset: number) {
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
        await pullTracksAux(playlist_id, token, offset + TRACK_PULL_LIMIT);
    }
}

const auth_token = process.env.TS_SPOTIFY_AUTH_TOKEN;
const playlist_id = process.env.TS_PLAYLIST_ID;
if (!(auth_token && playlist_id)) {
    console.error("Auth token and playlist id are not provided");
    sys.exit(1);
}
pullTracks(playlist_id!, auth_token!);

