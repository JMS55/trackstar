Before doing anything, run:

    npm install

---

The server populates a SQLite3 database with songs and playlist information.
On first install, or to update a playlist, run

    npm start <playlist_id> <access_token>

This starts the server once the songs are retrieved.

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
