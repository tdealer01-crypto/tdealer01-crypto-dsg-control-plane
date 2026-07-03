'use client';

import React, { useState } from 'react';
import { ArrowRight, Sparkles, Brain, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';

interface NewsArticle {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  image: string;
  readTime: number;
  date: string;
  featured?: boolean;
  gradient: 'blue-to-navy' | 'purple-to-navy' | 'cyan-to-blue';
}

const newsData: NewsArticle[] = [
  {
    id: 'featured-1',
    category: 'Breakthroughs',
    title: 'Multimodal AI Models Reach New Reasoning Capabilities',
    subtitle: 'Latest models demonstrate 95% accuracy on complex reasoning benchmarks',
    image: 'https://images.unsplash.com/photo-1677442d019cecf48d4802a321e3e8a6?w=1200&h=600&fit=crop',
    readTime: 8,
    date: '2 hours ago',
    featured: true,
    gradient: 'blue-to-navy',
  },
  {
    id: '1',
    category: 'Research',
    title: 'Graph Neural Networks Transform Drug Discovery',
    subtitle: 'New computational approach accelerates molecular identification',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    readTime: 6,
    date: '4 hours ago',
    gradient: 'purple-to-navy',
  },
  {
    id: '2',
    category: 'Trends',
    title: 'Enterprise AI Adoption Accelerates in 2026',
    subtitle: '78% of Fortune 500 now implement AI solutions',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
    readTime: 5,
    date: '6 hours ago',
    gradient: 'cyan-to-blue',
  },
  {
    id: '3',
    category: 'Research',
    title: 'Self-Supervised Learning Reduces Training Data by 60%',
    subtitle: 'Breakthrough enables efficient AI model development',
    image: 'https://images.unsplash.com/photo-1526374965328-7f5ae4e8e598?w=600&h=400&fit=crop',
    readTime: 7,
    date: '8 hours ago',
    gradient: 'blue-to-navy',
  },
  {
    id: '4',
    category: 'Breakthroughs',
    title: 'Quantum AI Hybrid Systems Show Promise',
    subtitle: 'Combining quantum and classical computing for optimization',
    image: 'https://images.unsplash.com/photo-1639762681033-6461854d8c73?w=600&h=400&fit=crop',
    readTime: 9,
    date: '10 hours ago',
    gradient: 'purple-to-navy',
  },
];

const categories = ['All', 'Breakthroughs', 'Research', 'Trends', 'Applications', 'Ethics'];

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const featuredArticle = newsData.find((a) => a.featured);
  const filteredArticles = activeCategory === 'All'
    ? newsData.filter((a) => !a.featured)
    : newsData.filter((a) => a.category === activeCategory && !a.featured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[--color-surface-primary] via-[#0D1117] to-[--color-surface-primary]">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[--color-surface-secondary] bg-[--color-surface-primary]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-[--space-4] py-[--space-6] sm:px-[--space-6] lg:px-[--space-8]">
          <div className="flex items-center gap-[--space-3] mb-[--space-6]">
            <Sparkles className="h-8 w-8 text-[--color-gold]" />
            <h1 className="text-[--text-lg] font-bold text-[--color-text-primary]">AI News Hub</h1>
          </div>

          {/* Category Pills */}
          <div className="flex gap-[--space-2] overflow-x-auto pb-[--space-2] scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-[--space-4] py-[--space-2] rounded-full text-[--text-sm] font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-[--color-gold] text-[--color-surface-primary] shadow-lg shadow-[--color-gold]/50'
                    : 'bg-[--color-surface-secondary] text-[--color-text-secondary] hover:bg-[--color-surface-tertiary]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-[--space-4] py-[--space-8] sm:px-[--space-6] lg:px-[--space-8]">
        {/* Featured Card */}
        {featuredArticle && (
          <div className="mb-[--space-12]">
            <div className="relative overflow-hidden rounded-[--radius-2xl] group">
              {/* Banner Image */}
              <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000] via-transparent to-transparent" />
              </div>

              {/* Content Overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-blue-900/60 to-slate-900/80 flex flex-col justify-end p-[--space-6] sm:p-[--space-8]"
              >
                <div className="flex items-center gap-[--space-2] mb-[--space-3]">
                  <Badge variant="info">{featuredArticle.category}</Badge>
                  <span className="text-[--text-xs] text-[--color-text-tertiary]">{featuredArticle.date}</span>
                </div>

                <h2 className="text-[--text-2xl] sm:text-[--text-3xl] font-bold text-white mb-[--space-3] leading-tight">
                  {featuredArticle.title}
                </h2>

                <p className="text-[--text-sm] sm:text-[--text-base] text-gray-200 mb-[--space-6] max-w-2xl line-clamp-2">
                  {featuredArticle.subtitle}
                </p>

                <div className="flex items-center gap-[--space-4]">
                  <Button variant="primary" className="gap-2">
                    Read Article <ArrowRight className="h-4 w-4" />
                  </Button>
                  <span className="text-[--text-xs] text-gray-300">
                    {featuredArticle.readTime} min read
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        <div>
          <h2 className="text-[--text-xl] font-bold text-[--color-text-primary] mb-[--space-6]">
            {activeCategory === 'All' ? 'Latest News' : activeCategory}
          </h2>

          <div className="grid gap-[--space-6] sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="group cursor-pointer h-full transition-all duration-300 hover:scale-105"
              >
                {/* Card with Gradient Background */}
                <div
                  className={`relative h-full rounded-[--radius-xl] overflow-hidden p-[--space-4] flex flex-col
                    ${article.gradient === 'blue-to-navy'
                      ? 'bg-gradient-to-br from-blue-600/20 via-blue-800/20 to-slate-900/40'
                      : article.gradient === 'purple-to-navy'
                        ? 'bg-gradient-to-br from-purple-600/20 via-purple-800/20 to-slate-900/40'
                        : 'bg-gradient-to-br from-cyan-600/20 via-blue-800/20 to-slate-900/40'
                    } border border-white/10 hover:border-white/20 transition-colors`}
                >
                  {/* Background Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Image */}
                    <div className="relative h-40 mb-[--space-4] rounded-[--radius-lg] overflow-hidden -m-[--space-4] mb-[--space-4] px-[--space-4] pt-[--space-4]">
                      <img
                        src={article.image}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-[--radius-lg] group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    {/* Badge & Meta */}
                    <div className="flex items-center justify-between mb-[--space-3]">
                      <Badge
                        variant={
                          article.category === 'Breakthroughs'
                            ? 'success'
                            : article.category === 'Research'
                              ? 'info'
                              : 'warning'
                        }
                      >
                        {article.category}
                      </Badge>
                      <span className="text-[--text-xs] text-gray-400">{article.date}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[--text-base] font-bold text-white mb-[--space-2] line-clamp-2 flex-grow">
                      {article.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-[--text-sm] text-gray-300 mb-[--space-4] line-clamp-2">
                      {article.subtitle}
                    </p>

                    {/* Read Time */}
                    <div className="flex items-center gap-[--space-2] text-[--text-xs] text-gray-400 mt-auto">
                      <span>📖</span>
                      <span>{article.readTime} min read</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-[--space-12]">
              <Brain className="h-12 w-12 text-gray-600 mx-auto mb-[--space-4]" />
              <p className="text-[--color-text-secondary] text-[--text-base]">
                No articles in this category yet
              </p>
            </div>
          )}
        </div>

        {/* Subscribe CTA */}
        <div className="mt-[--space-12] rounded-[--radius-2xl] bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-900/30 border border-blue-400/20 p-[--space-8] text-center">
          <h3 className="text-[--text-xl] font-bold text-white mb-[--space-2]">
            Stay Updated with Latest AI News
          </h3>
          <p className="text-[--color-text-secondary] mb-[--space-6] max-w-md mx-auto">
            Get daily digests of breakthrough research and industry trends delivered to your inbox
          </p>
          <Button variant="primary" size="lg">
            <Zap className="h-4 w-4" />
            Subscribe Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[--color-surface-secondary] mt-[--space-12] py-[--space-8] text-center text-[--color-text-tertiary] text-[--text-sm]">
        <p>© 2026 AI News Hub. Powered by DSG Control Plane.</p>
      </footer>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
