import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

class AvatarCircle extends StatelessWidget {
  const AvatarCircle({Key? key, required this.username}) : super(key: key);

  final String username;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      backgroundColor:
          Color((Random(username.hashCode).nextDouble() * 0xFFc8c8c8).toInt()),
      child: Text(username.characters.first),
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
  }) : super(key: key);

  final String hintText;
  final TextEditingController controller;
  final Widget? suffixIcon;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputType? keyboardType;

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
          fillColor: Theme.of(context).colorScheme.surfaceVariant,
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
