import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  TrackStarService() {
    responses = ws.stream.asBroadcastStream();
  }

  final ws = WebSocketChannel.connect(Uri.parse('ws://localhost:8080'));
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

  Future<void> shutdown() async {
    if (roomId != null) {
      await leaveRoom();
    }

    ws.sink.close();
  }
}

@JsonSerializable(fieldRename: FieldRename.snake)
class CreateRoomRequest {
  final String topic = 'create_room';
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
  final String topic = 'join_room';
  int roomId;
  String playerName;

  JoinRoomRequest(this.roomId, this.playerName);
  Map<String, dynamic> toJson() => _$JoinRoomRequestToJson(this);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class JoinRoomResponse extends Response {
  final String status;
  int playerId;

  JoinRoomResponse(this.status, this.playerId);
  factory JoinRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$JoinRoomResponseFromJson(json);
}

@JsonSerializable(fieldRename: FieldRename.snake)
class LeaveRoomRequest {
  final String topic = 'leave_room';
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
      default:
        throw ArgumentError('Unknown type');
    }
  }
}
