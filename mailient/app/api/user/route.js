// app/api/user/route.js
export async function GET(request) {
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
  
    const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  
    if (!res.ok) {
      return Response.json({ error: "profile fetch failed", status: res.status });
    }
  
    const profile = await res.json();
    return Response.json(profile);
  }
  

