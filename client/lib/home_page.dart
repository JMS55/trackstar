import 'package:flutter/material.dart';
import 'trackstar_service.dart';
import 'enter_code_page.dart';
import 'enter_name_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key, required this.trackStarService}) : super(key: key);

  final TrackStarService trackStarService;

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
              children: <Widget>[
                ElevatedButton(
                  child: const Text('Create Room'),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => EnterNamePage(
                                trackStarService: trackStarService,
                              )),
                    );
                  },
                ),
                ElevatedButton(
                  child: const Text('Join Room'),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const EnterCodePage()),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
