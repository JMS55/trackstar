import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'trackstar_service.dart';
import 'game_page.dart';
import 'widgets/page_card.dart';
import 'widgets/wide_button.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage({
    Key? key,
    required this.trackStarService,
    required this.isRoomCreator,
  }) : super(key: key);

  final TrackStarService trackStarService;
  final bool isRoomCreator;

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  bool navigatedAway = false;

  void startGame(BuildContext context) {
    widget.trackStarService.startGame();

    navigateToGamePage();
  }

  void navigateToGamePage() {
    navigatedAway = true;
    widget.trackStarService.changeSignal = null;
    Navigator.pushReplacement(
        context,
        MaterialPageRoute(
            builder: (context) =>
                GamePage(trackStarService: widget.trackStarService)));
  }

  @override
  void initState() {
    widget.trackStarService.changeSignal = setState;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.trackStarService.trackNumber == 1) {
      Future.delayed(Duration.zero, () => navigateToGamePage());
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
                text: ' ${widget.trackStarService.roomId} ',
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
        itemCount: widget.trackStarService.leaderboard.length,
        itemBuilder: (BuildContext context, int index) => Text(
          widget.trackStarService.leaderboard.keys.elementAt(index),
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

  @override
  void dispose() {
    if (!navigatedAway) {
      widget.trackStarService.disconnect();
    }
    super.dispose();
  }
}
