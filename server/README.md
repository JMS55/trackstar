Before doing anything, run:

    npm install

---

The file "tracks.json" must be present the top level of the server directory for
the server to run. If it is not, or to update it, run:

    npm run update_tracks <playlist_id> <access_token>

To get an access token:
1. Go to https://developer.spotify.com/console/get-playlist-tracks/
2. Make sure you're logged into the Spotify Developer Console
3. Scroll down
4. Click "GET TOKEN"
5. Select only "playlist-read-private"
6. Click "REQUEST TOKEN"
7. Scroll down after it redirects
8. Copy the text in the "OAuth Token" box

---

To start the server, run:

    npm start
