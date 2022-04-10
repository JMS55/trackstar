import 'package:flutter_countdown_timer/flutter_countdown_timer.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/trackstar_service.dart';

external int get millisecondsSinceEpoch;

class GamePage extends StatelessWidget {
  GamePage({Key? key}) : super(key: key);

  final textController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    Future<void> makeGuess(guess) async {
      TrackStarService trackStarService =
          Provider.of<TrackStarService>(context, listen: false);
      await trackStarService.makeGuess(guess);
    }

    TrackStarService trackStarService =
        Provider.of<TrackStarService>(context, listen: false);

    int roomCode = trackStarService.roomId!;

    Widget trackNumber = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text(
              trackStarService.trackNumber.toString(),
            ));

    Widget endTime = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => CountdownTimer(
              endTime: trackStarService.startTime + 1000 * 30,
            ));

    Widget playersList = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => ListView(
              children: trackStarService.players.values
                  .map((player) => Text('$player.userName: $player.score'))
                  .toList(),
              shrinkWrap: true,
            ));

    Widget guessedTitle = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text('Title',
            style: trackStarService.guessedTitle
                ? const TextStyle(color: Colors.green)
                : const TextStyle(color: Colors.black)));

    Widget guessedArtist = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text('Artist',
            style: trackStarService.guessedArtist
                ? const TextStyle(color: Colors.green)
                : const TextStyle(color: Colors.black)));

    Widget answers = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text(trackStarService
                    .trackName ==
                null
            ? ''
            : 'The song was ${trackStarService.trackName} by ${trackStarService.trackArtists}!'));

    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
          child: Column(children: [
        Text(roomCode.toString()),
        trackNumber,
        endTime,
        playersList,
        guessedTitle,
        guessedArtist,
        trackStarService.trackName == null
            ? TextField(
                decoration: const InputDecoration(
                  labelText: 'Enter Guess (Song Title or Artist)',
                  border: UnderlineInputBorder(),
                ),
                keyboardType: TextInputType.text,
                controller: textController,
              )
            : answers,
      ])),
      floatingActionButton: NeumorphicFloatingActionButton(
        style: NeumorphicTheme.currentTheme(context)
            .appBarTheme
            .buttonStyle
            .copyWith(color: const Color.fromARGB(255, 49, 69, 106)),
        child: const Icon(Icons.navigate_next_rounded,
            color: Color.fromARGB(255, 222, 228, 238)),
        onPressed: () => makeGuess(textController.text),
      ),
    );
  }
}
