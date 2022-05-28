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
  bool guessFieldBackgroundColor = true;
  bool mute = false; // TODO: Make this value do something
  SplayTreeMap<String, Standing> sortedLeaderboard = SplayTreeMap();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Room Code: ${widget.trackStarService.roomId}'),
        actions: [
          MaterialButton(
            onPressed: () => setState(() => mute = !mute),
            child: Icon(
              mute ? Icons.volume_off_rounded : Icons.volume_up_rounded,
            ),
          )
        ],
      ),
      body: SafeArea(child: buildPage(context)),
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

  Widget buildPage(BuildContext context) {
    switch (widget.trackStarService.gameState) {
      case GameState.initial:
        return buildInitialPage(context);
      case GameState.guessing:
        return buildGuessingPage(context);
      case GameState.betweenTracks:
        return buildBetweenTracksPage(context);
    }
  }

  Widget buildInitialPage(BuildContext context) {
    return Container(
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
      ),
    );
  }

  Widget buildGuessingPage(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(child: buildLeaderboard(context)),
          const SizedBox(height: 32),
          buildGuessingArea(context),
          const SizedBox(height: 64),
          buildTrackInfoArea(context),
        ],
      ),
    );
  }

  Widget buildBetweenTracksPage(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  widget.trackStarService.albumCoverUrl,
                  width: 120,
                  height: 120,
                ),
              ),
              const SizedBox(width: 16),
              Flexible(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.music_note),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              widget.trackStarService.trackTitle,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.brush),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              widget.trackStarService.trackArtists.join(', '),
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          Flexible(child: buildLeaderboard(context)),
        ],
      ),
    );
  }

  Widget buildLeaderboard(BuildContext context) {
    return Card(
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
          itemCount: sortedLeaderboard.length,
          itemBuilder: (BuildContext context, int index) {
            String username = sortedLeaderboard.keys.elementAt(index);
            Standing standing = sortedLeaderboard.values.elementAt(index);
            Color avatarBorder;
            switch (standing.place) {
              case Place.first:
                avatarBorder = Colors.amber.shade300;
                break;
              case Place.second:
                avatarBorder = Colors.grey.shade300;
                break;
              case Place.third:
                avatarBorder = Colors.brown.shade300;
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
              subtitle: Text(
                'Score: ${standing.score + standing.pointsFromCurrentTrack}',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  standing.progress == Progress.correctTitle ||
                          standing.progress == Progress.bothCorrect
                      ? Icon(
                          Icons.music_note,
                          color: Theme.of(context).colorScheme.primary,
                        )
                      : const Icon(Icons.music_note_outlined),
                  const SizedBox(width: 8),
                  standing.progress == Progress.correctArtist ||
                          standing.progress == Progress.bothCorrect
                      ? Icon(
                          Icons.brush,
                          color: Theme.of(context).colorScheme.primary,
                        )
                      : const Icon(Icons.brush_outlined),
                ],
              ),
              visualDensity: VisualDensity.compact,
            );
          },
          separatorBuilder: (BuildContext context, int index) =>
              const Divider(),
          shrinkWrap: true,
        ),
      ),
    );
  }

  Widget buildGuessingArea(BuildContext context) {
    Row guessStatusWidget = Row(
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
    );

    if (widget.trackStarService.guessedTitle &&
        widget.trackStarService.guessedArtist) {
      return guessStatusWidget;
    } else {
      return Column(children: [
        TweenAnimationBuilder<Color?>(
          tween: ColorTween(
            begin: Theme.of(context).colorScheme.surfaceVariant,
            end: guessFieldBackgroundColor
                ? Theme.of(context).colorScheme.surfaceVariant
                : Theme.of(context).colorScheme.errorContainer,
          ),
          curve: Curves.easeInOut,
          duration: const Duration(milliseconds: 375),
          builder: (BuildContext context, Color? color, Widget? child) =>
              TextFieldM3(
            hintText: 'Guess',
            controller: guessController,
            backgroundColor: color,
          ),
        ),
        const SizedBox(height: 16),
        guessStatusWidget,
      ]);
    }
  }

  Widget buildTrackInfoArea(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(children: [
        CountdownTimer(
          endTime: widget.trackStarService.trackStartTime + 1000 * 30,
          widgetBuilder: (BuildContext context, CurrentRemainingTime? time) =>
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
    );
  }

  @override
  void initState() {
    sortedLeaderboard = SplayTreeMap.from(widget.trackStarService.leaderboard);

    guessController.addListener(() {
      setState(() => canGuess = guessController.text.isNotEmpty);
    });

    widget.trackStarService.changeSignal = (_) {
      setState(() {
        if (widget.trackStarService.gameState == GameState.guessing) {
          sortedLeaderboard = SplayTreeMap.from(
            widget.trackStarService.leaderboard,
            (key1, key2) {
              int c = widget.trackStarService.leaderboard[key1]!
                  .compareTo(widget.trackStarService.leaderboard[key2]!);
              return c != 0 ? c : key1.compareTo(key2);
            },
          );

          if (widget.trackStarService.lastGuessCorrect == true) {
            guessController.clear();
          }
          if (widget.trackStarService.lastGuessCorrect == false) {
            guessFieldBackgroundColor = false;
            Future.delayed(
              const Duration(milliseconds: 375),
              () => setState(() => guessFieldBackgroundColor = true),
            );
          }
          widget.trackStarService.lastGuessCorrect = null;
        }

        if (widget.trackStarService.gameState == GameState.betweenTracks) {
          canGuess = false;
          guessController.clear();

          sortedLeaderboard = SplayTreeMap.from(
            widget.trackStarService.leaderboard,
            (key1, key2) {
              int c = -widget.trackStarService.leaderboard[key1]!.score
                  .compareTo(widget.trackStarService.leaderboard[key2]!.score);
              return c != 0 ? c : key1.compareTo(key2);
            },
          );
        }
      });
    };

    super.initState();
  }

  @override
  void dispose() {
    guessController.dispose();

    widget.trackStarService.disconnect();

    super.dispose();
  }
}
