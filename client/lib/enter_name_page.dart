import 'package:flutter/material.dart';
import 'package:trackstar/lobby_page.dart';
import 'trackstar_service.dart';

class EnterNamePage extends StatelessWidget {
  EnterNamePage(
      {Key? key, required this.trackStarService, required this.isCreatingRoom})
      : super(key: key);

  final TrackStarService trackStarService;
  final textController = TextEditingController();
  final bool isCreatingRoom;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(36.0),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Your Name',
                border: UnderlineInputBorder(),
              ),
              controller: textController,
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
          child: const Icon(Icons.navigate_next_rounded),
          onPressed: () async {
            if (textController.text != '') {
              trackStarService.userName = textController.text;

              if (isCreatingRoom) {
                CreateRoomResponse response =
                    await trackStarService.createRoom();
                trackStarService.roomId = response.roomId;
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => LobbyPage(
                              trackStarService: trackStarService,
                              isRoomCreator: true,
                            )));
              } else {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => LobbyPage(
                              trackStarService: trackStarService,
                              isRoomCreator: false,
                            )));
              }
            }
          }),
    );
  }
}
