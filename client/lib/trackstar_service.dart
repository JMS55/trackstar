import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class Player {
  String userName;
  int score = 0;
  Player(this.userName);
}

class TrackStarService extends ChangeNotifier {
  late Stream<dynamic> responses;
  final ws = WebSocketChannel.connect(Uri.parse('ws://104.248.230.123:8080'));
  late StreamSubscription<PlayerJoined> playerJoinedSubscription;
  late StreamSubscription<PlayerLeft> playerLeftSubscription;
  late StreamSubscription<TrackStarted> trackStartedSubscription;
  late StreamSubscription<TrackEnded> trackEndedSubscription;
  late StreamSubscription<MakeGuessResponse> guessResponseSubscription;
  late StreamSubscription<CorrectGuessMade> correctResponseSubscription;

  late String userName;
  late String? trackName, trackArtists;
  late int playerId, waitTime;
  int? roomId;
  int trackNumber = -1, startTime = 0;
  bool guessedTitle = false, guessedArtist = false;
  AudioPlayer audioPlayer = AudioPlayer();
  Map<int, Player> players = {};
  Map<int, List> correctGuesses = {};

  TrackStarService() {
    responses = ws.stream.asBroadcastStream();

    audioPlayer.setReleaseMode(ReleaseMode.STOP);

    playerJoinedSubscription =
        responseStream<PlayerJoined>().listen((PlayerJoined msg) {
      players[msg.playerId] = Player(msg.playerName);

      notifyListeners();
    });

    playerLeftSubscription =
        responseStream<PlayerLeft>().listen((PlayerLeft msg) {
      players.remove(msg.playerId);

      notifyListeners();
    });

    trackStartedSubscription =
        responseStream<TrackStarted>().listen((TrackStarted msg) async {
      trackNumber = msg.trackNumber;
      startTime = msg.startTime;
      guessedArtist = false;
      guessedTitle = false;
      trackName = null;
      trackArtists = null;

      await audioPlayer.play(msg.trackUrl);

      notifyListeners();
    });

    trackEndedSubscription =
        responseStream<TrackEnded>().listen((TrackEnded msg) {
      trackName = msg.trackName;
      trackArtists = msg.trackArtists;
      waitTime = msg.waitTime;

      List sortedGuesses = [];
      SplayTreeMap<int, String>.from(
              correctGuesses,
              (pid1, pid2) =>
                  correctGuesses[pid1]![2].compareTo(correctGuesses[pid2]![2]))
          .forEach((k, v) => sortedGuesses.add(k));
      if (sortedGuesses.isNotEmpty) {
        players[sortedGuesses[0]]?.score += 4;
      } else if (sortedGuesses.length >= 2) {
        players[sortedGuesses[1]]?.score += 3;
      } else if (sortedGuesses.length >= 3) {
        players[sortedGuesses[2]]?.score += 2;
      }

      notifyListeners();
    });

    guessResponseSubscription =
        responseStream<MakeGuessResponse>().listen((MakeGuessResponse msg) {
      if (msg.result == 'correct_artist') {
        guessedArtist = true;
        notifyListeners();
      } else if (msg.result == 'correct_title') {
        guessedTitle = true;
        notifyListeners();
      }
    });

    correctResponseSubscription =
        responseStream<CorrectGuessMade>().listen((CorrectGuessMade msg) {
      if (correctGuesses[msg.playerId] == null) {
        correctGuesses[msg.playerId] = [false, false, 0];
      }

      if (msg.fieldGuessed == 'title' &&
          correctGuesses[msg.playerId]![0] != true) {
        correctGuesses[msg.playerId]![0] = true;
        players[playerId]?.score += 1;
      } else if (msg.fieldGuessed == 'artist' &&
          correctGuesses[msg.playerId]![1] != true) {
        correctGuesses[msg.playerId]![1] = true;
        players[playerId]?.score += 1;
      }

      if (correctGuesses[msg.playerId]![0] &&
          correctGuesses[msg.playerId]![1]) {
        correctGuesses[msg.playerId]![2] = msg.timeOfGuess;
      }

      notifyListeners();
    });
  }

  Future<CreateRoomResponse> createRoom() async {
    ws.sink.add(jsonEncode(CreateRoomRequest(userName).toJson()));
    CreateRoomResponse response =
        await responseStream<CreateRoomResponse>().first;
    if (response.status != 'success') {
      throw Error();
    } else {
      return response;
    }
  }

  Future<JoinRoomResponse> joinRoom() async {
    ws.sink.add(jsonEncode(JoinRoomRequest(roomId!, userName).toJson()));
    JoinRoomResponse response = await responseStream<JoinRoomResponse>().first;
    if (response.status != 'success') {
      throw Error();
    } else {
      return response;
    }
  }

  Future<void> leaveRoom() async {
    ws.sink.add(jsonEncode(LeaveRoomRequest(roomId!, playerId).toJson()));
    LeaveRoomResponse response =
        await responseStream<LeaveRoomResponse>().first;
    if (response.status != 'success') {
      throw Error();
    }
  }

  Future<void> startGame() async {
    ws.sink.add(jsonEncode(StartGameRequest(roomId!).toJson()));
    StartGameResponse response =
        await responseStream<StartGameResponse>().first;
    if (response.status != 'success') {
      throw Error();
    }
  }

  Future<void> makeGuess(String guess) async {
    ws.sink
        .add(jsonEncode(MakeGuessRequest(roomId!, playerId, guess).toJson()));
  }

  Stream<T> responseStream<T extends Response>() {
    return responses
        .map((m) => Response.fromJson(jsonDecode(m)))
        .where((m) => m is T)
        .cast<T>();
  }

  @override
  Future<void> dispose() async {
    await audioPlayer.stop();
    await audioPlayer.release();

    if (roomId != null) {
      await leaveRoom();
    }

    await playerJoinedSubscription.cancel();
    await playerLeftSubscription.cancel();
    await trackStartedSubscription.cancel();
    await guessResponseSubscription.cancel();
    await correctResponseSubscription.cancel();
    ws.sink.close();

    super.dispose();
  }
}

// -----------------------------------------------------------------------------

@JsonSerializable(fieldRename: FieldRename.snake)
class CreateRoomRequest {
  String topic = 'create_room';
  String creatorName;

  CreateRoomRequest(this.creatorName);
  Map<String, dynamic> toJson() => _$CreateRoomRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class CreateRoomResponse extends Response {
  final String status;
  final int roomId;
  final int creatorId;

  CreateRoomResponse(this.status, this.roomId, this.creatorId);
  factory CreateRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$CreateRoomResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class JoinRoomRequest {
  String topic = 'join_room';
  int roomId;
  String playerName;

  JoinRoomRequest(this.roomId, this.playerName);
  Map<String, dynamic> toJson() => _$JoinRoomRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class JoinRoomResponse extends Response {
  final String status;
  final int playerId;

  JoinRoomResponse(this.status, this.playerId);
  factory JoinRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$JoinRoomResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class LeaveRoomRequest {
  String topic = 'leave_room';
  int roomId, playerId;

  LeaveRoomRequest(this.roomId, this.playerId);
  Map<String, dynamic> toJson() => _$LeaveRoomRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class LeaveRoomResponse extends Response {
  final String status;

  LeaveRoomResponse(this.status);
  factory LeaveRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$LeaveRoomResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class StartGameRequest {
  String topic = 'start_game';
  int roomId;
  StartGameRequest(this.roomId);
  Map<String, dynamic> toJson() => _$StartGameRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class StartGameResponse extends Response {
  final String status;

  StartGameResponse(this.status);
  factory StartGameResponse.fromJson(Map<String, dynamic> json) =>
      _$StartGameResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class MakeGuessRequest {
  String topic = 'make_guess';
  int timeOfGuess = DateTime.now().millisecondsSinceEpoch;
  int roomId, playerId;
  String guess;
  MakeGuessRequest(this.roomId, this.playerId, this.guess);
  Map<String, dynamic> toJson() => _$MakeGuessRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class MakeGuessResponse extends Response {
  final String result;
  MakeGuessResponse(this.result);
  factory MakeGuessResponse.fromJson(Map<String, dynamic> json) =>
      _$MakeGuessResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class TrackStarted extends Response {
  final String trackUrl;
  final int trackNumber, startTime;
  TrackStarted(this.trackUrl, this.trackNumber, this.startTime);
  factory TrackStarted.fromJson(Map<String, dynamic> json) =>
      _$TrackStartedFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class TrackEnded extends Response {
  final String trackName, trackArtists;
  final int waitTime;
  TrackEnded(this.trackName, this.trackArtists, this.waitTime);
  factory TrackEnded.fromJson(Map<String, dynamic> json) =>
      _$TrackEndedFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class CorrectGuessMade extends Response {
  final String fieldGuessed;
  final int playerId, timeOfGuess;
  CorrectGuessMade(this.playerId, this.fieldGuessed, this.timeOfGuess);
  factory CorrectGuessMade.fromJson(Map<String, dynamic> json) =>
      _$CorrectGuessMadeFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class RoundOver extends Response {
  RoundOver();
  factory RoundOver.fromJson(Map<String, dynamic> json) =>
      _$RoundOverFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class PlayerJoined extends Response {
  final String playerName;
  final int playerId;
  PlayerJoined(this.playerId, this.playerName);
  factory PlayerJoined.fromJson(Map<String, dynamic> json) =>
      _$PlayerJoinedFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class PlayerLeft extends Response {
  final int playerId;
  PlayerLeft(this.playerId);
  factory PlayerLeft.fromJson(Map<String, dynamic> json) =>
      _$PlayerLeftFromJson(json);
}

abstract class Response {
  Response();
  factory Response.fromJson(Map<String, dynamic> json) {
    switch (json['topic']) {
      case 'create_room_response':
        return CreateRoomResponse.fromJson(json);
      case 'join_room_response':
        return JoinRoomResponse.fromJson(json);
      case 'leave_room_response':
        return LeaveRoomResponse.fromJson(json);
      case 'start_game_response':
        return StartGameResponse.fromJson(json);
      case 'make_guess_response':
        return MakeGuessResponse.fromJson(json);
      case 'track_started':
        return TrackStarted.fromJson(json);
      case 'track_ended':
        return TrackEnded.fromJson(json);
      case 'correct_guess_made':
        return CorrectGuessMade.fromJson(json);
      case 'round_over':
        return RoundOver();
      case 'player_joined':
        return PlayerJoined.fromJson(json);
      case 'player_left':
        return PlayerLeft.fromJson(json);
      default:
        throw ArgumentError('Unknown type');
    }
  }
}
