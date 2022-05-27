import 'dart:collection';
import 'dart:math';
import 'package:flutter_countdown_timer/current_remaining_time.dart';
import 'package:flutter_countdown_timer/flutter_countdown_timer.dart';
import 'package:flutter/material.dart';
import 'widgets.dart';
import 'trackstar_service.dart';

class GamePage extends StatefulWidget {
  const GamePage({Key? key, required this.trackStarService}) : super(key: key);

  final TrackStarService trackStarService;

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> {
  final guessController = TextEditingController();
  bool canGuess = false;

  @override
  Widget build(BuildContext context) {
    Widget page;
    switch (widget.trackStarService.gameState) {
      case GameState.initial:
        page = Container(
            alignment: Alignment.center,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.pause_circle_outline_rounded,
                  color: Theme.of(context).textTheme.headlineSmall!.color,
                  size: 36,
                ),
                const SizedBox(width: 8),
                Text(
                  'Waiting for the first track…',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ],
            ));
        break;
      case GameState.guessing:
        SplayTreeMap<String, Standing> leaderboard = SplayTreeMap.from(
          widget.trackStarService.leaderboard,
          (key1, key2) => widget.trackStarService.leaderboard[key1]!
              .compareTo(widget.trackStarService.leaderboard[key2]!),
        );

        page = Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.outline,
                    ),
                    borderRadius: const BorderRadius.all(Radius.circular(12)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ListView.separated(
                      itemCount: leaderboard.length,
                      itemBuilder: (BuildContext context, int index) {
                        String username = leaderboard.keys.elementAt(index);
                        Standing standing = leaderboard.values.elementAt(index);
                        Color avatarBorder;
                        switch (standing.place) {
                          case Place.first:
                            avatarBorder = Colors.amber.shade400;
                            break;
                          case Place.second:
                            avatarBorder = Colors.grey.shade400;
                            break;
                          case Place.third:
                            avatarBorder = Colors.brown.shade400;
                            break;
                          case Place.none:
                            avatarBorder = Colors.transparent;
                            break;
                        }

                        return ListTile(
                          leading: CircleAvatar(
                            radius: 24,
                            backgroundColor: avatarBorder,
                            child: AvatarCircle(username: username),
                          ),
                          title: Text(username),
                          subtitle: Text('Score: ${standing.score}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.music_note_rounded,
                                color: standing.progress ==
                                            Progress.correctTitle ||
                                        standing.progress ==
                                            Progress.bothCorrect
                                    ? Theme.of(context).colorScheme.primary
                                    : null,
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                Icons.brush_rounded,
                                color: standing.progress ==
                                            Progress.correctArtist ||
                                        standing.progress ==
                                            Progress.bothCorrect
                                    ? Theme.of(context).colorScheme.primary
                                    : null,
                              )
                            ],
                          ),
                          visualDensity: VisualDensity.compact,
                        );
                      },
                      separatorBuilder: (BuildContext context, int index) =>
                          const Divider(),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Column(children: [
                TextFieldM3(
                  hintText: 'Guess',
                  controller: guessController,
                ),
                const SizedBox(height: 16),
                // TODO: Cleanup this
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(children: [
                      widget.trackStarService.guessedTitle
                          ? Icon(
                              Icons.check_circle_outline_rounded,
                              color: Theme.of(context).colorScheme.primary,
                            )
                          : Transform.rotate(
                              angle: 45 * pi / 180,
                              child: Icon(
                                Icons.add_circle_outline_rounded,
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                      const SizedBox(width: 2),
                      Text(
                        'Title',
                        style: Theme.of(context).textTheme.titleLarge!.copyWith(
                              color: widget.trackStarService.guessedTitle
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.error,
                            ),
                      )
                    ]),
                    const SizedBox(width: 16),
                    Row(children: [
                      widget.trackStarService.guessedArtist
                          ? Icon(
                              Icons.check_circle_outline_rounded,
                              color: Theme.of(context).colorScheme.primary,
                            )
                          : Transform.rotate(
                              angle: 45 * pi / 180,
                              child: Icon(
                                Icons.add_circle_outline_rounded,
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                      const SizedBox(width: 2),
                      Text(
                        'Artist',
                        style: Theme.of(context).textTheme.titleLarge!.copyWith(
                              color: widget.trackStarService.guessedArtist
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.error,
                            ),
                      )
                    ]),
                  ],
                ),
              ]),
              const SizedBox(height: 64),
              Align(
                alignment: Alignment.centerLeft,
                child: Column(children: [
                  CountdownTimer(
                    endTime: widget.trackStarService.trackStartTime + 1000 * 30,
                    widgetBuilder:
                        (BuildContext context, CurrentRemainingTime? time) =>
                            // TODO: Flash/scale briefly when 5s reached
                            Text(
                      time == null ? 'Track Over' : '${time.sec}s left',
                      style: Theme.of(context).textTheme.titleLarge!.copyWith(
                          color: (time == null
                              ? null
                              : (time.sec! <= 5
                                  ? Theme.of(context).colorScheme.error
                                  : null))),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Track ${widget.trackStarService.trackNumber}/${widget.trackStarService.tracksPerRound}',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium!
                        .copyWith(fontWeight: FontWeight.normal),
                  ),
                ]),
              ),
            ],
          ),
        );
        break;
      case GameState.betweenTracks:
        canGuess = false;

        guessController.clear();

        page = Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text('That track was:'),
            Text(widget.trackStarService.trackTitle)
          ],
        );
        // page = Text(
        //     'That track was ${widget.trackStarService.trackTitle} by ${widget.trackStarService.trackArtists.join(', ')}!');
        break;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Room Code: ${widget.trackStarService.roomId}'),
        actions: [
          Row(children: [
            // TODO: M3 switch (put mute/unmute icon within)
            const Icon(Icons.volume_mute_rounded),
            Switch(
              value: true,
              onChanged: (_) {}, // TODO: Toggle play/don't tracks
            )
          ])
        ],
      ),
      body: SafeArea(child: page),
      floatingActionButton: canGuess
          ? FloatingActionButton.extended(
              onPressed: () =>
                  widget.trackStarService.makeGuess(guessController.text),
              icon: const Icon(Icons.send_outlined),
              label: const Text('Make Guess'),
            )
          : null,
    );
  }

  @override
  void initState() {
    widget.trackStarService.changeSignal = setState;

    guessController.addListener(() {
      setState(() => canGuess = guessController.text.isNotEmpty);
    });

    super.initState();
  }

  @override
  void dispose() {
    guessController.dispose();

    widget.trackStarService.disconnect();

    super.dispose();
  }
}
