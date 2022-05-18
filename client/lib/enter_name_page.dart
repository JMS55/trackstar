import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'lobby_page.dart';
import 'trackstar_service.dart';
import 'widgets/single_input_page.dart';

class EnterNamePage extends StatelessWidget {
  const EnterNamePage({
    Key? key,
    this.roomId,
    required this.isRoomCreator,
  }) : super(key: key);

  final int? roomId;
  final bool isRoomCreator;

  @override
  Widget build(BuildContext context) {
    return SingleInputPage(label: 'Name', onSubmit: nextPage);
  }

  void nextPage(BuildContext context, String input) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LobbyPage(
          trackStarService: TrackStarService(roomId: roomId, userName: input),
          isRoomCreator: isRoomCreator,
        ),
      ),
    );
  }
}
