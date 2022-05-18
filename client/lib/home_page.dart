import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'enter_code_page.dart';
import 'enter_name_page.dart';
import 'widgets/page_card.dart';
import 'widgets/wide_button.dart';

class HomePage extends StatelessWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return PageCard(
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
          WideButton(label: 'Create Room', onPressed: createRoom),
          const SizedBox(height: 24),
          WideButton(label: 'Join Room', onPressed: joinRoom),
        ],
      ),
    );
  }

  void createRoom(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EnterNamePage(isCreatingRoom: true),
      ),
    );
  }

  void joinRoom(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EnterCodePage()),
    );
  }
}
