import { View, StyleSheet, Text } from "react-native";
import {
  ReactNativeTurnstileCaptcha,
  type ReactNativeTurnstileCaptchaHandle,
} from "react-native-turnstile-captcha";
import { TURNSTILE_SITE_KEY } from "@/constants/config";

interface Props {
  onToken: (token: string) => void;
}

export function TurnstileWidget({ onToken }: Props) {
  return (
    <View style={styles.container}>
      <ReactNativeTurnstileCaptcha
        siteKey={TURNSTILE_SITE_KEY}
        onSuccess={onToken}
        onError={(error) => console.warn("Turnstile error:", error)}
        theme="dark"
        size="flexible"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 12,
    minHeight: 70,
  },
});
