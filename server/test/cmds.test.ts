
import TrackStore from "../src/data";
jest.mock('../src/data');

let spotify: any;

beforeEach(() => {
    jest.resetModules();
    spotify = require('../src/spotify');
  });

afterEach(() => jest.resetAllMocks());

describe('test positive cmds', () => {
    test('auth no params', () => {
        process.argv = ['node', 'server.js', 'auth'];
        const mock = jest.spyOn(spotify, 'auth').mockImplementation(() => {});
        
        require('../src/cmds');
        expect(mock).toBeCalledWith(expect.anything());
    });

    test('auth 2 params', () => {
        process.argv = ['node', 'server.js', 'auth', 'blah', 'blah'];

        const mock = jest.spyOn(spotify, 'auth').mockImplementation(() => {});
        
        require('../src/cmds');
        expect(mock).toBeCalledWith(expect.anything(), 'blah', 'blah');
    });

    test('get-config', () => {
        process.argv = ['node', 'server.js', 'get-config', 'blah'];

        require('../src/cmds');
        expect(TrackStore).toBeCalledWith('blah');
        
    });

    test('get-all-config', () => {
        process.argv = ['node', 'server.js', 'get-all-config'];

        require('../src/cmds');
        expect(mockgetAllConfig).toBeCalledWith();
        
    });

    test('set-config erase', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah', 'default'];

        require('../src/cmds');
        expect(mocksetConfig).toBeCalledWith('blah', null);
    });

    test('set-config real', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah', 'blaah'];

        require('../src/cmds');
        expect(mocksetConfig).toBeCalledWith('blah', 'blaah');
    });

    test('update-tracks', async () => {
        process.argv = ['node', 'server.js', 'update-tracks', 'blah'];

        const mock = jest.spyOn(spotify, 'fetchTracks').mockImplementation(() => Promise.resolve([[], "a", "a"]));
        mockgetAllConfig.mockImplementationOnce(() => {
            return {spotify: {accessToken: 'blah', refreshToken: 'blah'}};
        })

        await require('../src/cmds');

        expect(mockLoadSongs).toBeCalled();
        expect(mocksetConfig).toBeCalledWith('spotify.accessToken', 'a');
        expect(mocksetConfig).toBeCalledWith('spotify.refreshToken', 'a');

        expect(mock).toBeCalledWith(expect.anything(), expect.anything());

    });

    test('update-tracks no returned tokens', async () => {
        process.argv = ['node', 'server.js', 'update-tracks', 'blah'];

        const mock = jest.spyOn(spotify, 'fetchTracks').mockImplementation(() => Promise.resolve([[], "", ""]));
        mockgetAllConfig.mockImplementationOnce(() => {
            return {spotify: {accessToken: 'blah', refreshToken: 'blah'}};
        })

        await require('../src/cmds');

        expect(mockLoadSongs).toBeCalled();
        expect(mocksetConfig).not.toBeCalled();
        expect(mocksetConfig).not.toBeCalled();

        expect(mock).toBeCalledWith(expect.anything(), expect.anything());

    });
});

describe('test negative cmds', () => {
    test('get-config no config', () => {
        process.argv = ['node', 'server.js', 'get-config'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    })

    test('other comd', () => {
        process.argv = ['node', 'server.js', 'hi'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    })

    test('no set config value', () => {
        process.argv = ['node', 'server.js', 'set-config', 'blah'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    })

    test('no set config key+value', () => {
        process.argv = ['node', 'server.js', 'set-config'];
        jest.spyOn(global.console, 'error');

        require('../src/cmds');
        expect(console.error).toBeCalled();
    })
});
