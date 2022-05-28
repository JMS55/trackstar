import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'lobby_page.dart';
import 'widgets.dart';

class JoinRoomPage extends StatefulWidget {
  const JoinRoomPage({Key? key, required this.usernameController})
      : super(key: key);

  final TextEditingController usernameController;

  @override
  State<JoinRoomPage> createState() => _JoinRoomPageState();
}

class _JoinRoomPageState extends State<JoinRoomPage> {
  final roomIdController = TextEditingController();
  late void Function() usernameListener;
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
            TextFieldM3(
              controller: widget.usernameController,
              hintText: 'Name',
            ),
            const SizedBox(height: 12),
            TextFieldM3(
              controller: roomIdController,
              hintText: 'Room Code',
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              keyboardType: TextInputType.number,
              suffixIcon: canNagivateToLobby
                  ? IconButton(
                      icon: const Icon(Icons.navigate_next_rounded),
                      color: Theme.of(context).colorScheme.onSurface,
                      onPressed: navigateToLobby,
                    )
                  : null,
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
          username: widget.usernameController.text,
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
            widget.usernameController.text.isNotEmpty;
      });
    });

    usernameListener = () => setState(() {
          canNagivateToLobby = roomIdController.text.isNotEmpty &&
              widget.usernameController.text.isNotEmpty;
        });
    widget.usernameController.addListener(usernameListener);

    super.initState();
  }

  @override
  void dispose() {
    roomIdController.dispose();

    widget.usernameController.removeListener(usernameListener);

    super.dispose();
  }
}
