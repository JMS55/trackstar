/* eslint-disable no-console */
/* eslint-disable global-require */
const getConfig = jest.fn();
const setConfig = jest.fn();
const loadSongs = jest.fn();
const getConfigValue = jest.fn();
jest.mock('../src/data', () =>
    jest.fn().mockImplementation(() => ({
        getConfig,
        setConfig,
        loadSongs,
        getConfigValue,
    }))
);

let spotify: any;

global.console = {
    ...console,
    // uncomment to ignore a specific log level
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // warn: jest.fn(),
    error: jest.fn(),
};

beforeEach(() => {
    jest.resetModules();
    spotify = require('../src/spotify');
});

afterEach(() => jest.resetAllMocks());

describe('test positive cmds', () => {
    test('auth no params calls auth file', () => {
        process.argv = ['node', 'server.js', 'auth'];
        const mock = jest.spyOn(spotify, 'auth').mockImplementation(() => {});

        require('../src/cmds');
        expect(mock).toBeCalledWith(expect.anything());
    });

    test('auth 2 params calls auth file with params', () => {
        process.argv = ['node', 'server.js', 'auth', 'blah', 'blah'];

        const mock = jest.spyOn(spotify, 'auth').mockImplementation(() => {});

        require('../src/cmds');
        expect(mock).toBeCalledWith(expect.anything(), 'blah', 'blah');
    });

    test('get-config calls db', () => {
        process.argv = ['node', 'server.js', 'get-config', 'blah'];

        require('../src/cmds');
        expect(getConfigValue).toBeCalledWith('blah');
    });

    test('get-all-config calls db', () => {
        process.argv = ['node', 'server.js', 'get-all-config'];

        require('../src/cmds');
        expect(getConfig).toBeCalledWith();
    });

    test('set-config erase calls db', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah', 'default'];

        require('../src/cmds');
        expect(setConfig).toBeCalledWith('blah', null);
    });

    test('set-config real calls db', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah', 'blaah'];

        require('../src/cmds');
        expect(setConfig).toBeCalledWith('blah', 'blaah');
    });

    test('update-tracks calls spotify and db', async () => {
        process.argv = ['node', 'server.js', 'update-tracks', 'blah'];

        const mock = jest.spyOn(spotify, 'fetchTracks').mockImplementation(() => Promise.resolve([[], 'a', 'a']));
        getConfig.mockImplementationOnce(() => ({ spotify: { accessToken: 'blah', refreshToken: 'blah' } }));

        await require('../src/cmds');

        expect(loadSongs).toBeCalled();
        expect(setConfig).toBeCalledWith('spotify.accessToken', 'a');
        expect(setConfig).toBeCalledWith('spotify.refreshToken', 'a');

        expect(mock).toBeCalledWith(expect.anything(), expect.anything());
    });

    test('update-tracks wuth no returned tokens does not call db', async () => {
        process.argv = ['node', 'server.js', 'update-tracks', 'blah'];

        const mock = jest.spyOn(spotify, 'fetchTracks').mockImplementation(() => Promise.resolve([[], '', '']));
        getConfig.mockImplementationOnce(() => ({ spotify: { accessToken: 'blah', refreshToken: 'blah' } }));

        await require('../src/cmds');

        expect(loadSongs).toBeCalled();
        expect(setConfig).not.toBeCalled();
        expect(setConfig).not.toBeCalled();

        expect(mock).toBeCalledWith(expect.anything(), expect.anything());
    });
});

describe('test negative cmds', () => {
    test('get-config no config causes error', () => {
        process.argv = ['node', 'server.js', 'get-config'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    });

    test('other comd causes error', () => {
        process.argv = ['node', 'server.js', 'hi'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    });

    test('no set config value causes error', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    });

    test('no set config key+value causes error', () => {
        process.argv = ['node', 'server.js', 'set-config'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    });
});
