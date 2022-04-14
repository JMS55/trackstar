import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'home_page.dart';
import 'trackstar_service.dart';

void main() {
  runApp(ChangeNotifierProvider(
    create: (context) => TrackStarService(),
    child: const App(),
  ));
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
