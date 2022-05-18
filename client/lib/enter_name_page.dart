import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'lobby_page.dart';
import 'trackstar_service.dart';
import 'widgets/single_input_page.dart';

class EnterNamePage extends StatelessWidget {
  const EnterNamePage({Key? key, required this.isCreatingRoom})
      : super(key: key);

  final bool isCreatingRoom;

  @override
  Widget build(BuildContext context) {
    return SingleInputPage(label: 'Name', onSubmit: nextPage);
  }

  Future<void> nextPage(BuildContext context, String input) async {
    TrackStarService trackStarService = Provider.of(context, listen: false);
    trackStarService.userName = input;
    if (isCreatingRoom) {
      await trackStarService.createRoom();
    } else {
      await trackStarService.joinRoom();
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => LobbyPage(isRoomCreator: isCreatingRoom),
      ),
    );
  }
}
