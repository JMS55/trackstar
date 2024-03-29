import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:just_audio/just_audio.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  late WebSocketChannel ws;
  late StreamSubscription stream;
  void Function(void Function())? changeSignal;

  final audioPlayer = AudioPlayer();
  bool muted = false;

  int roomId = -1;
  String userName;

  Map<String, Standing> leaderboard = {};
  String host = '';

  GameState gameState = GameState.initial;
  int trackNumber = -1;
  int tracksPerRound = -1;
  int trackStartTime = -1;
  int timeBetweenTracks = -1;

  bool guessedTitle = false;
  bool guessedArtist = false;
  bool? lastGuessCorrect;

  String trackTitle = '';
  List<String> trackArtists = [];
  String albumCoverUrl = '';

  TrackStarService({
    int? roomId,
    required this.userName,
    required this.changeSignal,
  }) {
    this.roomId = roomId ?? Random().nextInt(9999);

    audioPlayer.setVolume(0);

    ws = WebSocketChannel.connect(Uri.parse(
      'wss://trackstar.ml/ws/${this.roomId}/$userName',
    ));

    stream = ws.stream.map((msg) => jsonDecode(msg)).listen((msg) {
      String topic = msg['topic'];
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
        StartGameCommand(tracksPerRound: 15, timeBetweenTracks: 15).toJson()));
  }

  void startRound() {
    gameState = GameState.guessing;

    ws.sink.add(jsonEncode(StartRoundCommand().toJson()));
  }

  void makeGuess(String guess) {
    ws.sink.add(jsonEncode(MakeGuessCommand(guess).toJson()));
  }

  void toggleMute() {
    muted = !muted;
    audioPlayer.setVolume(muted ? 0 : 0.1);
  }

  void setMuteOverride(bool mute) {
    if (mute) {
      audioPlayer.setVolume(0.0);
    } else {
      audioPlayer.setVolume(muted ? 0 : 0.1);
    }
  }

  void handleGameConfig(GameConfigMessage msg) {
    timeBetweenTracks = msg.timeBetweenTracks;
    tracksPerRound = msg.tracksPerRound;

    muted = userName != host;

    signalChange();
  }

  Future<void> handleTrackInfo(TrackInfoMessage msg) async {
    trackNumber = msg.trackNumber;
    trackStartTime = msg.whenToStart;

    await audioPlayer.setUrl(msg.url);

    Duration delayUntilTrackStart =
        DateTime.fromMillisecondsSinceEpoch(trackStartTime, isUtc: true)
            .difference(DateTime.now().toUtc());

    Future.delayed(
      delayUntilTrackStart,
      () {
        for (String username in leaderboard.keys) {
          leaderboard[username] = Standing(
              leaderboard[username]!.score,
              leaderboard[username]!.pointsFromCurrentTrack,
              Progress.noneCorrect,
              Place.none);
        }

        trackTitle = msg.title;
        trackArtists = msg.aritsts;
        albumCoverUrl = msg.albumCoverUrl;

        gameState = GameState.guessing;
        audioPlayer.play();

        signalChange();
      },
    );

    Future.delayed(delayUntilTrackStart + const Duration(seconds: 30), () {
      guessedTitle = false;
      guessedArtist = false;

      gameState = GameState.betweenTracks;

      if (trackNumber == tracksPerRound) {
        Future.delayed(Duration(seconds: timeBetweenTracks), () {
          gameState = GameState.roundEnd;
          signalChange();
        });
      }

      signalChange();
    });
  }

  void handleGuessResult(GuessResultMessage msg) {
    if (msg.result == GuessResult.correctTitle) {
      guessedTitle = true;
      lastGuessCorrect = true;
    }

    if (msg.result == GuessResult.correctArtist) {
      guessedArtist = true;
      lastGuessCorrect = true;
    }

    if (msg.result == GuessResult.incorrect) {
      lastGuessCorrect = false;
    }

    signalChange();
  }

  void handleLeaderBoard(LeaderBoardMessage msg) {
    leaderboard = msg.leaderboard;
    host = msg.host;

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

enum GameState { initial, guessing, betweenTracks, roundEnd }

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
  final String albumCoverUrl;
  final int trackNumber;
  final int whenToStart;

  TrackInfoMessage(this.url, this.title, this.aritsts, this.albumCoverUrl,
      this.trackNumber, this.whenToStart);
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
  final String host;

  LeaderBoardMessage(this.leaderboard, this.host);
  factory LeaderBoardMessage.fromJson(Map<String, dynamic> json) =>
      _$LeaderBoardMessageFromJson(json);
  Map<String, dynamic> toJson() => _$LeaderBoardMessageToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class Standing implements Comparable<Standing> {
  final int score;
  final int pointsFromCurrentTrack;
  final Progress progress;
  final Place place;

  Standing(this.score, this.pointsFromCurrentTrack, this.progress, this.place);
  factory Standing.fromJson(Map<String, dynamic> json) =>
      _$StandingFromJson(json);
  Map<String, dynamic> toJson() => _$StandingToJson(this);

  @override
  int compareTo(Standing other) {
    if (place != other.place) {
      return Enum.compareByIndex(place, other.place);
    } else if (progress != other.progress) {
      return Enum.compareByIndex(place, other.progress);
    } else {
      return (other.score + other.pointsFromCurrentTrack) -
          (score + pointsFromCurrentTrack);
    }
  }
}

@JsonEnum(fieldRename: FieldRename.snake)
enum GuessResult { correctTitle, correctArtist, incorrect }

@JsonEnum(fieldRename: FieldRename.snake)
enum Progress { bothCorrect, correctTitle, correctArtist, noneCorrect }

@JsonEnum(fieldRename: FieldRename.snake)
enum Place { first, second, third, none }
