import { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

interface TurnstileCaptchaProps {
  siteKey: string;
  onToken: (token: string) => void;
}

const TURNSTILE_HTML = (siteKey: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; display: flex; justify-content: center; align-items: center; min-height: 65px; }
    .cf-turnstile { transform: scale(0.85); transform-origin: center; }
  </style>
</head>
<body>
  <div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onCaptcha" data-theme="dark"></div>
  <script>
    function onCaptcha(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ token }));
    }
  </script>
</body>
</html>
`;

export default function TurnstileCaptcha({ siteKey, onToken }: TurnstileCaptchaProps) {
  const webViewRef = useRef<WebView>(null);
  const [webViewHeight, setWebViewHeight] = useState(65);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.token) onToken(data.token);
    } catch {}
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webViewRef}
        source={{ html: TURNSTILE_HTML(siteKey) }}
        onMessage={handleMessage}
        style={{ height: webViewHeight, backgroundColor: "transparent" }}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 8,
    marginBottom: 16,
  },
});
