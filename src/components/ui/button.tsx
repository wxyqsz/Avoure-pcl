import React from "react";

export function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800">
      {children}
    </button>
  );
}
