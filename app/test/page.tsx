import { supabase } from "@/lib/supabaseClient";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("students")
    .select("id,name,grade,status,created_at")
    .limit(5);

  return (
    <div style={{ padding: 24 }}>
      <h1>/test</h1>
      {error ? (
        <pre>{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}







