import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAdminAuth } from "../auth/authUtils"; // Adjust the path

const AdminDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const isAdmin = await checkAdminAuth();
        console.log("Admin status:", isAdmin); // Debug
        
        if (!isAdmin) {
          navigate("/signin");
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error verifying admin:", error);
        navigate("/signin");
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAdmin();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-2xl mb-4">Loading Admin Dashboard...</h2>
          <div className="animate-pulse bg-gray-300 h-4 w-32 mx-auto rounded"></div>
        </div>
      </div>
    );
  }

  if (isAdmin === null || isAdmin === false) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto p-8 bg-white shadow-lg rounded-lg mt-8 mb-8">
      <h2 className="text-3xl font-light mb-6 border-b pb-4">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-100">
          <h3 className="text-xl font-medium mb-3">Content Management</h3>
          <p className="text-gray-600 mb-4">Manage your articles and blog posts</p>
          <button 
            onClick={() => navigate("/admin-upload")} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Manage Content
          </button>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-100">
          <h3 className="text-xl font-medium mb-3">User Management</h3>
          <p className="text-gray-600 mb-4">Manage user accounts and permissions</p>
          <button 
            onClick={() => navigate("/admin/user-blogs")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Manage Users
          </button>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg shadow border border-purple-100">
          <h3 className="text-xl font-medium mb-3">Analytics</h3>
          <p className="text-gray-600 mb-4">View site traffic and engagement metrics</p>
          <button 
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            View Analytics
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-xl font-medium mb-3">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Article Published</td>
                <td className="px-4 py-2">Admin</td>
                <td className="px-4 py-2">Today</td>
                <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Completed</span></td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">User Signup</td>
                <td className="px-4 py-2">customer@example.com</td>
                <td className="px-4 py-2">Yesterday</td>
                <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">New</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;