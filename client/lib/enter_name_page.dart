import 'package:flutter/material.dart';

class EnterNamePage extends StatelessWidget {
  const EnterNamePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TrackStar')),
      body: Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(36.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  decoration: const InputDecoration(
                    border: UnderlineInputBorder(),
                    labelText: 'Enter Your Name',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
