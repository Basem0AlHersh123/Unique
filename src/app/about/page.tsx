"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { useAnimatedCounter } from "@/lib/useAnimatedCounter";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft, Play, Star,
  Target, Shield, Heart, Users, Lightbulb, Sparkles, CheckCircle,
  Award,
} from "lucide-react";

function AnimatedStat({ icon: Icon, label, value, suffix }: {
  icon: React.ElementType; label: string; value: number; suffix: string;
}) {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div className="flex flex-col items-center gap-2" ref={ref}>
      <Icon className="w-8 h-8 text-primary" />
      <span className="text-3xl sm:text-4xl font-bold gradient-text">{count}{suffix}</span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}

interface AboutVideo {
  name: string;
  role: string;
  title: string;
  desc: string;
  avatar?: string;
  videoUrl?: string;
}

export default function AboutPage() {
  const { t } = useLanguage();
  const [aboutVideos, setAboutVideos] = useState<AboutVideo[]>([]);
  const [aboutHero, setAboutHero] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: AboutVideo[] }>("/api/site-content?section=about-videos")
      .then((res) => {
        if (res.success && res.data?.items) setAboutVideos(res.data.items);
      })
      .catch(() => {});
    apiFetch<{ imageUrl?: string }>("/api/site-content?section=about-hero")
      .then((res) => {
        if (res.success && res.data?.imageUrl) setAboutHero(res.data.imageUrl);
      })
      .catch(() => {});
  }, []);

  const values = [
    { icon: Target, title: t('about.values.excellence'), desc: t('about.values.excellence_desc') },
    { icon: Shield, title: t('about.values.credibility'), desc: t('about.values.credibility_desc') },
    { icon: Heart, title: t('about.values.care'), desc: t('about.values.care_desc') },
    { icon: Lightbulb, title: t('about.values.innovation'), desc: t('about.values.innovation_desc') },
  ];

  const videoTestimonials = aboutVideos.length > 0 ? aboutVideos : [
    {
      name: t('about.videos.1.name'),
      role: t('about.videos.1.role'),
      avatar: t('about.videos.1.name')[0],
      title: t('about.videos.1.title'),
      desc: t('about.videos.1.desc'),
    },
    {
      name: t('about.videos.2.name'),
      role: t('about.videos.2.role'),
      avatar: t('about.videos.2.name')[0],
      title: t('about.videos.2.title'),
      desc: t('about.videos.2.desc'),
    },
    {
      name: t('about.videos.3.name'),
      role: t('about.videos.3.role'),
      avatar: t('about.videos.3.name')[0],
      title: t('about.videos.3.title'),
      desc: t('about.videos.3.desc'),
    },
  ];

  const teamMembers = [
    { name: t('about.team.member1'), role: t('about.team.member1_role'), emoji: "👨‍🔬" },
    { name: t('about.team.member2'), role: t('about.team.member2_role'), emoji: "👩‍🔬" },
    { name: t('about.team.member3'), role: t('about.team.member3_role'), emoji: "👨‍💻" },
    { name: t('about.team.member4'), role: t('about.team.member4_role'), emoji: "👩‍💼" },
  ];

  return (
    <main className="flex-1 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            {t('about.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4">
            {t('about.title')}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {t('about.desc')}
          </p>
          {aboutHero && (
            <div className="mt-8 max-w-3xl mx-auto">
              <Image
                src={aboutHero}
                alt={t('about.title')}
                width={800}
                height={400}
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          )}
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
                {t('about.mission.title')}
              </h2>
              <p className="text-text-secondary leading-relaxed mb-6">
                {t('about.mission.desc')}
              </p>
              <div className="space-y-3">
                {[
                  t('about.mission.point1'),
                  t('about.mission.point2'),
                  t('about.mission.point3'),
                  t('about.mission.point4'),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-8 p-8 bg-surface rounded-2xl border border-border">
              <AnimatedStat icon={Users} label={t('about.stat.students')} value={5000} suffix="+" />
              <AnimatedStat icon={Play} label={t('about.stat.videos')} value={200} suffix="+" />
              <AnimatedStat icon={Award} label={t('about.stat.success')} value={85} suffix="%" />
              <AnimatedStat icon={Star} label={t('about.stat.rating')} value={4.8} suffix="" />
            </div>
          </div>
        </div>
      </section>

      {/* Video Testimonials */}
      <section className="py-16 sm:py-20 bg-surface/50 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Play className="w-4 h-4" />
              {t('about.videos.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {t('about.videos.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto">
              {t('about.videos.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoTestimonials.map((item, i) => (
              <div
                key={i}
                className="group bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              >
                {item.videoUrl ? (
                  <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative cursor-pointer group/vid">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/vid:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 rounded-full bg-white/90 shadow-2xl flex items-center justify-center group-hover/vid:scale-110 transition-transform duration-300 z-10">
                      <Play className="w-7 h-7 text-primary mr-0.5" />
                    </div>
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs backdrop-blur-sm">
                        {t('about.videos.watch')}
                      </span>
                    </div>
                  </a>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative cursor-pointer group/vid">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/vid:opacity-100 transition-opacity" />
                    <div className="w-16 h-16 rounded-full bg-white/90 shadow-2xl flex items-center justify-center group-hover/vid:scale-110 transition-transform duration-300 z-10">
                      <Play className="w-7 h-7 text-primary mr-0.5" />
                    </div>
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs backdrop-blur-sm">
                        {t('about.videos.watch')}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-text-primary mb-1">{item.title}</h3>
                  <p className="text-sm text-text-secondary mb-4 leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm">{item.name}</p>
                      <p className="text-xs text-text-muted">{item.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4 border border-secondary/20">
              <Heart className="w-4 h-4" />
              {t('about.values.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {t('about.values.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="text-center bg-surface border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">{v.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team / Trust */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal/10 text-teal text-sm font-medium mb-4 border border-teal/20">
            <Users className="w-4 h-4" />
            {t('about.team.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
            {t('about.team.title')}
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('about.team.desc')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {teamMembers.map((person, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="text-4xl mb-3">{person.emoji}</div>
                <p className="font-bold text-text-primary text-sm">{person.name}</p>
                <p className="text-xs text-text-muted mt-1">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-8 sm:p-12 text-center">
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                {t('about.cta.title')}
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                {t('about.cta.desc')}
              </p>
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-warning to-accent text-white hover:from-warning/90 hover:to-accent/90 shadow-2xl shadow-warning/30 "
                >
                  {t('about.cta.button')}
                  <ArrowLeft className="w-5 h-5 mr-2 float-left" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
            <span className="text-lg font-bold gradient-text">{t('common.brand')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <Link href="/" className="hover:text-primary transition-colors">{t('about.footer_home')}</Link>
            <Link href="/about" className="hover:text-primary transition-colors">{t('nav.about')}</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">{t('nav.contact')}</Link>
            <Link href="/colleges" className="hover:text-primary transition-colors">{t('nav.colleges')}</Link>
          </div>
          <p className="text-sm text-text-muted">
            {t('footer.copyright')} {new Date().getFullYear()} {t('common.brand')}
          </p>
        </div>
      </footer>

    </main>
  );
}
