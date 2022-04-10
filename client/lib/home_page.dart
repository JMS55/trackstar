import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'enter_code_page.dart';
import 'enter_name_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    void createRoom() {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const EnterNamePage(isCreatingRoom: true),
        ),
      );
    }

    void joinRoom() {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const EnterCodePage()),
      );
    }

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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const FittedBox(
                    fit: BoxFit.contain,
                    child: Text(
                      'TrackStar',
                      style: TextStyle(
                        color: Color.fromARGB(255, 5, 6, 92),
                        fontSize: 72,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),
                  button('Create Room', createRoom),
                  const SizedBox(height: 24),
                  button('Join Room', joinRoom),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
