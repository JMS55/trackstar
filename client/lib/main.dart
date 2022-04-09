import 'package:flutter/material.dart';
import 'home_page.dart';
import 'trackstar_service.dart';

void main() {
  runApp(const App());
}

class App extends StatefulWidget {
  const App({Key? key}) : super(key: key);

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> {
  final trackStarService = TrackStarService();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TrackStar',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: HomePage(
        trackStarService: trackStarService,
      ),
    );
  }

  @override
  void dispose() {
    trackStarService.shutdown();
    super.dispose();
  }
}
