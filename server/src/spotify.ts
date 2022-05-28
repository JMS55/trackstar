import fetch from 'node-fetch';
import Spotify from 'spotify-web-api-node';
import { logger } from './server';
import { TrackList } from './data';

/** Max tracks Spotify will let us read from a playlist */
const TRACK_PULL_LIMIT = 100;

/** Max time to try scraping a preview URL */
const WEB_SCRAPE_TIMEOUT = 500;

const API_INSTANCE = new Spotify();

/** Delete any tracks that don't have a preview URL */
function removeTracksWithNullURL(tracks: TrackList): TrackList {
    tracks.filter((t) => t.preview_url);
    return tracks;
}

/** Recursively get all tracks from the playlist with the given ID */
async function pullTracks(
    playlist_id: string,
    token: string,
    offset = 0
): Promise<TrackList> {
    //Get raw track data
    const data = await API_INSTANCE.getPlaylistTracks(playlist_id, {
        offset: offset,
        limit: TRACK_PULL_LIMIT,
        fields: 'items.track(id,name,preview_url,artists.name)',
    });

    //Check if call was successful
    if (data.statusCode != 200) {
        logger.warn(`Error response from Spotify: ${data.body}`);
        return [];
    }

    //Convert to track objects and add to track array
    //const items = data.body.items;
    const songItems = data.body.items.map((item) => {
        const track = item.track;
        const artists: string[] = track.artists.map((artist) => artist.name);
        return {
            id: track.id,
            preview_url: track.preview_url,
            title: track.name,
            artists: artists,
        };
    });

    //Recur if last request returned max items
    if (songItems.length == TRACK_PULL_LIMIT) {
        const newTracks = await pullTracks(
            playlist_id,
            token,
            offset + TRACK_PULL_LIMIT
        );
        return songItems.concat(newTracks);
    }
    return songItems;
}

/**
 * Spotify's API will often not return a preview URL for a track even if it is
 * available. However, we can scrape the track's embed page and usually get the
 * URL. Sometimes, though, the URL will still be missing or the request will
 * take too long, so we set a timeout and try/catch the whole process.
 */
async function fillMissingUrls(tracks: TrackList): Promise<TrackList> {
    const trackProm = Promise.all(
        tracks.map(async (track) => {
            //Continue if track already has a preview URL
            if (track.preview_url) {
                return track;
            }

            //Configure web request
            const embed_url =
                'https://open.spotify.com/embed/track/' + track.id;
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
                const preview_url = tail.substring(
                    0,
                    tail.indexOf('%3Fcid%3D')
                );
                track.preview_url = decodeURIComponent(preview_url);
            } catch (err) {
                logger.warn(`Error fetching track preview URL: ${err}`);
            } finally {
                clearTimeout(timeout);
                return track;
            }
        })
    );
    return await trackProm;
}

/** Update tracks.json with the tracks from the given playlist */
export async function fetchTracks(
    playlist_id: string,
    access_token: string
): Promise<TrackList> {
    API_INSTANCE.setAccessToken(access_token);
    let tracks = await pullTracks(playlist_id, access_token, 0);
    tracks = await fillMissingUrls(tracks);
    tracks = removeTracksWithNullURL(tracks);
    return tracks;
}
