import 'package:flutter/material.dart';
import 'create_room_page.dart';
import 'join_room_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int selectedPageIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: selectedPageIndex == 0
            ? const CreateRoomPage()
            : const JoinRoomPage(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedPageIndex,
        onDestinationSelected: (i) => setState(() => selectedPageIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.add_rounded),
            label: 'Create',
          ),
          NavigationDestination(
            icon: Icon(Icons.door_front_door_outlined),
            label: 'Join',
          )
        ],
      ),
    );
  }
}
