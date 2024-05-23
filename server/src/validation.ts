import type { Track } from './data';

/**
 * Regexes that match title elements we'd like to strip
 * @see {@link stripTitle}
 */
const TITLE_EXTRAS = [/^\(.*\)\s+(.*)$/, /^(.*)\s+\(.*\)$/, /^(.*)\s+\[.*\]$/, /^(.*)\s+-.*$/, /^(.*)\s+\/.*$/];

/**
 * Remove capitalization, accents, and non-alphanumeric characters
 * @param spell_amp Replace '&' with 'and' instead of removing it
 */
function simplifyString(str: string, spell_amp: boolean = false) {
    return str
        .normalize('NFD') // Separate letters from their accents
        .replace(/[\u0300-\u036f]/g, '') // Remove the accent characters
        .toLowerCase() // Lowercase
        .replace('&', spell_amp ? 'and' : '') // Either remove & or replace with 'and'
        .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumerics
}

/** Remove things like "(feat. Rihanna)" and "- Radio Edit" from title */
function stripTitle(title: string) {
    return [].concat(...new Array(8).fill(TITLE_EXTRAS)).reduce((a, r) => {
        const found = a.match(r);
        return found ? found[1] : a;
    }, title);
}

/** Return whether two strings are at most one modification away from each other */
function closeEnough(s1: string, s2: string) {
    const m = s1.length;
    const n = s2.length;
    let count = 0;
    let i = 0;
    let j = 0;
    if (Math.abs(m - n) > 1) return false;
    while (i < m && j < n) {
        if (s1.charAt(i) !== s2.charAt(j)) {
            if (count === 1) return false;
            if (m > n) i += 1;
            else if (m < n) j += 1;
            else {
                i += 1;
                j += 1;
            }
            count += 1;
        } else {
            i += 1;
            j += 1;
        }
    }
    if (i < m || j < n) count += 1;
    return count <= 1;
}

/** Return whether guess is close to the title */
export function isCorrectTitle(track: Track, guess: string) {
    const guessSimple = simplifyString(guess);
    const titleStripped = stripTitle(track.title);
    return (
        closeEnough(simplifyString(titleStripped), guessSimple) ||
        closeEnough(simplifyString(titleStripped, true), guessSimple)
    );
}

/** Return whether guess (or "the" + guess) is close to an artist */
export function isCorrectArtist(track: Track, guess: string): boolean {
    const guessSimple = simplifyString(guess);
    return (
        track.artists.find(
            (artist) =>
                closeEnough(simplifyString(artist), guessSimple) ||
                closeEnough(simplifyString(artist), `the${guessSimple}`) ||
                closeEnough(simplifyString(artist, true), guessSimple) ||
                closeEnough(simplifyString(artist, true), `the${guessSimple}`)
        ) !== undefined
    );
}
