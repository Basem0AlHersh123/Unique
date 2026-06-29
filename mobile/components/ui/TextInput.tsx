import { useState } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export default function AppTextInput({
  label,
  error,
  leftIcon,
  isPassword,
  style,
  ...rest
}: AppTextInputProps) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(isPassword);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
        {(leftIcon || isPassword) && (
          <View style={styles.leftGroup}>
            {leftIcon}
            {isPassword && (
              <TouchableOpacity
                onPress={() => setSecure(!secure)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={secure ? "eye-off" : "eye"}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        <RNTextInput
          style={[styles.input, leftIcon || isPassword ? styles.inputWithIcon : undefined, style]}
          placeholderTextColor="#475569"
          textAlign="right"
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    marginBottom: 8,
    fontFamily: "Cairo_400Regular",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1040",
    borderWidth: 1,
    borderColor: "#2d1f6e",
    borderRadius: 12,
  },
  inputFocused: {
    borderColor: "#6C63FF",
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: "right",
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 12,
  },
  error: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
    fontFamily: "Cairo_400Regular",
  },
});
