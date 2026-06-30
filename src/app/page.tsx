"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAnimatedCounter } from "@/lib/useAnimatedCounter";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft, Video, BookOpen, Users,
  Brain, Target, Sparkles, BarChart3, Star, Shield, Zap, Play,
  CheckCircle, Quote, Award, Phone, Mail, MapPin,
} from "lucide-react";

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

function getEmbedUrl(url: string): string | null {
  const youtubeId = extractYoutubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return url;
  return null;
}

function AnimatedStat({ icon: Icon, label, value, suffix }: {
  icon: React.ElementType; label: string; value: number; suffix: string;
}) {
  const { count, ref } = useAnimatedCounter(value);
  return (
    <div className="flex flex-col items-center gap-2 group" ref={ref}>
      <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl sm:text-3xl font-bold text-white">
        {count}{suffix}
      </span>
      <span className="text-sm text-white/70">{label}</span>
    </div>
  );
}

function UserPlus(props: React.SVGProps<SVGSVGElement>) { return <Users {...props} />; }

export default function Home() {
  const { t } = useLanguage();
  const [homeVideo, setHomeVideo] = useState<string | null>(null);
  const [homeHero, setHomeHero] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ videoUrl?: string }>("/api/site-content?section=home-video")
      .then((res) => {
        if (res.success && res.data?.videoUrl) setHomeVideo(res.data.videoUrl);
      })
      .catch(() => {});
    apiFetch<{ imageUrl?: string }>("/api/site-content?section=home-hero")
      .then((res) => {
        if (res.success && res.data?.imageUrl) setHomeHero(res.data.imageUrl);
      })
      .catch(() => {});
  }, []);

  const testimonials = [
    {
      name: t('testimonials.1.name'),
      role: t('testimonials.1.role'),
      avatar: "S",
      content: t('testimonials.1.text'),
      rating: 5,
    },
    {
      name: t('testimonials.2.name'),
      role: t('testimonials.2.role'),
      avatar: "M",
      content: t('testimonials.2.text'),
      rating: 5,
    },
    {
      name: t('testimonials.3.name'),
      role: t('testimonials.3.role'),
      avatar: "N",
      content: t('testimonials.3.text'),
      rating: 5,
    },
  ];

  const steps = [
    { icon: UserPlus, title: t('how.step1.title'), desc: t('how.step1.desc') },
    { icon: BookOpen, title: t('how.step2.title'), desc: t('how.step2.desc') },
    { icon: Play, title: t('how.step3.title'), desc: t('how.step3.desc') },
    { icon: Brain, title: t('how.step4.title'), desc: t('how.step4.desc') },
  ];

  return (
    <main className="flex-1 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-secondary">
        {/* Animated path background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg
            className="absolute w-full h-full opacity-10"
            viewBox="0 0 1440 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 400 C 200 200, 400 600, 600 400 S 800 200, 1000 400 S 1200 600, 1440 400"
              stroke="white"
              strokeWidth="2"
              className="animate-draw"
            />
            <path
              d="M0 600 C 300 400, 500 800, 700 600 S 900 400, 1100 600 S 1300 800, 1440 600"
              stroke="white"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle cx="200" cy="400" r="4" fill="white" />
            <circle cx="600" cy="400" r="4" fill="white" />
            <circle cx="1000" cy="400" r="4" fill="white" />
            <circle cx="1400" cy="400" r="4" fill="white" />
            <path
              d="M1440 200 C 1200 50, 1000 350, 800 200 S 600 50, 400 200 S 200 350, 0 200"
              stroke="white"
              strokeWidth="1"
              opacity="0.3"
            />
          </svg>
          <div className="absolute top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-right stagger-children">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium mb-6 border border-white/20">
                <Sparkles className="w-4 h-4" />
                {t('landing.badge')}
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 text-white">
                {t('landing.hero.title1')}
                <br />
                <span className="text-white/90">{t('landing.hero.title2')}</span>
              </h1>

              <p className="text-lg text-white/80 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                {t('landing.hero.desc')}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-warning to-accent text-white hover:from-warning/90 hover:to-accent/90 shadow-2xl shadow-warning/30 flex items-center gap-2 px-8"
                  >
                    {t('landing.hero.cta')}
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/colleges">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 flex items-center gap-2 backdrop-blur-sm"
                  >
                    <Play className="w-5 h-5" />
                    {t('landing.hero.browse')}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10">
                <div className="flex -space-x-2">
                  {["S", "M", "N", "A"].map((l, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white bg-primary flex items-center justify-center text-white text-sm font-bold"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-white/70">{t('landing.hero.join')}</p>
                </div>
              </div>
            </div>

            {/* Right: Illustration / Hero Image */}
            <div className="hidden lg:flex items-center justify-center relative">
              {homeHero ? (
                <div className="relative w-full max-w-lg">
                  <Image
                    src={homeHero}
                    alt="hero"
                    width={600}
                    height={450}
                    className="w-full h-auto rounded-3xl shadow-2xl"
                  />
                  <div className="absolute -bottom-4 -left-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-warning" />
                      <div>
                        <p className="text-white text-sm font-bold">{t('landing.trust_progress')}</p>
                        <p className="text-white/60 text-xs">{t('landing.trust_percent')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-lg">
                  <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 rounded-full bg-danger" />
                      <div className="w-3 h-3 rounded-full bg-warning" />
                      <div className="w-3 h-3 rounded-full bg-teal" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-white/20 rounded-full w-3/4" />
                      <div className="h-4 bg-white/20 rounded-full w-1/2" />
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className="h-20 bg-white/10 rounded-xl border border-white/10 p-3">
                            <div className="h-2 bg-white/20 rounded-full w-1/2 mb-2" />
                            <div className="h-2 bg-white/20 rounded-full w-3/4" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Floating badge */}
                  <div className="absolute -bottom-4 -left-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-warning" />
                      <div>
                        <p className="text-white text-sm font-bold">{t('landing.trust_progress')}</p>
                        <p className="text-white/60 text-xs">{t('landing.trust_percent')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-10 border-t border-white/10">
            <AnimatedStat icon={Video} label={t('landing.stat.video')} value={200} suffix={t('landing.stat.video_val')} />
            <AnimatedStat icon={BookOpen} label={t('landing.stat.quiz')} value={1000} suffix={t('landing.stat.quiz_val')} />
            <AnimatedStat icon={Users} label={t('landing.stat.students')} value={5000} suffix={t('landing.stat.students_val')} />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 sm:py-20 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Target className="w-4 h-4" />
              {t('how.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {t('how.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto">
              {t('how.subtitle')}
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="relative flex flex-col items-center text-center group">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">{step.title}</h3>
                    <p className="text-sm text-text-secondary max-w-xs">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4 border border-secondary/20">
              <Sparkles className="w-4 h-4" />
              {t('features.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {t('features.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: t('features.smart'), desc: t('features.smart_desc'), color: "from-primary to-primary-dark" },
              { icon: Target, title: t('features.quiz'), desc: t('features.quiz_desc'), color: "from-secondary to-teal" },
              { icon: BarChart3, title: t('features.analytics'), desc: t('features.analytics_desc'), color: "from-warning to-accent" },
              { icon: Video, title: t('features.video'), desc: t('features.video_desc'), color: "from-danger to-accent" },
              { icon: Shield, title: t('features.trusted'), desc: t('features.trusted_desc'), color: "from-primary to-secondary" },
              { icon: Zap, title: t('features.fast'), desc: t('features.fast_desc'), color: "from-teal to-primary" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="group relative bg-surface border border-border rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${f.color} w-fit mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Video Intro Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 border-y border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
                <Play className="w-4 h-4" />
                {t('video.badge')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mb-4">
                {t('video.title')}
              </h2>
              <p className="text-text-secondary mb-6 leading-relaxed">
                {t('video.desc')}
              </p>
              <div className="space-y-3">
                {[
                  t('video.point1'),
                  t('video.point2'),
                  t('video.point3'),
                  t('video.point4'),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Video embed */}
            <div className="relative group">
              {homeVideo ? (() => {
                const embedUrl = getEmbedUrl(homeVideo);
                return embedUrl ? (
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 border border-border aspect-video shadow-xl">
                    <iframe
                      src={embedUrl}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a href={homeVideo} target="_blank" rel="noopener noreferrer" className="block relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 border border-border aspect-video flex items-center justify-center shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                    <div className="relative text-center">
                      <div className="w-20 h-20 mx-auto rounded-full bg-white/90 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                        <Play className="w-8 h-8 text-primary mr-0.5" />
                      </div>
                      <p className="text-text-secondary mt-4 text-sm font-medium">{t('video.play')}</p>
                    </div>
                  </a>
                );
              })() : (
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 border border-border aspect-video flex items-center justify-center shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                  <div className="relative text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-white/90 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                      <Play className="w-8 h-8 text-primary mr-0.5" />
                    </div>
                    <p className="text-text-secondary mt-4 text-sm font-medium">{t('video.play')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium mb-4 border border-warning/20">
              <Quote className="w-4 h-4" />
              {t('testimonials.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
              {t('testimonials.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-2xl p-6 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  {testimonial.content}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">{testimonial.name}</p>
                    <p className="text-xs text-text-muted">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary via-primary-dark to-secondary relative overflow-hidden">
        <div className="absolute inset-0">
          <svg className="absolute w-full h-full opacity-5" viewBox="0 0 1440 400" fill="none">
            <path d="M0 200 C 300 0, 600 400, 900 200 S 1200 0, 1440 200" stroke="white" strokeWidth="2" />
            <path d="M0 300 C 300 100, 600 500, 900 300 S 1200 100, 1440 300" stroke="white" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
            {t('cta.desc')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/auth/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-warning to-accent text-white hover:from-warning/90 hover:to-accent/90 shadow-2xl shadow-warning/30 flex items-center gap-2"
                  >
                    {t('cta.button')}
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
            <Link href="/colleges">
              <Button
                variant="secondary"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 backdrop-blur-sm"
              >
                {t('cta.browse')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-12 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.svg" alt="UNIQUE" width={28} height={28} className="shrink-0" />
                <span className="text-lg font-bold gradient-text">{t('common.brand')}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {t('footer.description')}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-text-primary mb-4">{t('footer.links')}</h4>
              <div className="space-y-2 text-sm text-text-secondary">
                <Link href="/colleges" className="block hover:text-primary transition-colors">{t('nav.colleges')}</Link>
                <Link href="/about" className="block hover:text-primary transition-colors">{t('nav.about')}</Link>
                <Link href="/contact" className="block hover:text-primary transition-colors">{t('nav.contact')}</Link>
                <Link href="/auth/register" className="block hover:text-primary transition-colors">{t('nav.register')}</Link>
                <Link href="/auth/login" className="block hover:text-primary transition-colors">{t('nav.login')}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-text-primary mb-4">{t('footer.specializations')}</h4>
              <div className="space-y-2 text-sm text-text-secondary">
                <span className="block">{t('footer.med')}</span>
                <span className="block">{t('footer.eng')}</span>
                <span className="block">{t('footer.pharm')}</span>
                <span className="block">{t('footer.it')}</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-text-primary mb-4">{t('footer.contact')}</h4>
              <div className="space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  info@unique.edu
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  +966 123 456 789
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t('footer.address')}
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border/20 text-center text-sm text-text-muted">
            © {new Date().getFullYear()} UNIQUE — {t('footer.copyright')}
          </div>
        </div>
      </footer>

    </main>
  );
}
