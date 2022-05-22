import 'package:flutter/material.dart';
import 'lobby_page.dart';
import 'logo_widget.dart';

class CreateRoomPage extends StatefulWidget {
  const CreateRoomPage({Key? key}) : super(key: key);

  @override
  State<CreateRoomPage> createState() => _CreateRoomPageState();
}

class _CreateRoomPageState extends State<CreateRoomPage> {
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
          child: TextField(
            controller: usernameController,
            decoration: InputDecoration(
              hintText: 'Name',
              suffixIcon: usernameController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.navigate_next_rounded),
                      onPressed: navigateToLobby,
                    )
                  : null,
            ),
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
          username: usernameController.text,
          isRoomCreator: true,
        ),
      ),
    );
  }

  @override
  void initState() {
    usernameController.addListener(() {
      setState(() => canNagivateToLobby = usernameController.text.isNotEmpty);
    });

    super.initState();
  }

  @override
  void dispose() {
    usernameController.dispose();

    super.dispose();
  }
}
