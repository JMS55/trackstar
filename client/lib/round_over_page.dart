import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/trackstar_service.dart';
import 'package:trackstar/game_page.dart';

class RoundOverPage extends StatelessWidget {
  const RoundOverPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Future<void> newRound() async {
      TrackStarService trackStarService =
          Provider.of<TrackStarService>(context, listen: false);
      await trackStarService.startGame();
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => GamePage()),
      );
    }

    TrackStarService trackStarService =
        Provider.of<TrackStarService>(context, listen: false);

    int roomCode = trackStarService.roomId!;

    Widget playersList = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => ListView(
              children: trackStarService.players.values
                  .map((player) => Text('${player.userName}: ${player.score}'))
                  .toList(),
              shrinkWrap: true,
            ));

    return Scaffold(
        appBar: AppBar(title: const Text('TrackStar')),
        body: Center(
            child: Column(children: [
          Text("Code: " + roomCode.toString()),
          const Text("Round Over!"),
          playersList
        ])),
        floatingActionButton: NeumorphicFloatingActionButton(
          style: NeumorphicTheme.currentTheme(context)
              .appBarTheme
              .buttonStyle
              .copyWith(color: const Color.fromARGB(255, 49, 69, 106)),
          child: const Icon(Icons.navigate_next_rounded,
              color: Color.fromARGB(255, 222, 228, 238)),
          onPressed: () => newRound(),
        ));
  }
}
