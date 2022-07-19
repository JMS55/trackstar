import { Track } from '../src/data';
import { isCorrectArtist, isCorrectTitle } from '../src/validation';

const sampleTracks: Track[] = [
    {
        id: '3tqyYWC9Um2ZqU0ZN849H',
        preview_url: '',
        image_url: '',
        title: 'No Hands (feat. Roscoe Dash & Wale)',
        artists: ['Waka Flocka Flame', 'Roscoe Dash', 'Wale'],
    },
];

describe('test basic validation', () => {
    test('should return true with same', () => {
        expect(isCorrectTitle(sampleTracks[0], 'No Hands')).toBeTruthy();
        expect(isCorrectArtist(sampleTracks[0], 'Waka Flocka Flame')).toBeTruthy();
    });

    test('one letter off returns true', () => {
        expect(isCorrectTitle(sampleTracks[0], 'Np Hands')).toBeTruthy();
        expect(isCorrectTitle(sampleTracks[0], 'No hanes')).toBeTruthy();
        expect(isCorrectTitle(sampleTracks[0], 'No Hand')).toBeTruthy();
        expect(isCorrectTitle(sampleTracks[0], 'gNo Hands')).toBeTruthy();
    });

    test('further off returns false', () => {
        expect(isCorrectTitle(sampleTracks[0], 'gp Hands')).toBeFalsy();
        expect(isCorrectTitle(sampleTracks[0], 'No hanet')).toBeFalsy();
        expect(isCorrectTitle(sampleTracks[0], 'No Han')).toBeFalsy();
        expect(isCorrectTitle(sampleTracks[0], 'o Hand')).toBeFalsy();
    });

    test('wrong returns false', () => {
        expect(isCorrectTitle(sampleTracks[0], 'good 4 u')).toBeFalsy();
        expect(isCorrectArtist(sampleTracks[0], 'beethoven')).toBeFalsy();
    });
});
