import 'package:flutter/material.dart';
import 'widgets.dart';
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
    return Scaffold(
      appBar: AppBar(title: const Text('Lobby')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.people_alt_rounded),
                      const SizedBox(width: 4),
                      Text(
                        trackStarService.leaderboard.length.toString(),
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Flexible(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Card(
                    elevation: 0,
                    color: Theme.of(context).colorScheme.surfaceVariant,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: ListView.separated(
                        itemCount: trackStarService.leaderboard.length,
                        itemBuilder: (BuildContext context, int index) {
                          String username = trackStarService.leaderboard.keys
                              .elementAt(index);
                          return ListTile(
                            leading: AvatarCircle(username: username),
                            title: Text(username),
                            subtitle: username == trackStarService.userName
                                ? const Text('You')
                                : null,
                            visualDensity: VisualDensity.compact,
                          );
                        },
                        separatorBuilder: (BuildContext context, int index) =>
                            const Divider(),
                        shrinkWrap: true,
                      ),
                    ),
                  ),
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
      changeSignal: (_) {
        setState(() {
          if (trackStarService.trackNumber == 1) {
            navigateToGamePage();
          }
        });
      },
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
