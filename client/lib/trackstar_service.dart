import 'dart:convert';

import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'trackstar_service.g.dart';

class TrackStarService {
  final WebSocketChannel ws =
      WebSocketChannel.connect(Uri.parse('ws://localhost:8080'));

  late String userName;

  Future<void> createRoom() async {
    ws.sink.add(jsonEncode(CreateRoomRequest(userName).toJson()));
    CreateRoomResponse response =
        CreateRoomResponse.fromJson(jsonDecode(await ws.stream.first));
    if (!(response.topic == 'create_room_response' &&
        response.status == 'success')) {
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
class CreateRoomResponse {
  final String topic;
  final String status;
  final String roomId;
  final String creatorId;

  CreateRoomResponse(this.topic, this.status, this.roomId, this.creatorId);
  factory CreateRoomResponse.fromJson(Map<String, dynamic> json) =>
      _$CreateRoomResponseFromJson(json);
}
