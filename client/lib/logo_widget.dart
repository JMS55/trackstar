import 'package:flutter/material.dart';

class LogoWidget extends StatelessWidget {
  const LogoWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const Text(
        'TrackStar',
        style: TextStyle(fontSize: 64, fontFamily: 'Lobster'),
      ),
      const SizedBox(height: 12),
      Image.asset(
        'assets/icon.png',
        width: 132,
      ),
    ]);
  }
}
