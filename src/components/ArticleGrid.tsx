import { Link } from "react-router-dom";
import type { Article } from "../types";

interface ArticleGridProps {
  articles?: Article[]; // Make it optional to avoid crashes
  columns?: number;
}

export default function ArticleGrid({ articles = [] }: ArticleGridProps) {
  console.log("Articles received:", articles);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 px-4">
      {articles.length > 0 ? (
        articles.map((article) => (
          <Link key={article.id} to={`/article/${article.id}`} className="group">
            <div className="relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/50 to-transparent">
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-gray-300 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-300 mb-2">{article.date}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{article.excerpt}</p>
              </div>
            </div>
          </Link>
        ))
      ) : (
        <p className="text-gray-500 text-center col-span-full">No articles available.</p>
      )}
    </div>
  );
}
