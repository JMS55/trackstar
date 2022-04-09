import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  TrackStarService() {
    responses = ws.stream.asBroadcastStream();
  }

  final ws = WebSocketChannel.connect(Uri.parse('ws://104.248.230.123:8080'));
  late Stream<dynamic> responses;

  late String userName;
  int? roomId;
  late int playerId;

  Stream<T> responseStream<T extends Response>() {
    return responses
        .map((m) => Response.fromJson(jsonDecode(m)))
        .where((m) => m is T)
        .cast<T>();
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

  Future<void> joinRoom() async {
    ws.sink.add(jsonEncode(JoinRoomRequest(roomId!, userName).toJson()));
    JoinRoomResponse response = await responseStream<JoinRoomResponse>().first;
    if (response.status != 'success') {
      throw Error();
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

  Future<void> shutdown() async {
    if (roomId != null) {
      await leaveRoom();
    }

    ws.sink.close();
  }
}

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
  final String topic, trackUrl;
  final int trackNumber, startTime;
  TrackStarted(this.topic, this.trackUrl, this.trackNumber, this.startTime);
  factory TrackStarted.fromJson(Map<String, dynamic> json) =>
      _$TrackStartedFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class TrackEnded extends Response {
  final String trackName, trackArtists;
  TrackEnded(this.trackName, this.trackArtists);
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
  final int roomId, playerId;
  PlayerJoined(this.roomId, this.playerId, this.playerName);
  factory PlayerJoined.fromJson(Map<String, dynamic> json) =>
      _$PlayerJoinedFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class PlayerLeft extends Response {
  final int roomId, playerId;
  PlayerLeft(this.roomId, this.playerId);
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