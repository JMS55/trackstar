Before doing anything, run:

    npm install

---

Setup Process:

1. If you wish to run the server on a port different than the default of 8080,
run `npm run set-config ws_port <port>`
2. The server requires a Spotify client ID and client secret.
Visit the Spotify dashboard at https://developer.spotify.com/dashboard/applications 
to create an app or to see the client ID and secret.
3. The auth process requires a callback URL. If you are running the code on a 
machine without a web browser (a server), do the following:
    - Determine an IP/URL/port for your configuration that is accessible by browser
    This *can* be the same port as above but does not need to be
    - Run `npm run set-config auth_callback_addr <address>`
    This address should be http and include the port and a trailing slash
    (e.g. `http://localhost:8080/`)
    -  Run `npm run set-config auth_callback_port <port>` with the same port.
4. Run `npm auth <client_id> <client_secret>` and follow the prompts.

To start the server, run:

    npm start [playlist_id]

Providing a playlist is optional. On first install or with a new playlist,
the server will attempt to download the tracks from Spotify. 
Some tracks do not have an accessible preview and will display a warning. 
The auth process above must be completed first.

To update an existing playlist, run:

    npm run update-tracks [playlist_id]

Currently, this will only add new songs, it will not remove deleted songs.