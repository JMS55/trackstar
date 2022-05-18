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
  void Function(void Function())? notifiyChanged;

  int roomId = -1;
  String userName;

  int trackNumber = -1;
  int tracksPerRound = -1;
  int trackStartTime = -1;
  int timeBetweenTracks = -1;

  bool guessedTitle = false;
  bool guessedArtist = false;
  Map<String, Standing> leaderboard = {};

  String trackTitle = "";
  List<String> trackArtists = [];

  TrackStarService({int? roomId, required this.userName}) {
    this.roomId = roomId ?? Random().nextInt(99999);

    ws = WebSocketChannel.connect(Uri(
      scheme: 'ws',
      host: '104.248.230.123',
      port: 8080,
      pathSegments: [roomId.toString(), userName],
    ));

    // TODO: Need to signal to the UI whether to show trackTitle/trackArtists or not
    audioPlayer.onPlayerCompletion.listen((_) {});

    stream = ws.stream.map((msg) => jsonDecode(msg)).listen((msg) {
      String topic = msg['topic'];
      if (topic == PlayersChangedMessage.topic) {
        handlePlayersChanged(PlayersChangedMessage.fromJson(msg));
      }
      if (topic == GameStartedMessage.topic) {
        handleGameStarted(GameStartedMessage.fromJson(msg));
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

      if (notifiyChanged != null) {
        notifiyChanged!(() {});
      }
    });
  }

  void startGame() {
    ws.sink.add(jsonEncode(StartGameCommand(15, 10).toJson()));
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
          player, () => Standing(0, 0, Progress.noneCorrect, Place.none));
    }
  }

  void handleGameStarted(GameStartedMessage msg) {
    timeBetweenTracks = msg.timeBetweenTracks;
    tracksPerRound = msg.tracksPerRound;
  }

  void handleTrackInfo(TrackInfoMessage msg) {
    trackNumber = msg.trackNumber;
    trackStartTime = msg.whenToStart;
    trackTitle = msg.title;
    trackArtists = msg.aritsts;

    var delay = DateTime.fromMillisecondsSinceEpoch(trackStartTime, isUtc: true)
        .difference(DateTime.now().toUtc());
    Future.delayed(delay, () => audioPlayer.play(msg.url, isLocal: false));
  }

  void handleGuessResult(GuessResultMessage msg) {
    if (msg.result == GuessResult.correctTitle) {
      guessedTitle = true;
    }

    if (msg.result == GuessResult.correctArtist) {
      guessedArtist = true;
    }
  }

  void handleLeaderBoard(LeaderBoardMessage msg) {
    leaderboard = msg.leaderboard;
  }

  void disconnect() {
    ws.sink.close();
  }
}

// -----------------------------------------------------------------------------

@JsonSerializable(fieldRename: FieldRename.snake)
class StartGameCommand {
  final String topic = 'start_game_command';
  final int tracksPerRound;
  final int timeBetweenTracks;

  StartGameCommand(this.tracksPerRound, this.timeBetweenTracks);
  factory StartGameCommand.fromJson(Map<String, dynamic> json) =>
      _$StartGameCommandFromJson(json);
  Map<String, dynamic> toJson() => _$StartGameCommandToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class StartRoundCommand {
  final String topic = 'start_round_command';

  StartRoundCommand();
  factory StartRoundCommand.fromJson(Map<String, dynamic> json) =>
      _$StartRoundCommandFromJson(json);
  Map<String, dynamic> toJson() => _$StartRoundCommandToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class MakeGuessCommand {
  final String topic = 'make_guess_command';
  final String guess;
  final int timeOfGuess = DateTime.now().millisecondsSinceEpoch;

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
class GameStartedMessage {
  static const String topic = 'game_started';
  final int timeBetweenTracks;
  final int tracksPerRound;

  GameStartedMessage(this.timeBetweenTracks, this.tracksPerRound);
  factory GameStartedMessage.fromJson(Map<String, dynamic> json) =>
      _$GameStartedMessageFromJson(json);
  Map<String, dynamic> toJson() => _$GameStartedMessageToJson(this);
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
  final Map<String, Standing> leaderboard;

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
