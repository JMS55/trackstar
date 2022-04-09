import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(36.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const <Widget>[
                ElevatedButton(
                  onPressed: null,
                  child: Text('Create Room'),
                ),
                ElevatedButton(
                  onPressed: null,
                  child: Text('Join Room'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
