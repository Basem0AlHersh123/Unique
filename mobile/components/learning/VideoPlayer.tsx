import { useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { Video, ResizeMode } from "expo-av";
import { Feather } from "@expo/vector-icons";

interface VideoPlayerProps {
  videoUrl: string;
  videoType: "youtube" | "direct";
  onWatched: () => void;
}

function extractYoutubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? "";
}

function YoutubePlayer({ videoId, onWatched }: { videoId: string; onWatched: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const watchedRef = useRef(false);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}iframe{width:100%;height:100%;border:none}</style>
</head>
<body>
<div id="p"></div>
<script>
  function post(d){ try{window.ReactNativeWebView.postMessage(JSON.stringify(d));}catch(e){} }
  var ready=false;
  var fb=setTimeout(function(){ if(!ready){ post({t:'ready'}); } },5000);
  var tag=document.createElement('script');
  tag.src='https://www.youtube.com/iframe_api';
  tag.onerror=function(){ clearTimeout(fb); post({t:'error',code:-1}); };
  document.head.appendChild(tag);
  var player;
  function onYouTubeIframeAPIReady(){
    clearTimeout(fb); ready=true;
    player=new YT.Player('p',{
      width:'100%',height:'100%',
      videoId:'${videoId}',
      playerVars:{playsinline:1,controls:1,rel:0,modestbranding:1},
      events:{
        onReady:function(){ post({t:'ready'}); },
        onStateChange:function(e){ post({t:'state',v:e.data}); if(e.data===0) post({t:'ended'}); },
        onError:function(e){ post({t:'error',code:e.data}); }
      }
    });
  }
</script>
</body>
</html>`;

  function onMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.t === "ready") setLoading(false);
      if (msg.t === "ended" && !watchedRef.current) { watchedRef.current=true; onWatched(); }
      if (msg.t === "error") {
        console.log("[VideoPlayer] YouTube error code:", msg.code);
        setLoading(false);
        if ([150,151,152].includes(msg.code)) setError(true);
      }
    } catch {}
  }

  if (error) {
    return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="youtube" size={36} color="#EF4444" />
        <Text style={s.errorTitle}>لا يمكن تشغيل الفيديو</Text>
        <Text style={s.errorSub}>هذا الفيديو مقيد من قِبل يوتيوب.{"\n"}اطلب من المدير تغيير رابط الفيديو.</Text>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <WebView
        source={{ html }}
        style={s.webview}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="hardware"
        onMessage={onMessage}
        onError={() => { setLoading(false); setError(true); }}
        onHttpError={() => { setLoading(false); }}
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

function DirectPlayer({ url, onWatched }: { url: string; onWatched: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const watchedRef = useRef(false);

  return (
    <View style={s.wrapper}>
      <Video
        source={{ uri: url }}
        style={s.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onReadyForDisplay={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish && !watchedRef.current) { watchedRef.current=true; onWatched(); }
        }}
      />
      {loading && <View style={s.overlay} pointerEvents="none"><ActivityIndicator color="#6C63FF" size="large" /></View>}
      {error && (
        <View style={[s.overlay, s.center]}>
          <Feather name="alert-circle" size={32} color="#EF4444" />
          <Text style={s.errorTitle}>تعذر تشغيل الفيديو</Text>
          <Pressable onPress={() => { setError(false); setLoading(true); }}>
            <Text style={s.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function VideoPlayer({ videoUrl, videoType, onWatched }: VideoPlayerProps) {
  if (videoType === "youtube") {
    const videoId = extractYoutubeId(videoUrl);
    if (!videoId) return (
      <View style={[s.wrapper, s.center]}>
        <Feather name="alert-circle" size={32} color="#EF4444" />
        <Text style={s.errorTitle}>رابط يوتيوب غير صالح</Text>
      </View>
    );
    return <YoutubePlayer videoId={videoId} onWatched={onWatched} />;
  }
  return <DirectPlayer url={videoUrl} onWatched={onWatched} />;
}

const s = StyleSheet.create({
  wrapper: { width:"100%", aspectRatio:16/9, backgroundColor:"#000", borderRadius:12, overflow:"hidden" },
  webview: { flex:1, backgroundColor:"#000" },
  video: { width:"100%", height:"100%" },
  center: { justifyContent:"center", alignItems:"center", gap:10 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor:"#0f0a2e", justifyContent:"center", alignItems:"center", gap:12, zIndex:10 },
  loadingText: { fontSize:13, color:"#94a3b8", fontFamily:"Cairo_400Regular" },
  errorTitle: { fontSize:14, color:"#EF4444", fontFamily:"Cairo_700Bold", textAlign:"center" },
  errorSub: { fontSize:12, color:"#94a3b8", fontFamily:"Cairo_400Regular", textAlign:"center", lineHeight:20 },
  retryText: { fontSize:14, color:"#6C63FF", fontFamily:"Cairo_700Bold", marginTop:4 },
});
