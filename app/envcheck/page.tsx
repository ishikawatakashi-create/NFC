export default function EnvCheckPage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
    return (
      <div style={{ padding: 24 }}>
        <h1>ENV Check</h1>
        <p>URL: {url ? url : "undefined"}</p>
        <p>KEY(prefix): {key ? key.slice(0, 20) + "..." : "undefined"}</p>
        <p>判定: {url && key ? "OK（env読めてる）" : "NG（env読めてない）"}</p>
      </div>
    );
  }
  