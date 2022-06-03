import {TrackStore} from '../src/data';

describe('testing memory DB and tables', () => {
  test('new DB should have tables', () => {
      const db = new TrackStore(":memory:");
      try {
        db.db.exec("SELECT * from songs;");
        db.db.exec("SELECT * from playlists;");
        db.db.exec("SELECT * from contents;");
        db.db.exec("SELECT * from config;");
      } catch (e) {
          fail(e);
      }
  });
});