import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'trackstar_service.dart';
import 'game_page.dart';
import 'widgets/page_card.dart';
import 'widgets/wide_button.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage({Key? key, required this.isRoomCreator}) : super(key: key);

  final bool isRoomCreator;

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  Future<void> startGame(BuildContext context) async {
    TrackStarService trackStarService = Provider.of(context, listen: false);
    await trackStarService.startGame();

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const GamePage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    TrackStarService trackStarService = Provider.of(context);
    if (trackStarService.trackNumber == 1) {
      Future.delayed(Duration.zero, () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const GamePage()),
        );
      });
    }

    List<Widget> col = <Widget>[
      FittedBox(
        fit: BoxFit.contain,
        child: RichText(
          text: TextSpan(
            text: 'Room Code ',
            style: const TextStyle(
              color: Color.fromARGB(255, 5, 6, 92),
              fontSize: 72,
              fontWeight: FontWeight.w500,
            ),
            children: [
              TextSpan(
                text: ' ${trackStarService.roomId!} ',
                style: const TextStyle(
                  color: Color.fromARGB(255, 222, 228, 238),
                  backgroundColor: Color.fromARGB(255, 5, 6, 92),
                  fontSize: 72,
                  fontWeight: FontWeight.w900,
                ),
              )
            ],
          ),
        ),
      ),
      ListView.separated(
        itemCount: trackStarService.players.length,
        itemBuilder: (BuildContext context, int index) => Text(
          trackStarService.players.values.elementAt(index).userName,
          style: const TextStyle(
            color: Color.fromARGB(255, 5, 6, 92),
            fontSize: 18,
          ),
        ),
        separatorBuilder: (BuildContext context, int index) => const Divider(),
        shrinkWrap: true,
      ),
    ];
    if (widget.isRoomCreator) {
      col.addAll([
        const SizedBox(height: 48),
        WideButton(label: 'Start Game', onPressed: startGame),
      ]);
    }

    return PageCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: col,
      ),
    );
  }
}
