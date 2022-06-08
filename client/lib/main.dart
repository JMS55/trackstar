import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'home_page.dart';

void main() {
  runApp(const App());
}

class App extends StatefulWidget {
  const App({Key? key}) : super(key: key);

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  @override
  Widget build(BuildContext context) {
    return DynamicColorBuilder(
      builder: ((ColorScheme? lightColorScheme, ColorScheme? darkColorScheme) {
        return MaterialApp(
          title: 'TrackStar',
          home: const HomePage(),
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: lightColorScheme ??
                ColorScheme.fromSeed(
                  seedColor: const Color.fromARGB(255, 102, 80, 164),
                ),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorScheme: darkColorScheme ??
                ColorScheme.fromSeed(
                  seedColor: const Color.fromARGB(255, 102, 80, 164),
                ),
          ),
        );
      }),
    );
  }

  @override
  void initState() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
    SystemChrome.setSystemUIChangeCallback(
      (_) => Future.delayed(
        const Duration(milliseconds: 1200),
        () => SystemChrome.restoreSystemUIOverlays(),
      ),
    );

    super.initState();
  }
}
