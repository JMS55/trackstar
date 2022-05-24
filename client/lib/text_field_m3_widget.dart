import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
