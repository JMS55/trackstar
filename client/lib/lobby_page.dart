import 'package:flutter/material.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage(
      {Key? key, required this.roomCode, required this.isRoomCreator})
      : super(key: key);

  final int roomCode;
  final bool isRoomCreator;

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  List<String> players = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: null,
    );
  }
}
