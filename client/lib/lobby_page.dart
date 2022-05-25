import 'package:flutter/material.dart';
import 'trackstar_service.dart';
import 'game_page.dart';

class LobbyPage extends StatefulWidget {
  const LobbyPage({
    Key? key,
    this.roomId,
    required this.username,
    required this.isRoomCreator,
  }) : super(key: key);

  final int? roomId;
  final String username;
  final bool isRoomCreator;

  @override
  State<LobbyPage> createState() => _LobbyPageState();
}

class _LobbyPageState extends State<LobbyPage> {
  late TrackStarService trackStarService;
  bool navigatedToGamePage = false;

  @override
  Widget build(BuildContext context) {
    if (trackStarService.trackNumber == 1) {
      Future.delayed(Duration.zero, () => navigateToGamePage());
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Lobby')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Card(
                child: ListTile(
                  title: Text(
                    trackStarService.roomId.toString(),
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall!
                        .copyWith(fontWeight: FontWeight.w500),
                  ),
                  subtitle: const Text('Room Code'),
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: ListView.builder(
                  itemCount: trackStarService.leaderboard.length,
                  itemBuilder: (BuildContext context, int index) {
                    String username =
                        trackStarService.leaderboard.keys.elementAt(index);
                    return Card(
                      elevation: 0,
                      color: Theme.of(context).colorScheme.surfaceVariant,
                      child: ListTile(
                        title: Text(username),
                        subtitle: username == trackStarService.userName
                            ? const Text('You')
                            : null,
                      ),
                    );
                  },
                  shrinkWrap: true,
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: widget.isRoomCreator
          ? FloatingActionButton.extended(
              onPressed: startGame,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Start Game'),
            )
          : null,
    );
  }

  void startGame() {
    trackStarService.startGame();

    navigateToGamePage();
  }

  void navigateToGamePage() {
    navigatedToGamePage = true;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => GamePage(trackStarService: trackStarService),
      ),
    );
  }

  @override
  void initState() {
    trackStarService = TrackStarService(
      roomId: widget.roomId,
      userName: widget.username,
      changeSignal: setState,
    );

    super.initState();
  }

  @override
  void dispose() {
    if (!navigatedToGamePage) {
      trackStarService.disconnect();
    }

    super.dispose();
  }
}
