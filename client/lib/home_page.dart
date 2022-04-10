import 'package:flutter/material.dart';
import 'enter_code_page.dart';
import 'enter_name_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    void createRoom() {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => EnterNamePage(isCreatingRoom: true),
        ),
      );
    }

    void joinRoom() {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => EnterCodePage()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(36.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                ElevatedButton(
                  child: const Text('Create Room'),
                  onPressed: createRoom,
                ),
                ElevatedButton(
                  child: const Text('Join Room'),
                  onPressed: joinRoom,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
