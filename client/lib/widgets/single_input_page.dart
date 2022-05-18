import 'package:flutter/services.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';

class SingleInputPage extends StatefulWidget {
  final String label;
  final void Function(BuildContext, String) onSubmit;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputType? keyboardType;

  const SingleInputPage(
      {Key? key,
      required this.label,
      required this.onSubmit,
      this.inputFormatters,
      this.keyboardType})
      : super(key: key);

  @override
  State<SingleInputPage> createState() => _SingleInputPageState();
}

class _SingleInputPageState extends State<SingleInputPage> {
  bool nextPageEnabled = false;
  final textController = TextEditingController();

  @override
  void initState() {
    textController.addListener(() {
      setState(() {
        nextPageEnabled = textController.text != '';
      });
    });

    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Text(
                widget.label,
                style: const TextStyle(
                  color: Color.fromARGB(255, 5, 6, 92),
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Neumorphic(
              padding: const EdgeInsets.all(18),
              child: TextField(
                cursorColor: const Color.fromARGB(255, 5, 6, 92),
                style: const TextStyle(
                  color: Color.fromARGB(255, 5, 6, 92),
                  fontSize: 24,
                ),
                decoration: const InputDecoration.collapsed(hintText: ""),
                inputFormatters: widget.inputFormatters,
                keyboardType: widget.keyboardType,
                controller: textController,
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: NeumorphicFloatingActionButton(
        style: NeumorphicTheme.currentTheme(context)
            .appBarTheme
            .buttonStyle
            .copyWith(
              color: nextPageEnabled
                  ? const Color.fromARGB(255, 49, 69, 106)
                  : null,
            ),
        child: Icon(
          Icons.navigate_next_rounded,
          color: nextPageEnabled
              ? const Color.fromARGB(255, 222, 228, 238)
              : const Color.fromARGB(255, 5, 6, 92),
        ),
        onPressed: nextPageEnabled
            ? () => widget.onSubmit(context, textController.text)
            : () {},
      ),
    );
  }

  @override
  void dispose() {
    textController.dispose();
    super.dispose();
  }
}
