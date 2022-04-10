import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'package:trackstar/trackstar_service.dart';
import 'package:trackstar/game_page.dart';
import 'trackstar_service.dart';

class LobbyPage extends StatelessWidget {
  const LobbyPage({Key? key, required this.isRoomCreator}) : super(key: key);

  final bool isRoomCreator;

  @override
  Widget build(BuildContext context) {
    Widget button(String label, void Function()? onPressed) {
      return SizedBox(
        width: double.infinity,
        child: NeumorphicButton(
          child: Align(
            alignment: Alignment.center,
            child: Text(
              label,
              style: const TextStyle(
                color: Color.fromARGB(255, 222, 228, 238),
                fontSize: 22,
              ),
            ),
          ),
          style: const NeumorphicStyle(
              color: Color.fromARGB(255, 49, 69, 106),
              lightSource: LightSource.topLeft),
          padding: const EdgeInsets.all(16),
          onPressed: onPressed,
        ),
      );
    }

    int roomCode =
        Provider.of<TrackStarService>(context, listen: false).roomId!;

    List<Widget> col = <Widget>[
      Container(
        alignment: Alignment.centerLeft,
        child: FittedBox(
          fit: BoxFit.contain,
          child: RichText(
            text: TextSpan(
              text: 'Room Code ',
              style: const TextStyle(
                color: Color.fromARGB(255, 5, 6, 92),
                fontSize: 72,
                fontWeight: FontWeight.w500,
              ),
              children: [
                TextSpan(
                  text: ' $roomCode ',
                  style: const TextStyle(
                    color: Color.fromARGB(255, 222, 228, 238),
                    backgroundColor: Color.fromARGB(255, 5, 6, 92),
                    fontSize: 72,
                    fontWeight: FontWeight.w900,
                  ),
                )
              ],
            ),
          ),
        ),
      ),
      Consumer<TrackStarService>(
        builder: (context, trackStarService, child) => ListView.separated(
          itemCount: trackStarService.players.length,
          itemBuilder: (BuildContext context, int index) => Text(
            trackStarService.players.values.elementAt(index).userName,
            style: const TextStyle(
              color: Color.fromARGB(255, 5, 6, 92),
              fontSize: 18,
            ),
          ),
          separatorBuilder: (BuildContext context, int index) =>
              const Divider(),
          shrinkWrap: true,
        ),
      ),
    ];
    if (isRoomCreator) {
      col.add(const SizedBox(height: 48));
      col.add(button(
          'Start Game',
          () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => GamePage()),
              )));
    }

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Neumorphic(
            style: NeumorphicStyle(
              depth: 15,
              boxShape: NeumorphicBoxShape.roundRect(
                  const BorderRadius.all(Radius.circular(28))),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 84, horizontal: 36),
              child: Column(mainAxisSize: MainAxisSize.min, children: col),
            ),
          ),
        ),
      ),
    );
  }
}
