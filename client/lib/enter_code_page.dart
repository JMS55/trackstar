import 'package:flutter/services.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'enter_name_page.dart';
import 'widgets/single_input_page.dart';

class EnterCodePage extends StatelessWidget {
  const EnterCodePage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleInputPage(
      label: 'Room Code',
      onSubmit: nextPage,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      keyboardType: TextInputType.number,
    );
  }

  void nextPage(BuildContext context, String input) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) =>
            EnterNamePage(roomId: int.parse(input), isRoomCreator: false),
      ),
    );
  }
}
