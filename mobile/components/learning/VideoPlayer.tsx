import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { VideoView, useVideoPlayer } from "expo-video";
import { Feather } from "@expo/vector-icons";

interface VideoPlayerProps {
  videoUrl: string;
  videoType: "youtube" | "direct";
  onWatched: () => void;
}

function extractYoutubeId(url: string): string {
  if (!url) return "";
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? "";
}

// ─── YouTube Player ─────────────────────────────────────────────────────────
// Why WebView with HTML + baseUrl instead of source.uri or react-native-youtube-iframe:
//
// 1. source={{ uri: embedUrl }} → YouTube sees no Referer/Origin → Error 153
// 2. react-native-youtube-iframe → spins forever if onReady doesn't fire
// 3. source={{ html, baseUrl: 'https://www.youtube.com' }} → WebView tells
//    YouTube the page is on youtube.com → no Error 153, always loads
//
function YouTubePlayer({
  videoId,
  onWatched,
}: {
  videoId: string;
  onWatched: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const called = useRef(false);

  function handleWatched() {
    if (called.current) return;
    called.current = true;
    onWatched();
  }

  // The HTML embeds the YouTube IFrame API.
  // Setting baseUrl to 'https://www.youtube.com' makes the WebView's origin
  // appear as youtube.com to the iframe, which prevents Error 101/150/153.
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
        #player { width: 100%; height: 100%; }
        iframe { width: 100% !important; height: 100% !important; }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script>
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);

        var player;
        window.onYouTubeIframeAPIReady = function() {
          player = new YT.Player('player', {
            videoId: '${videoId}',
            playerVars: {
              autoplay: 0,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1,
              fs: 1,
              origin: 'https://www.youtube.com'
            },
            events: {
              onReady: function() {
                window.ReactNativeWebView.postMessage('ready');
              },
              onStateChange: function(e) {
                if (e.data === YT.PlayerState.ENDED) {
                  window.ReactNativeWebView.postMessage('ended');
                }
              },
              onError: function(e) {
                window.ReactNativeWebView.postMessage('error:' + e.data);
              }
            }
          });
        };
      </script>
    </body>
    </html>
  `;

  function onMessage(e: { nativeEvent: { data: string } }) {
    const msg = e.nativeEvent.data;
    if (msg === "ready") {
      setLoading(false);
    } else if (msg === "ended") {
      setLoading(false);
      handleWatched();
    } else if (msg.startsWith("error:")) {
      const code = msg.split(":")[1];
      console.log("[VideoPlayer] YouTube error code:", code);
      setLoading(false);
      // Codes 100=not found, 101=embed not allowed, 150=same as 101, 153=restricted
      // PLUS any other error code (like 152-4) as blocked
      if (["100", "101", "150", "153"].includes(code)) {
        setBlocked(true);
      } else {
        // Treat other errors (including 152-4) as blocked
        setBlocked(true);
      }
    }
  }

  // If WebView fails to load or is blocked, show fallback
  if (blocked || webViewError) {
    return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="youtube" size={44} color="#FF0000" />
        <Text style={s.blockedTitle}>لا يمكن تشغيل هذا الفيديو داخل التطبيق</Text>
        <Text style={s.blockedSub}>
          {webViewError ? "حدث خطأ في تحميل المشغل" : "صاحب الفيديو قيّد تضمينه أو حدث خطأ في الشبكة"}
        </Text>
        <Pressable
          style={s.ytBtn}
          onPress={() =>
            Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
          }
        >
          <Feather name="external-link" size={16} color="#fff" />
          <Text style={s.ytBtnText}>فتح في يوتيوب</Text>
        </Pressable>
        <Pressable style={s.skipBtn} onPress={handleWatched}>
          <Text style={s.skipText}>تخطي الفيديو والمتابعة للاختبار ←</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <WebView
        source={{ html, baseUrl: "https://www.youtube.com" }}
        style={s.fill}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        originWhitelist={["*"]}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        // ─── YOUR REQUESTED ENHANCEMENTS ───
        androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
        androidHardwareAccelerationDisabled={false}
        mixedContentMode="always"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        onError={() => {
          setLoading(false);
          setWebViewError(true);
        }}
        // ────────────────────────────────────
        // Hide the WebView until the player is ready to avoid flash
        opacity={loading ? 0 : 1}
      />
      {loading && (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator color="#6C63FF" size="large" />
          <Text style={s.loadingText}>جاري تحميل الفيديو...</Text>
        </View>
      )}
    </View>
  );
}

// ─── Direct MP4 Player ───────────────────────────────────────────────────────
function DirectPlayer({
  videoUrl,
  onWatched,
}: {
  videoUrl: string;
  onWatched: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const called = useRef(false);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener("statusChange", (e) => {
      if (e.status === "readyToPlay") setLoading(false);
      if (e.status === "error") {
        setLoading(false);
        setError(true);
      }
    });

    const endSub = player.addListener("playToEnd", () => {
      if (!called.current) {
        called.current = true;
        onWatched();
      }
    });

    return () => {
      statusSub.remove();
      endSub.remove();
    };
  }, [player, onWatched]);

  if (error) {
    return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="alert-circle" size={36} color="#EF4444" />
        <Text style={s.errorText}>تعذر تحميل الفيديو</Text>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <VideoView
        style={s.fill}
        player={player}
        nativeControls
        contentFit="contain"
        allowsFullscreen
      />
      {loading && (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator color="#6C63FF" size="large" />
          <Text style={s.loadingText}>جاري تحميل الفيديو...</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function VideoPlayer({
  videoUrl,
  videoType,
  onWatched,
}: VideoPlayerProps) {
  if (!videoUrl) {
    return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="video-off" size={36} color="#475569" />
        <Text style={s.errorText}>لا يوجد فيديو لهذا الدرس</Text>
        <Pressable style={s.skipBtn} onPress={onWatched}>
          <Text style={s.skipText}>المتابعة للاختبار ←</Text>
        </Pressable>
      </View>
    );
  }

  if (videoType === "direct") {
    return <DirectPlayer videoUrl={videoUrl} onWatched={onWatched} />;
  }

  const videoId = extractYoutubeId(videoUrl);

  if (!videoId) {
    return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="alert-circle" size={36} color="#EF4444" />
        <Text style={s.errorText}>رابط يوتيوب غير صالح</Text>
        <Pressable style={s.skipBtn} onPress={onWatched}>
          <Text style={s.skipText}>تخطي والمتابعة ←</Text>
        </Pressable>
      </View>
    );
  }

  return <YouTubePlayer videoId={videoId} onWatched={onWatched} />;
}

const s = StyleSheet.create({
  wrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f0a2e",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "Cairo_400Regular",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  blockedTitle: {
    fontSize: 15,
    color: "#F59E0B",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  blockedSub: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  ytBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF0000",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 4,
  },
  ytBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: "#6C63FF",
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
  },
});