import 'package:flutter_countdown_timer/flutter_countdown_timer.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'widgets/page_card.dart';
import 'trackstar_service.dart';

class GamePage extends StatefulWidget {
  const GamePage({Key? key, required this.trackStarService}) : super(key: key);

  final TrackStarService trackStarService;

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> {
  final textController = TextEditingController();

  @override
  void initState() {
    widget.trackStarService.notifiyChanged = setState;
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return PageCard(
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
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          Text(
            'Track ${widget.trackStarService.trackNumber}/${widget.trackStarService.tracksPerRound}',
            style: const TextStyle(
              color: Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
            ),
          ),
          CountdownTimer(
            endTime: widget.trackStarService.trackStartTime + 1000 * 30,
            endWidget: const Text('Track over',
                style: TextStyle(
                    color: Color.fromARGB(255, 5, 6, 92), fontSize: 18)),
            textStyle: const TextStyle(
                color: Color.fromARGB(255, 5, 6, 92), fontSize: 18),
          ),
        ]),
        Padding(
          padding: const EdgeInsets.all(16),
          child: ListView.separated(
            // TODO: Use active players
            itemCount: 0,
            itemBuilder: (BuildContext context, int index) {
              // PlayerInfo player =
              //     widget.trackStarService.players.values.elementAt(index);
              return Text(
                // '${player.userName}: ${player.score}',
                '',
                style: const TextStyle(
                  color: Color.fromARGB(255, 5, 6, 92),
                  fontSize: 18,
                ),
              );
            },
            separatorBuilder: (BuildContext context, int index) =>
                const Divider(),
            shrinkWrap: true,
          ),
        ),
        const SizedBox(height: 36),
        (widget.trackStarService.trackTitle == null
            ? Column(
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
                        decoration:
                            const InputDecoration.collapsed(hintText: ""),
                        controller: textController,
                      ),
                    ),
                  ),
                ],
              )
            : Text(
                'That song was ${widget.trackStarService.trackTitle} by ${widget.trackStarService.trackArtists!.join(', ')}!')),
        const SizedBox(height: 24),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(
            'Title',
            style: TextStyle(
              color: widget.trackStarService.guessedTitle
                  ? const Color.fromARGB(255, 20, 148, 24)
                  : const Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
            ),
          ),
          const SizedBox(width: 24),
          Text(
            'Artist',
            style: TextStyle(
              color: widget.trackStarService.guessedArtist
                  ? const Color.fromARGB(255, 20, 148, 24)
                  : const Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
            ),
          )
        ])
      ]),
      floatingActionButton: NeumorphicFloatingActionButton(
        style: NeumorphicTheme.currentTheme(context)
            .appBarTheme
            .buttonStyle
            .copyWith(color: const Color.fromARGB(255, 49, 69, 106)),
        child: const Icon(Icons.send_rounded,
            color: Color.fromARGB(255, 222, 228, 238)),
        onPressed: () => widget.trackStarService.makeGuess(textController.text),
      ),
    );
  }

  @override
  void dispose() {
    widget.trackStarService.disconnect();
    super.dispose();
  }
}
