import 'package:flutter_neumorphic/flutter_neumorphic.dart';

class PageCard extends StatelessWidget {
  final Widget child;
  final Widget? floatingActionButton;

  const PageCard({Key? key, required this.child, this.floatingActionButton})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Neumorphic(
          style: NeumorphicStyle(
            depth: 15,
            boxShape: NeumorphicBoxShape.roundRect(
              const BorderRadius.all(Radius.circular(24)),
            ),
          ),
          padding: const EdgeInsets.symmetric(vertical: 72, horizontal: 36),
          child: child,
        ),
      ),
      floatingActionButton: floatingActionButton,
    );
  }
}
