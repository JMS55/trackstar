import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  TrackStarService() {
    responses = ws.stream.asBroadcastStream();
  }

  final WebSocketChannel ws =
      WebSocketChannel.connect(Uri.parse('ws://localhost:8080'));
  late Stream<dynamic> responses;

  late String userName;

  Stream<T> responseStream<T extends Response>() {
    return responses
        .map((m) => Response.fromJson(jsonDecode(m)))
        .where((m) => m is T)
        .cast<T>();
  }

  Future<void> createRoom() async {
    ws.sink.add(jsonEncode(CreateRoomRequest(userName).toJson()));
    CreateRoomResponse response =
        await responseStream<CreateRoomResponse>().first;
    if (response.status != 'success') {
      throw Error();
    }
  }

  void shutdown() {
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
  final String roomId;
  final String creatorId;

  CreateRoomResponse(this.status, this.roomId, this.creatorId);
  factory CreateRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$CreateRoomResponseFromJson(json);
}

abstract class Response {
  Response();
  factory Response.fromJson(Map<String, dynamic> json) {
    switch (json['topic']) {
      case 'create_room_response':
        return CreateRoomResponse.fromJson(json);
      default:
        throw ArgumentError('Unknown type');
    }
  }
}
