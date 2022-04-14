import 'package:flutter/services.dart';
import 'package:flutter_neumorphic/flutter_neumorphic.dart';
import 'package:provider/provider.dart';
import 'enter_name_page.dart';
import 'trackstar_service.dart';
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

  Future<void> nextPage(BuildContext context, String input) async {
    TrackStarService trackStarService = Provider.of(context, listen: false);
    trackStarService.roomId = int.parse(input);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EnterNamePage(isCreatingRoom: false),
      ),
    );
  }
}
