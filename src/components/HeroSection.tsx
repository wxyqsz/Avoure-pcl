import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <div className="relative bg-gray-900 text-white">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&q=80"
        alt="Vogue Vista Hero"
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      />

      {/* Overlay Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl font-serif font-bold mb-6">
          Discover the Latest in Fashion & Beauty
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-6">
          Stay ahead with trends, style inspiration, and expert insights from
          Vogue Vista.
        </p>
        <Link
          to="/blogs"
          className="bg-white text-gray-900 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-200 transition"
        >
          Explore Articles
        </Link>
      </div>
    </div>
  );
}
