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

    Widget guesser = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Padding(
          padding: EdgeInsets.only(left: 8),
          child: Text(
            'Guess (Song Title or Artist)',
            style: TextStyle(
              color: Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Neumorphic(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: TextField(
              cursorColor: const Color.fromARGB(255, 5, 6, 92),
              style: const TextStyle(
                color: Color.fromARGB(255, 5, 6, 92),
                fontSize: 22,
              ),
              decoration: const InputDecoration.collapsed(hintText: ""),
              controller: textController,
            ),
          ),
        ),
      ],
    );

    Widget displayText =
        Consumer<TrackStarService>(builder: (context, trackStarService, child) {
      if (trackStarService.trackName == null) {
        return guesser;
      } else {
        return Text(
            'That song was ${trackStarService.trackName} by ${trackStarService.trackArtists!.join(', ')}!');
      }
    });

    Widget trackNumber = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text(
              'Track ${trackStarService.trackNumber}/15',
              style: const TextStyle(
                color: Color.fromARGB(255, 5, 6, 92),
                fontSize: 18,
              ),
            ));

    Widget endTime = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => CountdownTimer(
            endTime: trackStarService.startTime + 1000 * 30,
            endWidget: const Text('Track over',
                style: TextStyle(
                    color: Color.fromARGB(255, 5, 6, 92), fontSize: 18)),
            textStyle: const TextStyle(
                color: Color.fromARGB(255, 5, 6, 92), fontSize: 18)));

    Widget playersList = Consumer<TrackStarService>(
      builder: (context, trackStarService, child) => ListView.separated(
        itemCount: trackStarService.players.length,
        itemBuilder: (BuildContext context, int index) {
          var player = trackStarService.players.values.elementAt(index);
          return Text(
            '${player.userName}: ${player.score}',
            style: const TextStyle(
              color: Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
            ),
          );
        },
        separatorBuilder: (BuildContext context, int index) => const Divider(),
        shrinkWrap: true,
      ),
    );

    Widget guessedTitle = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text(
              'Title',
              style: TextStyle(
                color: trackStarService.guessedTitle
                    ? const Color.fromARGB(255, 20, 148, 24)
                    : const Color.fromARGB(255, 5, 6, 92),
                fontSize: 18,
              ),
            ));

    Widget guessedArtist = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => Text(
              'Artist',
              style: TextStyle(
                color: trackStarService.guessedArtist
                    ? const Color.fromARGB(255, 20, 148, 24)
                    : const Color.fromARGB(255, 5, 6, 92),
                fontSize: 18,
              ),
            ));

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Neumorphic(
            style: NeumorphicStyle(
              depth: 15,
              boxShape: NeumorphicBoxShape.roundRect(
                  const BorderRadius.all(Radius.circular(28))),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 84, horizontal: 36),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
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
                          text: ' $roomCode ',
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
                const SizedBox(height: 12),
                Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      trackNumber,
                      endTime,
                    ]),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: playersList,
                ),
                const SizedBox(height: 36),
                displayText,
                const SizedBox(height: 24),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  guessedTitle,
                  const SizedBox(width: 24),
                  guessedArtist
                ])
              ]),
            ),
          ),
        ),
      ),
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
