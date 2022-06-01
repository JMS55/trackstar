import 'package:dynamic_color/dynamic_color.dart';
import 'package:flutter/material.dart';
import 'home_page.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({Key? key}) : super(key: key);

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
}
