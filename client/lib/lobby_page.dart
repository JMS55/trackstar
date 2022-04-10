import 'package:flutter/material.dart';
import 'package:trackstar/trackstar_service.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage(
      {Key? key, required this.trackStarService, required this.isRoomCreator})
      : super(key: key);

  final TrackStarService trackStarService;
  final bool isRoomCreator;

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  List<String> players = [];

  @override
  Future<void> initState() async {
    await widget.trackStarService
        .responseStream<PlayerJoined>()
        .forEach((PlayerJoined msg) {
      setState(() {
        // TODO
        // process when a player joins
      });
    });

    await widget.trackStarService
        .responseStream<PlayerLeft>()
        .forEach((PlayerLeft msg) {
      setState(() {
        // TODO
        // process when a player leaves
      });
    });

    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: null,
    );
  }
}
