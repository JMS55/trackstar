import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'lobby_page.dart';
import 'logo_widget.dart';

class JoinRoomPage extends StatefulWidget {
  const JoinRoomPage({Key? key}) : super(key: key);

  @override
  State<JoinRoomPage> createState() => _JoinRoomPageState();
}

class _JoinRoomPageState extends State<JoinRoomPage> {
  final roomIdController = TextEditingController();
  final usernameController = TextEditingController();
  bool canNagivateToLobby = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const LogoWidget(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48),
          child: Column(children: [
            TextField(
              controller: roomIdController,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: 'Room Code'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: usernameController,
              decoration: InputDecoration(
                hintText: 'Name',
                suffixIcon: canNagivateToLobby
                    ? IconButton(
                        icon: const Icon(Icons.navigate_next_rounded),
                        onPressed: navigateToLobby,
                      )
                    : null,
              ),
            ),
          ]),
        )
      ],
    );
  }

  void navigateToLobby() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LobbyPage(
          roomId: int.parse(roomIdController.text),
          username: usernameController.text,
          isRoomCreator: false,
        ),
      ),
    );
  }

  @override
  void initState() {
    roomIdController.addListener(() {
      setState(() {
        canNagivateToLobby = roomIdController.text.isNotEmpty &&
            usernameController.text.isNotEmpty;
      });
    });
    usernameController.addListener(() {
      setState(() {
        canNagivateToLobby = roomIdController.text.isNotEmpty &&
            usernameController.text.isNotEmpty;
      });
    });

    super.initState();
  }

  @override
  void dispose() {
    roomIdController.dispose();
    usernameController.dispose();

    super.dispose();
  }
}
