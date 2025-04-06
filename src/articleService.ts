import { supabase } from "../src/supabaseClient";

// Function to insert a new article
export async function createArticle(title: string, content: string) {
    const { data: userData, error: authError } = await supabase.auth.getUser();

    if (authError || !userData.user || !userData.user.id) {
        console.error("User not authenticated");
        return;
    }

    const { data, error } = await supabase
        .from("articles")
        .insert([{ title, content, author_id: userData.user.id }]);

    if (error) {
        console.error("Insert error:", error);
        return null;
    }

    console.log("Article inserted:", data);
    return data;
}
