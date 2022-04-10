import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/lobby_page.dart';
import 'package:trackstar/trackstar_service.dart';

class GamePage extends StatelessWidget {
  const GamePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar'))
    );
  }
