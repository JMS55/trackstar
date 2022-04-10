import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'lobby_page.dart';
import 'trackstar_service.dart';

class EnterNamePage extends StatefulWidget {
  const EnterNamePage({Key? key, required this.isCreatingRoom})
      : super(key: key);

  final bool isCreatingRoom;

  @override
  State<EnterNamePage> createState() => _EnterNamePageState();
}

class _EnterNamePageState extends State<EnterNamePage> {
  bool buttonEnabled = false;
  final textController = TextEditingController();

  @override
  void initState() {
    textController.addListener(() {
      setState(() {
        buttonEnabled = textController.text != '';
      });
    });
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    Future<void> nextPage() async {
      if (textController.text != '') {
        TrackStarService trackStarService =
            Provider.of<TrackStarService>(context, listen: false);
        trackStarService.userName = textController.text;

        if (widget.isCreatingRoom) {
          CreateRoomResponse response = await trackStarService.createRoom();
          trackStarService.roomId = response.roomId;
          trackStarService.players[response.creatorId] =
              Player(trackStarService.userName);
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (context) => const LobbyPage(isRoomCreator: true)),
          );
        } else {
          await trackStarService.joinRoom();
          Navigator.push(
            context,
            MaterialPageRoute(
                builder: (context) => const LobbyPage(isRoomCreator: false)),
          );
        }
      }
    }

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Padding(
                padding: EdgeInsets.only(left: 8),
                child: Text(
                  'Name',
                  style: TextStyle(
                    color: Color.fromARGB(255, 5, 6, 92),
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Neumorphic(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: TextField(
                    cursorColor: const Color.fromARGB(255, 5, 6, 92),
                    style: const TextStyle(
                      color: Color.fromARGB(255, 5, 6, 92),
                      fontSize: 22,
                    ),
                    decoration: const InputDecoration.collapsed(hintText: ""),
                    controller: textController,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: NeumorphicFloatingActionButton(
        style: NeumorphicTheme.currentTheme(context)
            .appBarTheme
            .buttonStyle
            .copyWith(
                color: buttonEnabled
                    ? const Color.fromARGB(255, 49, 69, 106)
                    : null),
        child: Icon(
          Icons.navigate_next_rounded,
          color: buttonEnabled
              ? const Color.fromARGB(255, 222, 228, 238)
              : const Color.fromARGB(255, 5, 6, 92),
        ),
        onPressed: nextPage,
      ),
    );
  }

  @override
  void dispose() {
    textController.dispose();
    super.dispose();
  }
}
