import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:audioplayers/audioplayers.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  late WebSocketChannel ws;
  late StreamSubscription stream;
  final audioPlayer = AudioPlayer();
  void Function(void Function())? changeSignal;

  int roomId = -1;
  String userName;

  GameState gameState = GameState.initial;
  int trackNumber = 0;
  int tracksPerRound = -1;
  int trackStartTime = -1;
  int timeBetweenTracks = -1;

  bool guessedTitle = false;
  bool guessedArtist = false;
  Map<String, Standing> leaderboard = {};

  String trackTitle = "";
  List<String> trackArtists = [];

  TrackStarService({
    int? roomId,
    required this.userName,
    required this.changeSignal,
  }) {
    this.roomId = roomId ?? Random().nextInt(99999);

    leaderboard = {userName: Standing(0, 0, Progress.noneCorrect, Place.none)};

    audioPlayer.onPlayerCompletion.listen((_) {
      gameState = GameState.betweenTracks;

      guessedTitle = false;
      guessedArtist = false;

      signalChange();
    });

    ws = WebSocketChannel.connect(Uri(
      scheme: 'ws',
      host: '104.248.230.123',
      port: 8080,
      pathSegments: [this.roomId.toString(), userName],
    ));

    stream = ws.stream.map((msg) => jsonDecode(msg)).listen((msg) {
      String topic = msg['topic'];
      if (topic == PlayersChangedMessage.topic) {
        handlePlayersChanged(PlayersChangedMessage.fromJson(msg));
      }
      if (topic == GameConfigMessage.topic) {
        handleGameConfig(GameConfigMessage.fromJson(msg));
      }
      if (topic == TrackInfoMessage.topic) {
        handleTrackInfo(TrackInfoMessage.fromJson(msg));
      }
      if (topic == GuessResultMessage.topic) {
        handleGuessResult(GuessResultMessage.fromJson(msg));
      }
      if (topic == LeaderBoardMessage.topic) {
        handleLeaderBoard(LeaderBoardMessage.fromJson(msg));
      }
    });
  }

  void startGame() {
    ws.sink.add(jsonEncode(
        StartGameCommand(tracksPerRound: 15, timeBetweenTracks: 10).toJson()));
  }

  void startRound() {
    ws.sink.add(jsonEncode(StartRoundCommand().toJson()));
  }

  void makeGuess(String guess) {
    ws.sink.add(jsonEncode(MakeGuessCommand(guess).toJson()));
  }

  void handlePlayersChanged(PlayersChangedMessage msg) {
    leaderboard.removeWhere((player, _) => !msg.players.contains(player));

    for (String player in msg.players) {
      leaderboard.putIfAbsent(
        player,
        () => Standing(0, 0, Progress.noneCorrect, Place.none),
      );
    }

    signalChange();
  }

  void handleGameConfig(GameConfigMessage msg) {
    timeBetweenTracks = msg.timeBetweenTracks;
    tracksPerRound = msg.tracksPerRound;

    signalChange();
  }

  void handleTrackInfo(TrackInfoMessage msg) {
    trackNumber = msg.trackNumber;
    trackStartTime = msg.whenToStart;
    trackTitle = msg.title;
    trackArtists = msg.aritsts;

    Duration delayUntilTrackStart =
        DateTime.fromMillisecondsSinceEpoch(trackStartTime, isUtc: true)
            .difference(DateTime.now().toUtc());
    Future.delayed(
      delayUntilTrackStart,
      () {
        gameState = GameState.guessing;
        audioPlayer.play(msg.url, isLocal: false);

        signalChange();
      },
    );
  }

  void handleGuessResult(GuessResultMessage msg) {
    if (msg.result == GuessResult.correctTitle) {
      guessedTitle = true;
    }

    if (msg.result == GuessResult.correctArtist) {
      guessedArtist = true;
    }

    signalChange();
  }

  void handleLeaderBoard(LeaderBoardMessage msg) {
    leaderboard = msg.leaderboard;

    signalChange();
  }

  void disconnect() {
    audioPlayer.stop();
    ws.sink.close();
  }

  void signalChange() {
    if (changeSignal != null) {
      changeSignal!(() {});
    }
  }
}

enum GameState { initial, guessing, betweenTracks }

// -----------------------------------------------------------------------------

@JsonSerializable(fieldRename: FieldRename.snake)
class StartGameCommand {
  String topic = 'start_game_command';
  int tracksPerRound;
  int timeBetweenTracks;

  StartGameCommand(
      {required this.tracksPerRound, required this.timeBetweenTracks});
  factory StartGameCommand.fromJson(Map<String, dynamic> json) =>
      _$StartGameCommandFromJson(json);
  Map<String, dynamic> toJson() => _$StartGameCommandToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class StartRoundCommand {
  String topic = 'start_round_command';

  StartRoundCommand();
  factory StartRoundCommand.fromJson(Map<String, dynamic> json) =>
      _$StartRoundCommandFromJson(json);
  Map<String, dynamic> toJson() => _$StartRoundCommandToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class MakeGuessCommand {
  String topic = 'make_guess_command';
  String guess;
  int timeOfGuess = DateTime.now().millisecondsSinceEpoch;

  MakeGuessCommand(this.guess);
  factory MakeGuessCommand.fromJson(Map<String, dynamic> json) =>
      _$MakeGuessCommandFromJson(json);
  Map<String, dynamic> toJson() => _$MakeGuessCommandToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class PlayersChangedMessage {
  static const String topic = 'players_changed';
  final List<String> players;

  PlayersChangedMessage(this.players);
  factory PlayersChangedMessage.fromJson(Map<String, dynamic> json) =>
      _$PlayersChangedMessageFromJson(json);
  Map<String, dynamic> toJson() => _$PlayersChangedMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class GameConfigMessage {
  static const String topic = 'game_config';
  final int timeBetweenTracks;
  final int tracksPerRound;

  GameConfigMessage(this.timeBetweenTracks, this.tracksPerRound);
  factory GameConfigMessage.fromJson(Map<String, dynamic> json) =>
      _$GameConfigMessageFromJson(json);
  Map<String, dynamic> toJson() => _$GameConfigMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class TrackInfoMessage {
  static const String topic = 'track_info';
  final String url;
  final String title;
  final List<String> aritsts;
  final int trackNumber;
  final int whenToStart;

  TrackInfoMessage(
      this.url, this.title, this.aritsts, this.trackNumber, this.whenToStart);
  factory TrackInfoMessage.fromJson(Map<String, dynamic> json) =>
      _$TrackInfoMessageFromJson(json);
  Map<String, dynamic> toJson() => _$TrackInfoMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class GuessResultMessage {
  static const String topic = 'guess_result';
  final GuessResult result;

  GuessResultMessage(this.result);
  factory GuessResultMessage.fromJson(Map<String, dynamic> json) =>
      _$GuessResultMessageFromJson(json);
  Map<String, dynamic> toJson() => _$GuessResultMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class LeaderBoardMessage {
  static const String topic = 'leaderboard';
  Map<String, Standing> leaderboard;

  LeaderBoardMessage(this.leaderboard);
  factory LeaderBoardMessage.fromJson(Map<String, dynamic> json) =>
      _$LeaderBoardMessageFromJson(json);
  Map<String, dynamic> toJson() => _$LeaderBoardMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class Standing {
  final int score;
  final int pointsFromCurrentTrack;
  final Progress progress;
  final Place place;

  Standing(this.score, this.pointsFromCurrentTrack, this.progress, this.place);
  factory Standing.fromJson(Map<String, dynamic> json) =>
      _$StandingFromJson(json);
  Map<String, dynamic> toJson() => _$StandingToJson(this);
}

@JsonEnum(fieldRename: FieldRename.snake)
enum GuessResult { correctTitle, correctArtist, incorrect }

@JsonEnum(fieldRename: FieldRename.snake)
enum Progress { correctTitle, correctArtist, bothCorrect, noneCorrect }

@JsonEnum(fieldRename: FieldRename.snake)
enum Place { first, second, third, none }
