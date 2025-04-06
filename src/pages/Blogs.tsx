import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ArticleGrid from '../components/ArticleGrid';
import type { Article } from '../types';

export default function Blogs() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('articles')
          .select(`
            id,
            title,
            excerpt,
            category,
            image,
            created_at,
            users (
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error("Supabase error:", fetchError);
          setError('Failed to load blog posts');
          setLoading(false);
          return;
        }

        const allowedCategories = ["fashion", "beauty", "lifestyle"] as const;

        const formattedArticles = data.map(article => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          category: allowedCategories.includes(article.category)
            ? (article.category as "fashion" | "beauty" | "lifestyle")
            : "fashion",
          image: article.image,
          date: new Date(article.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          author: article.users?.[0]?.name || 'Anonymous'
        }));

        setArticles(formattedArticles);
      } catch (err) {
        setError('Failed to load blog posts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">Loading blogs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-serif mb-8">Community Blogs</h1>
        <ArticleGrid articles={articles} columns={3} />
      </div>
    </div>
  );
}
