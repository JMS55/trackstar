import 'package:flutter/material.dart';
import 'lobby_page.dart';
import 'widgets.dart';

class CreateRoomPage extends StatefulWidget {
  const CreateRoomPage({Key? key, required this.usernameController})
      : super(key: key);

  final TextEditingController usernameController;

  @override
  State<CreateRoomPage> createState() => _CreateRoomPageState();
}

class _CreateRoomPageState extends State<CreateRoomPage> {
  late void Function() usernameListener;
  late bool canNagivateToLobby;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const LogoWidget(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48),
          child: TextFieldM3(
            hintText: 'Name',
            controller: widget.usernameController,
            suffixIcon: canNagivateToLobby
                ? IconButton(
                    icon: const Icon(Icons.navigate_next_rounded),
                    color: Theme.of(context).colorScheme.onSurface,
                    onPressed: navigateToLobby,
                  )
                : null,
          ),
        ),
      ],
    );
  }

  void navigateToLobby() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LobbyPage(
          username: widget.usernameController.text.trim(),
        ),
      ),
    );
  }

  @override
  void initState() {
    canNagivateToLobby = widget.usernameController.text.isNotEmpty;

    usernameListener = () => setState(() {
          canNagivateToLobby = widget.usernameController.text.isNotEmpty;
        });
    widget.usernameController.addListener(usernameListener);

    super.initState();
  }

  @override
  void dispose() {
    widget.usernameController.removeListener(usernameListener);

    super.dispose();
  }
}
