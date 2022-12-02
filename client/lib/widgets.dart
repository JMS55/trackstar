import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/svg.dart';

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
      SvgPicture.asset(
        'assets/icon.svg',
        width: 132,
        color: Theme.of(context).colorScheme.onBackground,
      ),
    ]);
  }
}

class AvatarCircle extends StatelessWidget {
  const AvatarCircle({
    Key? key,
    required this.username,
    this.border,
  }) : super(key: key);

  final String username;
  final Color? border;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(width: 4, color: border ?? Colors.transparent),
        borderRadius: BorderRadius.circular(999),
      ),
      child: CircleAvatar(
        backgroundColor:
            Color((Random(username.hashCode).nextDouble() * 0xFFc8c8c8).toInt())
                .withOpacity(0.4),
        child: Text(username.characters.first),
      ),
    );
  }
}

class RoomLeaveConfirmationDialog extends StatelessWidget {
  const RoomLeaveConfirmationDialog({Key? key, required this.child})
      : super(key: key);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async =>
          (await showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Leave room?'),
              content: const Text('Joining back later will keep your score.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Back'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    foregroundColor:
                        Theme.of(context).colorScheme.onErrorContainer,
                    backgroundColor:
                        Theme.of(context).colorScheme.errorContainer,
                  ).copyWith(elevation: ButtonStyleButton.allOrNull(0.0)),
                  child: const Text('Leave room'),
                ),
              ],
            ),
          )) ??
          false,
      child: child,
    );
  }
}

// TODO: Placeholder until flutter updates TextField to material 3
class TextFieldM3 extends StatelessWidget {
  const TextFieldM3({
    Key? key,
    required this.hintText,
    required this.controller,
    this.suffixIcon,
    this.inputFormatters,
    this.keyboardType,
    this.backgroundColor,
  }) : super(key: key);

  final String hintText;
  final TextEditingController controller;
  final Widget? suffixIcon;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputType? keyboardType;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: TextField(
        controller: controller,
        inputFormatters: inputFormatters,
        keyboardType: keyboardType,
        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
        decoration: InputDecoration(
          filled: true,
          fillColor:
              backgroundColor ?? Theme.of(context).colorScheme.surfaceVariant,
          suffixIconColor: Theme.of(context).colorScheme.onSurface,
          labelText: hintText,
          labelStyle: Theme.of(context).textTheme.bodyLarge!.copyWith(
              color: controller.text.isEmpty
                  ? Theme.of(context).colorScheme.onSurfaceVariant
                  : Theme.of(context).colorScheme.primary),
          enabledBorder: UnderlineInputBorder(
            borderSide:
                BorderSide(color: Theme.of(context).colorScheme.onSurface),
          ),
          focusedBorder: UnderlineInputBorder(
            borderSide: BorderSide(
                color: Theme.of(context).colorScheme.onSurface, width: 2),
          ),
          suffixIcon: suffixIcon,
        ),
      ),
    );
  }
}
