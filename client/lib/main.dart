import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'home_page.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const NeumorphicApp(
      title: 'TrackStar',
      themeMode: ThemeMode.light,
      theme: NeumorphicThemeData(
        baseColor: Color.fromARGB(255, 231, 235, 238),
        intensity: 0.8,
        depth: 8,
      ),
      home: HomePage(),
    );
  }
}
