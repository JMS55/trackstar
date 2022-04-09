import 'package:json_annotation/json_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class TrackStarService {
  final WebSocketChannel ws =
      WebSocketChannel.connect(Uri.parse('ws://localhost:8080'));

  late String userName;

  void createRoom() {
    ws.sink.add(CreateRoomRequest(userName));
  }

  void shutdown() {
    ws.sink.close();
  }
}

@JsonSerializable(fieldRename: FieldRename.snake)
class CreateRoomRequest {
  CreateRoomRequest(this.creatorName);

  final String topic = 'create_room';
  String creatorName;
}
