import 'dart:collection';
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

class _GamePageState extends State<GamePage> with WidgetsBindingObserver {
  final guessController = TextEditingController();
  bool canGuess = false;
  bool guessFieldBackgroundColor = true;
  SplayTreeMap<String, Standing> sortedLeaderboard = SplayTreeMap();

  @override
  Widget build(BuildContext context) {
    return RoomLeaveConfirmationDialog(
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'Room Code: ${widget.trackStarService.roomId.toString().padLeft(4, '0')}',
          ),
          actions: [
            MaterialButton(
              onPressed: () => setState(
                () => widget.trackStarService.toggleMute(),
              ),
              child: Icon(
                widget.trackStarService.muted
                    ? Icons.volume_off_rounded
                    : Icons.volume_up_rounded,
              ),
            )
          ],
        ),
        body: SafeArea(child: buildPage(context)),
        floatingActionButton: buildFab(),
      ),
    );
  }

  FloatingActionButton? buildFab() {
    switch (widget.trackStarService.gameState) {
      case GameState.initial:
        return null;
      case GameState.guessing:
        return canGuess
            ? FloatingActionButton.extended(
                onPressed: () =>
                    widget.trackStarService.makeGuess(guessController.text),
                icon: const Icon(Icons.send_outlined),
                label: const Text('Make Guess'),
              )
            : null;
      case GameState.betweenTracks:
        return null;
      case GameState.roundEnd:
        return widget.trackStarService.host == widget.trackStarService.userName
            ? FloatingActionButton.extended(
                onPressed: () => widget.trackStarService.startRound(),
                icon: const Icon(Icons.navigate_next_rounded),
                label: const Text('New Round'),
              )
            : null;
    }
  }

  Widget buildPage(BuildContext context) {
    switch (widget.trackStarService.gameState) {
      case GameState.initial:
        return buildInitialPage(context);
      case GameState.guessing:
        return buildGuessingPage(context);
      case GameState.betweenTracks:
        return buildBetweenTracksPage(context);
      case GameState.roundEnd:
        return buildRoundEndPage(context);
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

  Widget buildRoundEndPage(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Column(
            children: [
              Text(
                'Round over - ${sortedLeaderboard.keys.elementAt(0)} wins!',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                widget.trackStarService.userName != widget.trackStarService.host
                    ? 'Wait for the host to start a new round'
                    : 'You\'re the host - start a new round',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Flexible(child: buildLeaderboardFinal(context)),
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
              leading: AvatarCircle(username: username, border: avatarBorder),
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

  Widget buildLeaderboardFinal(BuildContext context) {
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
            switch (index) {
              case 0:
                avatarBorder = Colors.amber.shade300;
                break;
              case 1:
                avatarBorder = Colors.grey.shade300;
                break;
              case 2:
                avatarBorder = Colors.brown.shade300;
                break;
              default:
                avatarBorder = Colors.transparent;
                break;
            }

            return ListTile(
              leading: AvatarCircle(username: username, border: avatarBorder),
              title: Text(username),
              subtitle: Text(
                'Score: ${standing.score + standing.pointsFromCurrentTrack}',
              ),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '#${index + 1}',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(color: index < 3 ? avatarBorder : null),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.emoji_events_rounded,
                    color: avatarBorder,
                  ),
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
                  Icons.music_note,
                  color: Theme.of(context).colorScheme.primary,
                )
              : Icon(
                  Icons.music_note_outlined,
                  color: Theme.of(context).colorScheme.error,
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
                  Icons.brush,
                  color: Theme.of(context).colorScheme.primary,
                )
              : Icon(
                  Icons.brush_outlined,
                  color: Theme.of(context).colorScheme.error,
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
    WidgetsBinding.instance.addObserver(this);

    sortedLeaderboard = SplayTreeMap.from(widget.trackStarService.leaderboard);

    guessController.addListener(() {
      setState(() => canGuess = guessController.text.isNotEmpty);
    });

    widget.trackStarService.setMuteOverride(false);

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
              int c = -(widget.trackStarService.leaderboard[key1]!.score +
                      widget.trackStarService.leaderboard[key1]!
                          .pointsFromCurrentTrack)
                  .compareTo(widget.trackStarService.leaderboard[key2]!.score +
                      widget.trackStarService.leaderboard[key2]!
                          .pointsFromCurrentTrack);
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
    WidgetsBinding.instance.removeObserver(this);

    guessController.dispose();

    widget.trackStarService.disconnect();

    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    setState(() {
      if (state == AppLifecycleState.inactive ||
          state == AppLifecycleState.paused) {
        widget.trackStarService.setMuteOverride(true);
      }

      if (state == AppLifecycleState.resumed) {
        widget.trackStarService.setMuteOverride(false);
      }
    });
  }
}
