import 'package:flutter/services.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'enter_name_page.dart';
import 'trackstar_service.dart';

class EnterCodePage extends StatefulWidget {
  const EnterCodePage({Key? key}) : super(key: key);

  @override
  State<EnterCodePage> createState() => _EnterCodePageState();
}

class _EnterCodePageState extends State<EnterCodePage> {
  bool buttonEnabled = false;
  final textController = TextEditingController();

  @override
  void initState() {
    textController.addListener(() {
      setState(() {
        buttonEnabled = textController.text != '';
      });
    });
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    Future<void> nextPage() async {
      if (textController.text != '') {
        TrackStarService trackStarService =
            Provider.of<TrackStarService>(context, listen: false);
        trackStarService.roomId = int.parse(textController.text);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const EnterNamePage(isCreatingRoom: false),
          ),
        );
      }
    }

    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Padding(
                padding: EdgeInsets.only(left: 8),
                child: Text(
                  'Room Code',
                  style: TextStyle(
                    color: Color.fromARGB(255, 5, 6, 92),
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Neumorphic(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: TextField(
                    cursorColor: const Color.fromARGB(255, 5, 6, 92),
                    style: const TextStyle(
                      color: Color.fromARGB(255, 5, 6, 92),
                      fontSize: 22,
                    ),
                    decoration: const InputDecoration.collapsed(hintText: ""),
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    keyboardType: TextInputType.number,
                    controller: textController,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: NeumorphicFloatingActionButton(
        style: NeumorphicTheme.currentTheme(context)
            .appBarTheme
            .buttonStyle
            .copyWith(
                color: buttonEnabled
                    ? const Color.fromARGB(255, 49, 69, 106)
                    : null),
        child: Icon(
          Icons.navigate_next_rounded,
          color: buttonEnabled
              ? const Color.fromARGB(255, 222, 228, 238)
              : const Color.fromARGB(255, 5, 6, 92),
        ),
        onPressed: nextPage,
      ),
    );
  }

  @override
  void dispose() {
    textController.dispose();
    super.dispose();
  }
}
