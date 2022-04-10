const util = require('util');
const fetch = require('node-fetch');
const Spotify = require('spotify-web-api-node');

const TRACK_PULL_LIMIT = 100;
const WEB_SCRAPE_TIMEOUT = 500;

class Track {
    constructor(id, preview_url, title, authors) {
        this.id = id;
        this.preview_url = preview_url;
        this.title = title;
        this.artists = artists;
    }
}

const spotify = new Spotify();
var tracks = new Array();

function isCorrectTitle(track, guess) {
    return closeEnough(simplifyString(simplifyTitle(track.title)), simplifyString(guess));
}

function isCorrectArtist(track, guess) {
    guessSimple = simplifyString(guess);
    for (const artist of track.artists) {
        artistSimple = simplifyString(artist);
        if (closeEnough(artistSimple, guessSimple) || closeEnough(artist, 'the' + guessSimple)) {
            return true;
        }
    };
    return false;
}

function simplifyString(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function simplifyTitle(title) {
    [/^\(.*\)\s+(.*)$/, /^(.*)\s+\(.*\)$/, /^(.*)\s+-.*$/, /^(.*)\s+\/.*$/].forEach(regex => {
        found = title.match(regex);
        if (found) {
            title = found[1];
        }
    });
    return title;
}

function closeEnough(s1, s2) {
    var m = s1.length, n = s2.length, count = 0, i = 0, j = 0;
    if (Math.abs(m - n) > 1) return false;
    while (i < m && j < n) {
        if (s1.charAt(i) != s2.charAt(j)) {
            if (count == 1) return false;
            if (m > n) i++;
            else if (m < n) j++;
            else { i++; j++; }
            count++;
        }
        else { i++; j++; }
    }
    if (i < m || j < n) count++;
    return count <= 1;
}

function getRandomTrack() {
    return tracks[Math.floor(Math.random() * tracks.length)];
}

function getRandomUnplayedTrack(played_track_urls) {
    var track;
    do {
        track = getRandomTrack();
    } while (played_track_urls.has(track.preview_url))
    return track;
}

function removeItem(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

function removeNullTracks() {
    const goodTracks = new Array();
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
            console.log(error);
        } finally {
            clearTimeout(timeout);
        }
    };
}

async function pullTracks(playlist_id, token) {
    spotify.setAccessToken(token);
    await pullTracksAux(playlist_id, token, 0);
    await fillMissingUrls();
    console.log(tracks.length);
    removeNullTracks();
    console.log(tracks.length);
}

async function pullTracksAux(playlist_id, token, offset) {
    const data = await spotify.getPlaylistTracks(playlist_id, {
        offset: offset,
        limit: TRACK_PULL_LIMIT,
        fields: 'items.track(id,name,preview_url,artists.name)'
    });
    const items = data.body.items;
    items.forEach(item => {
        const track = item.track;
        artists = new Array();
        track.artists.forEach(artist => {
            artists.push(artist.name);
        })
        tracks.push(new Track(track.id, track.preview_url, track.name, artists));
    });
    if (items.length == TRACK_PULL_LIMIT) {
        await pullTracksAux(playlist_id, token, offset + TRACK_PULL_LIMIT);
    }
}

const auth_token = process.env.TS_SPOTIFY_AUTH_TOKEN;
const playlist_id = process.env.TS_PLAYLIST_ID;

pullTracks(playlist_id, auth_token);

module.exports = { isCorrectTitle, isCorrectArtist, getRandomUnplayedTrack };
