
import { Track } from './spotify';

export function isCorrectTitle(track: Track, guess: string) {
    return closeEnough(simplifyString(simplifyTitle(track.title)), simplifyString(guess));
}

export function isCorrectArtist(track: Track, guess: string) {
    const guessSimple = simplifyString(guess);
    for (const artist of track.artists) {
        const artistSimple = simplifyString(artist);
        if (closeEnough(artistSimple, guessSimple) || closeEnough(artist, 'the' + guessSimple)) {
            return true;
        }
    };
    return false;
}

function simplifyString(str: string) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function simplifyTitle(title: string) {
    [/^\(.*\)\s+(.*)$/, /^(.*)\s+\(.*\)$/, /^(.*)\s+-.*$/, /^(.*)\s+\/.*$/].forEach(regex => {
        const found = title.match(regex);
        if (found) {
            title = found[1];
        }
    });
    return title;
}

function closeEnough(s1: string, s2: string) {
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
