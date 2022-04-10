import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/trackstar_service.dart';
import 'package:trackstar/game_page.dart';

class LobbyPage extends StatelessWidget {
  const LobbyPage({Key? key, required this.isRoomCreator}) : super(key: key);

  final bool isRoomCreator;

  @override
  Widget build(BuildContext context) {
    Widget playersList = Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => ListView(
              children: trackStarService.players.values
                  .map((player) => Text(player))
                  .toList(),
              shrinkWrap: true,
            ));
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
        child: isRoomCreator
            ? Column(children: [
                playersList,
                ElevatedButton(
                    child: const Text('Start Game'),
                    onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => GamePage()),
                        ))
              ])
            : playersList,
      ),
    );
  }
}
