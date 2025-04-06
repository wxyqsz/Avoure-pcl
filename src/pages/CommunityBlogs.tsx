import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Blog {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

export default function CommunityBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      const { data, error } = await supabase
        .from("community_blogs")
        .select("id, title, content, author, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching blogs:", error);
      } else {
        setBlogs(data || []);
      }
      setLoading(false);
    };

    fetchBlogs();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-playfair font-bold mb-8 text-center">
        Community Blogs
      </h1>
      {loading ? (
        <p className="text-center">Loading...</p>
      ) : blogs.length === 0 ? (
        <p className="text-center">No community blogs yet. Be the first to submit!</p>
      ) : (
        <div className="space-y-8">
          {blogs.map((blog) => (
            <div key={blog.id} className="border p-6 rounded-2xl shadow-md hover:shadow-lg transition">
              <h2 className="text-2xl font-semibold font-playfair mb-2">
                {blog.title}
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                By {blog.author} on {new Date(blog.created_at).toLocaleDateString()}
              </p>
              <p className="text-base text-gray-800">
                {blog.content.length > 300 ? blog.content.slice(0, 300) + "..." : blog.content}
              </p>
              <Link to={`/community/${blog.id}`} className="text-blue-500 hover:underline mt-4 inline-block">
                Read More
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
