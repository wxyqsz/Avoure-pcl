import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Article } from '../types';

function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      setIsLoading(true);
      try {
        // Fetch the article
        const { data: articleData, error: articleError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', id)
          .single();

        if (articleError) throw articleError;

        if (!articleData) {
          throw new Error('Article not found');
        }

        setArticle(articleData);

        // Update view count
        await supabase
          .from('articles')
          .update({ views: (articleData.views || 0) + 1 })
          .eq('id', id);

        // Fetch related articles (same category)
        const { data: relatedData, error: relatedError } = await supabase
          .from('articles')
          .select('*')
          .eq('category', articleData.category)
          .neq('id', id)
          .limit(3);

        if (relatedError) throw relatedError;
        setRelatedArticles(relatedData || []);

      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const handleLike = async () => {
    if (!article) return;
    
    try {
      const newLikeCount = (article.likes || 0) + 1;
      await supabase
        .from('articles')
        .update({ likes: newLikeCount })
        .eq('id', article.id);
        
      setArticle({...article, likes: newLikeCount});
    } catch (error) {
      console.error('Error liking article:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-light italic mb-2">Loading article...</h2>
          <div className="w-24 h-1 bg-black mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-light italic mb-2">Oops!</h2>
          <div className="w-16 h-0.5 bg-black mx-auto my-4"></div>
          <p className="text-red-600 font-light">{error || 'Article not found'}</p>
          <Link to="/" className="text-black border-b border-black pb-1 mt-8 inline-block hover:text-gray-600 transition-colors duration-300">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 bg-white">
      {/* Article Header */}
      <div className="mb-16 text-center">
        <div className="flex items-center justify-center text-xs tracking-widest text-gray-500 mb-6">
          <Link to={`/${article.category}`} className="uppercase hover:text-black transition-colors duration-200">
            {article.category}
          </Link>
          {article.gender && (
            <>
              <span className="mx-3">•</span>
              <Link to={`/fashion/${article.gender}`} className="uppercase hover:text-black transition-colors duration-200">
                {article.gender}
              </Link>
            </>
          )}
        </div>
        <h1 className="text-5xl font-serif font-light mb-6 leading-tight max-w-3xl mx-auto mt-32">{article.title}</h1>
        <div className="w-16 h-0.5 bg-black mx-auto my-8"></div>
        <p className="text-xl text-gray-700 font-light italic max-w-2xl mx-auto mb-8">{article.excerpt}</p>
        <div className="flex items-center justify-center text-sm font-light">
          <span className="uppercase tracking-wider">By {article.author}</span>
          <span className="mx-3">•</span>
          <span className="text-gray-500">
            {new Date(article.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Featured Image */}
      <div className="mb-16">
        <img 
          src={article.image} 
          alt={article.title} 
          className="w-full h-auto"
        />
        <div className="flex justify-end">
          <p className="text-xs text-gray-500 mt-2 font-light italic">Photography: {article.photographer || 'Editorial'}</p>
        </div>
      </div>

      {/* Article Content */}
      <div className="prose max-w-3xl mx-auto mb-16 font-light text-lg leading-relaxed">
        {article.content?.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-6">{paragraph}</p>
        ))}
      </div>

      {/* Article Actions */}
      <div className="border-t border-b border-gray-200 py-8 my-16 flex justify-between items-center max-w-3xl mx-auto">
        <div className="flex items-center space-x-8">
          <button onClick={handleLike} className="flex items-center space-x-2 group">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm font-light">{article.likes || 0}</span>
          </button>
          <div className="flex items-center space-x-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-light">{article.views || 0}</span>
          </div>
        </div>
        <div>
          <Link 
            to={`/${article.category}`}
            className="px-6 py-2 border border-black text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
          >
            More {article.category}
          </Link>
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-24">
          <h3 className="text-2xl font-serif font-light text-center mb-12">You May Also Like</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.map((related) => (
              <Link to={`/article/${related.id}`} key={related.id} className="group">
                <div className="overflow-hidden">
                  <div className="h-80 overflow-hidden mb-4">
                    <img 
                      src={related.image} 
                      alt={related.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="px-2">
                    <h4 className="font-serif text-lg mb-2">{related.title}</h4>
                    <p className="text-sm text-gray-600 font-light line-clamp-2">{related.excerpt}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticlePage;