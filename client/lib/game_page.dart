import 'package:flutter/material.dart';
import 'package:flutter_countdown_timer/flutter_countdown_timer.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/trackstar_service.dart';

external int get millisecondsSinceEpoch;

class Player {
  String userName;
  int score;
  Player(this.userName, this.score);
}

class GamePage extends StatelessWidget {
  const GamePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
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
                  .map((player) => Text(player))
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

    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
          child: Column(children: [
        Text(roomCode.toString()),
        trackNumber,
        endTime,
        playersList,
        guessedTitle,
        guessedArtist
      ])),
    );
  }
}
