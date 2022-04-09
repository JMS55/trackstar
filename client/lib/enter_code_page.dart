import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:trackstar/enter_name_page.dart';
import 'trackstar_service.dart';

class EnterCodePage extends StatelessWidget {
  EnterCodePage({Key? key, required this.trackStarService}) : super(key: key);

  final TrackStarService trackStarService;
  final textController = TextEditingController();

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
                labelText: 'Room Code',
                border: UnderlineInputBorder(),
              ),
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              keyboardType: TextInputType.number,
              controller: textController,
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
          child: const Icon(Icons.navigate_next_rounded),
          onPressed: () async {
            if (textController.text != '') {
              trackStarService.roomId = int.parse(textController.text);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => EnterNamePage(
                          trackStarService: trackStarService,
                          isCreatingRoom: false)));
            }
          }),
    );
  }
}
