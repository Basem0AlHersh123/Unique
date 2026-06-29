import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { ENDPOINTS } from "@/constants/config";

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  comingSoon: boolean;
  color?: string;
}

interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  collegeId: string;
  topics: string[];
}

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  GraduationCap: "book",
  BookOpen: "book-open",
  Brain: "cpu",
  Flask: "feather",
  Calculator: "hash",
  Globe: "globe",
  Heart: "heart",
  Star: "star",
  Award: "award",
};

function getIcon(name?: string): keyof typeof Feather.glyphMap {
  return (name && ICON_MAP[name]) || "book-open";
}

export default function CollegeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [college, setCollege] = useState<College | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch<College[]>("/api/admin/colleges");
        if (cancelled || !res.success || !res.data) return;

        const c = res.data.find(
          (col: College) => col.slug === slug
        );
        if (!c) return;
        setCollege(c);

        const subRes = await apiFetch<Subject[]>(
          `/api/admin/subjects?collegeId=${c._id}`
        );
        if (!cancelled && subRes.success && subRes.data) {
          setSubjects(subRes.data);
        }
      } catch {
        // fail gracefully
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!college) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>لم يتم العثور على الكلية</Text>
        </View>
      </SafeAreaView>
    );
  }

  const color = college.color || "#6C63FF";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Feather name="arrow-right" size={24} color="#94a3b8" />
        </Pressable>
        <Text style={styles.title}>
          {college.nameAr || college.name}
        </Text>
        <Text style={styles.subtitle}>
          {subjects.length} مادة
        </Text>
        <View
          style={[styles.accentLine, { backgroundColor: color }]}
        />
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.subjectCard}
            onPress={() =>
              router.push(
                `/(app)/subject/${item.slug}` as any
              )
            }
          >
            <View
              style={[
                styles.subjectIcon,
                { backgroundColor: color + "20" },
              ]}
            >
              <Feather name="book" size={22} color={color} />
            </View>
            <View style={styles.subjectInfo}>
              <Text style={styles.subjectName}>
                {item.nameAr || item.name}
              </Text>
              <Text style={styles.topicCount}>
                {item.topics?.length || 0} درس
              </Text>
            </View>
            <Feather
              name="chevron-left"
              size={20}
              color="#475569"
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="book" size={48} color="#2d1f6e" />
            <Text style={styles.emptyText}>
              لا توجد مواد في هذه الكلية بعد
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0f0a2e",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "right",
    fontFamily: "Cairo_700Bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 4,
    fontFamily: "Cairo_400Regular",
  },
  accentLine: {
    height: 3,
    width: 48,
    borderRadius: 2,
    marginTop: 10,
    alignSelf: "flex-end",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1040",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2d1f6e",
    padding: 16,
    marginBottom: 12,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  subjectInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Cairo_700Bold",
  },
  topicCount: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
    fontFamily: "Cairo_400Regular",
  },
  errorText: {
    color: "#94a3b8",
    fontSize: 16,
    marginTop: 12,
    fontFamily: "Cairo_400Regular",
  },
  emptyText: {
    color: "#475569",
    fontSize: 15,
    marginTop: 16,
    fontFamily: "Cairo_400Regular",
  },
});
