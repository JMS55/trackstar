import Spotify from 'spotify-web-api-node';
import { logger } from './server';
import { TrackList, TrackStore } from './data';
import Express from 'express';

/** Max tracks Spotify will let us read from a playlist */
const TRACK_PULL_LIMIT = 100;

/** Max time to try scraping a preview URL */
const WEB_SCRAPE_TIMEOUT = 500;

const API_INSTANCE = new Spotify();

/** Recursively get all tracks from the playlist with the given ID */
async function pullTracks(playlist_id: string, offset = 0): Promise<TrackList> {
    //Get raw track data
    const data = await API_INSTANCE.getPlaylistTracks(playlist_id, {
        offset: offset,
        limit: TRACK_PULL_LIMIT,
        fields: 'items.track(id,name,preview_url,album(images),artists.name)',
    });

    //Check if call was successful
    if (data.statusCode != 200) {
        logger.warn(`Error response from Spotify: ${data.body}`);
        return [];
    }

    //Convert to track objects and add to track array
    //const items = data.body.items;
    const songItems: TrackList = data.body.items.map((item) => {
        const track = item.track;
        const artists: string[] = track.artists.map((artist) => artist.name);
        const img = track.album.images[0].url;
        return {
            id: track.id,
            preview_url: track.preview_url,
            image_url: img,
            title: track.name,
            artists: artists,
        };
    });

    //Recur if last request returned max items
    if (songItems.length == TRACK_PULL_LIMIT) {
        const newTracks = await pullTracks(playlist_id, offset + TRACK_PULL_LIMIT);
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
            const embed_url = 'https://open.spotify.com/embed/track/' + track.id;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), WEB_SCRAPE_TIMEOUT);

            //Attempt to scrape the embed page
            try {
                const response = await fetch(embed_url, {
                    signal: controller.signal,
                });
                const body = await response.text();
                const tail = body.substring(body.indexOf('preview_url') + 20);
                const preview_url = tail.substring(0, tail.indexOf('%3Fcid%3D'));
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

export function auth(client_id_param?: string, client_secret_param?: string) {
    //Open database and get configs
    const data = new TrackStore();
    if (client_id_param && client_secret_param) {
        data.setConfig('spotify.clientId', client_id_param);
        data.setConfig('spotify.clientSecret', client_secret_param);
    }
    const config = data.getConfig();
    const scopes = ['playlist-read-private'],
    redirectUri = config.auth_callback_addr.val,
    clientId = config.spotify.clientId.val,
    clientSecret = config.spotify.clientSecret.val,
    state = Math.random().toString(36).slice(2);
    
    if (config.auth_callback_addr.default) {
        logger.warn(`No redirect URI in DB. Using default of ${redirectUri}`);
    }
    if (!clientId || !clientSecret) {
        logger.error('Spotify auth failed: no client ID or secret. Load properties into DB');
        return;
    }

    // create callback web server and listen for response
    const spotifyApi = new Spotify({
        redirectUri: redirectUri,
        clientId: clientId,
        clientSecret: clientSecret,
    });

    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
    console.log("\n\n***********************************\n*** AUTH INSTRUCTIONS\n***\n***")
    console.log('*** 1. GO TO:')
    console.log(`***\n*** https://developer.spotify.com/dashboard/applications/${clientId}`);
    console.log(`***\n***\n*** 2. ADD THIS LINK AS A REDIRECT URI:`);
    console.log(`***\n*** ${redirectUri}`)
    console.log("***\n***\n*** 3. AUTHORIZE THE APP VIA THIS LINK:");
    console.log(`***\n*** ${authorizeURL}`);
    console.log("***\n***********************************");
    var app = Express();
    app.get('/callback', async function(req, res) {
        const ret_state = req.query.state;
        const code = req.query.code;
        const error = req.query.error;
        if (ret_state != state) {
            logger.error("Returned state does not match.");
            process.exit(1);  
        }
        if (error) {
            logger.error(`Error from spotify: ${error}`);
            process.exit(1);
        }

        let api_res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(clientId + ':' + clientSecret).toString('base64')}`
            },
            body:`grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`
        }).then(function(response) {
            return response.json();
        }).catch(function(err) {
            logger.error(`Error getting access token: ${err}`);
            process.exit(1);
        });
        //TODO: Set DB fields
        data.setConfig('spotify.accessToken', api_res.access_token);
        data.setConfig('spotify.refreshToken', api_res.refresh_token);
        res.send("Success! You can close this window.");
        console.log("Done.");
        process.exit(0);
    
    });
    app.listen(config.auth_callback_port.val);
}

/** Update tracks.json with the tracks from the given playlist */
export async function fetchTracks(playlist_id: string, access_token: string): Promise<TrackList> {
    API_INSTANCE.setAccessToken(access_token);
    let tracks = await pullTracks(playlist_id, 0);
    tracks = await fillMissingUrls(tracks);
    return tracks;
}
