import 'package:flutter_neumorphic/flutter_neumorphic.dart';

class WideButton extends StatelessWidget {
  final String label;
  final void Function(BuildContext) onPressed;

  const WideButton({Key? key, required this.label, required this.onPressed})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
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
          lightSource: LightSource.topLeft,
        ),
        padding: const EdgeInsets.all(16),
        onPressed: () => onPressed(context),
      ),
    );
  }
}
